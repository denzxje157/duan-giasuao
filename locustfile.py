import base64
from locust import HttpUser, task, between, events


class ChatUser(HttpUser):
    # Thoi gian cho giua cac request (tu 1 den 5 giay) de mo phong nguoi that
    wait_time = between(1, 5)

    @task
    def chat_simple(self):
        # Mau prompt don gian de test toc do stream
        payload = {
            "session_id": "stress_test_session",
            "question": "Chao ban, tich phan doi bien so la gi?",
            "grade": "12",
            "subject": "Toan"
        }
        self.client.post("/chat", json=payload)

    @task
    def chat_with_context(self):
        # Mau prompt phuc tap de test RAG va history compaction
        payload = {
            "session_id": "stress_test_session_rag",
            "question": "Duya vao tai lieu hom qua, hay cho tui biet ve chien dich Dien Bien Phu.",
            "grade": "12",
            "subject": "Lich su",
            # Gia lap lich su chat cu de test compaction logic
            "chat_history": [
                {"sender": "user", "text": "Chien tranh Dong Duong no ra khi nao?"},
                {"sender": "assistant", "text": "1946."},
            ]
        }
        self.client.post("/chat", json=payload)


# (Tuy chon) Them event handler de log loi
@events.request.add_listener
def my_request_handler(request_type, name, response_time, response_length, response,
                        context, exception, **kwargs):
    if exception:
        print(f"Request {name} failed: {exception}")
    elif response is not None and response.status_code != 200:
        print(f"Request {name} failed with status {response.status_code}")
