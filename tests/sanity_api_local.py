import json
import traceback
from fastapi.testclient import TestClient
import api.main as am

client = TestClient(am.app)

def check(path, method='get', data=None, files=None):
    try:
        if method == 'get':
            r = client.get(path)
        elif method == 'post':
            if files:
                r = client.post(path, files=files, data=data)
            else:
                r = client.post(path, json=data)
        else:
            return {'path': path, 'ok': False, 'error': 'unsupported method'}
        return {'path': path, 'status': r.status_code, 'body': r.text}
    except Exception as e:
        return {'path': path, 'ok': False, 'error': traceback.format_exc()}

def run_checks():
    paths = [('/', 'get'), ('/admin/configs', 'get'), ('/user/stats/test', 'get')]
    results = []
    for p, m in paths:
        results.append(check(p, method=m))

    # Try upload endpoint (simple fake pdf)
    files = {"file": ('test.pdf', b'%PDF-1.4 test', 'application/pdf')}
    results.append(check('/upload', method='post', files=files, data={'grade': '1'}))

    print(json.dumps(results, ensure_ascii=False, indent=2))

if __name__ == '__main__':
    run_checks()
