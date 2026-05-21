from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
import requests
import os

pdf_path = os.path.join(os.getcwd(), 'test_upload.pdf')
# create a simple PDF
c = canvas.Canvas(pdf_path, pagesize=letter)
c.setFont('Helvetica', 12)
c.drawString(72, 720, 'GiaSuAo PDF Test')
c.drawString(72, 700, 'This is a test PDF for Markdown extraction.')
c.drawString(72, 680, 'Equation: E = mc^2')
c.save()

print('PDF created at', pdf_path)

url = 'http://127.0.0.1:8000/upload'
files = {'file': open(pdf_path, 'rb')}
data = {'grade': '10'}
try:
    resp = requests.post(url, files=files, data=data, timeout=600)
    print('Status code:', resp.status_code)
    try:
        print('Response JSON:', resp.json())
    except Exception:
        print('Response text:', resp.text)
except Exception as e:
    print('Request failed:', e)
