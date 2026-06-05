import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  app.post("/api/chat", async (req, res) => {
    try {
      // In a real app, you would retrieve the API key from a database or secure store if it's dynamic,
      // For now, we'll try to get it from request headers or process.env
      const apiKey = req.headers['x-api-key'] || process.env.GEMINI_API_KEY;
      
      if (!apiKey) {
        return res.status(401).json({ error: "API Key is missing" });
      }

      const { messages, systemContext } = req.body;

      if (!Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: "Messages array is required" });
      }

      const ai = new GoogleGenAI({ apiKey: apiKey as string });
      
      // Ensure messages are in correct format for SDK
      const formattedContents = messages.map((m: any) => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      }));

      // Set headers for Server-Sent Events (SSE)
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const responseStream = await ai.models.generateContentStream({
        model: "gemini-3.1-flash-preview",
        config: {
          systemInstruction: systemContext ? { parts: [{ text: systemContext }] } : undefined,
        },
        contents: formattedContents,
      });

      for await (const chunk of responseStream) {
        if (chunk.text) {
          // SSE format: data: JSON_STRING \n\n
          res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
        }
      }

      res.write('data: [DONE]\n\n');
      res.end();
    } catch (error: any) {
      console.error("Chat API error:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: error.message || "Internal server error" });
      } else {
        res.write(`data: ${JSON.stringify({ error: error.message || "Internal server error" })}\n\n`);
        res.end();
      }
    }
  });

  // Proxy all other /api/* requests to python backend at http://localhost:8000
  app.all("/api/*", async (req, res) => {
    const backendUrl = `http://localhost:8000${req.originalUrl}`;
    console.log(`[Express Proxy] Forwarding ${req.method} ${req.originalUrl} -> ${backendUrl}`);
    try {
      const headers: Record<string, string> = {};
      for (const [key, value] of Object.entries(req.headers)) {
        if (typeof value === 'string') {
          headers[key] = value;
        }
      }

      const options: any = {
        method: req.method,
        headers: headers,
      };

      if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
        options.body = JSON.stringify(req.body);
      }

      const response = await fetch(backendUrl, options);
      res.status(response.status);

      response.headers.forEach((value, key) => {
        res.setHeader(key, value);
      });

      if (response.body) {
        const reader = response.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
      }
      res.end();
    } catch (err: any) {
      console.error(`[Express Proxy] Failed to proxy request to ${backendUrl}:`, err);
      if (!res.headersSent) {
        res.status(502).json({ error: "Failed to connect to local backend API server. Make sure the Python backend is running on port 8000." });
      }
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
