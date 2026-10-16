import React, { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface MathRendererProps {
  content?: string | null;
  className?: string;
  as?: 'span' | 'div' | 'p' | 'h2' | 'h3';
  stripOptionPrefix?: boolean;
}

interface Segment {
  type: 'text' | 'inline-math' | 'block-math';
  value?: string;
  html?: string;
}

const MATH_REGEX = /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\$[^\$\n]+?\$|\\\([\s\S]*?\\\))/g;
const BARE_LATEX_REGEX = /\\(frac|sqrt|int|sum|prod|lim|infty|pm|times|div|leq|geq|neq|approx|alpha|beta|gamma|delta|pi|theta|sin|cos|tan|cot|log|ln|vec|hat|mathbb|mathbf|mathcal)\b/;

function parseSegments(raw: string, stripOptionPrefix: boolean): Segment[] {
  if (!raw) return [];
  let text = String(raw);

  if (stripOptionPrefix) {
    // Strip leading "A. ", "B. ", "C. ", "D. ", "A) ", etc.
    text = text.replace(/^[A-Da-d][.)]\s*/, '');
  }

  // If there are no delimiters ($ or \( or \[), but it looks like a bare math expression and no long prose
  if (!text.includes('$') && !text.includes('\\(') && !text.includes('\\[') && BARE_LATEX_REGEX.test(text) && !text.includes(' là ') && !text.includes(' của ')) {
    text = `$${text.trim()}$`;
  }
  MATH_REGEX.lastIndex = 0;

  const segments: Segment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = MATH_REGEX.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        value: text.substring(lastIndex, match.index)
      });
    }

    const token = match[0];
    let isBlock = false;
    let math = '';

    if (token.startsWith('$$') && token.endsWith('$$')) {
      isBlock = true;
      math = token.slice(2, -2);
    } else if (token.startsWith('\\[') && token.endsWith('\\]')) {
      isBlock = true;
      math = token.slice(2, -2);
    } else if (token.startsWith('\\(') && token.endsWith('\\)')) {
      isBlock = false;
      math = token.slice(2, -2);
    } else if (token.startsWith('$') && token.endsWith('$')) {
      isBlock = false;
      math = token.slice(1, -1);
    }

    try {
      const html = katex.renderToString(math.trim(), {
        displayMode: isBlock,
        throwOnError: false,
        strict: 'ignore'
      });
      segments.push({
        type: isBlock ? 'block-math' : 'inline-math',
        html
      });
    } catch {
      segments.push({
        type: 'text',
        value: token
      });
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    segments.push({
      type: 'text',
      value: text.substring(lastIndex)
    });
  }

  return segments;
}

export const MathRenderer: React.FC<MathRendererProps> = ({
  content,
  className = '',
  as: Component = 'span',
  stripOptionPrefix = false
}) => {
  const segments = useMemo(() => {
    if (!content) return [];
    return parseSegments(content, stripOptionPrefix);
  }, [content, stripOptionPrefix]);

  if (!content) return null;

  return (
    <Component className={className}>
      {segments.map((seg, idx) => {
        if (seg.type === 'text') {
          const lines = (seg.value || '').split('\n');
          return (
            <React.Fragment key={idx}>
              {lines.map((line, lineIdx) => (
                <React.Fragment key={lineIdx}>
                  {lineIdx > 0 && <br />}
                  {line}
                </React.Fragment>
              ))}
            </React.Fragment>
          );
        }

        return (
          <span
            key={idx}
            className={seg.type === 'block-math' ? 'my-2 block text-center overflow-x-auto py-1' : 'inline-block px-0.5 align-baseline'}
            dangerouslySetInnerHTML={{ __html: seg.html || '' }}
          />
        );
      })}
    </Component>
  );
};

export default MathRenderer;
