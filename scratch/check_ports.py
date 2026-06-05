import socket

for port in [3000, 5173, 5174, 8000, 8080]:
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(1.0)
    try:
        s.connect(('127.0.0.1', port))
        print(f"Port {port} is OPEN")
    except socket.timeout:
        print(f"Port {port} connection TIMEOUT")
    except ConnectionRefusedError:
        print(f"Port {port} connection REFUSED")
    except Exception as e:
        print(f"Port {port} failed: {e}")
    finally:
        s.close()
