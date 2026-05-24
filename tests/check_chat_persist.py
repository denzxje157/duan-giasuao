import time
import json
from fastapi.testclient import TestClient
import api.main as am

client = TestClient(am.app)

def run_check():
    test_user = 'test_user_for_persist'
    payload = {
        'question': 'Test persist chat history from automated test',
        'user_id': test_user,
        'session_id': None,
    }

    print('Posting to /chat (this will stream) ...')
    resp = client.post('/chat', json=payload)
    print('Status:', resp.status_code)

    full_text = ''
    try:
        for chunk in resp.iter_lines():
            if not chunk:
                continue
            try:
                line = chunk.decode() if isinstance(chunk, bytes) else str(chunk)
            except Exception:
                line = str(chunk)
            print('CHUNK:', line)
            # try to parse JSON payload
            if line.startswith('data: '):
                try:
                    payload = json.loads(line[6:])
                    text = payload.get('chunk')
                    if text:
                        # unescape \n
                        full_text += text.replace('\\n', '\n')
                except Exception:
                    pass
    except Exception as e:
        print('Error while streaming:', e)

    print('\nWaiting a moment for DB write to settle...')
    time.sleep(1)

    try:
        res = am.supabase.table('chat_history').select('*').eq('user_id', test_user).execute()
        print('DB select status, rows count:', len(res.data) if res.data else 0)
        print(json.dumps(res.data, ensure_ascii=False, indent=2))
    except Exception as e:
        print('Error querying Supabase:', e)

if __name__ == '__main__':
    run_check()
