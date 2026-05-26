import requests, time

text = 'Câu chưa mở rộng: Gió thổi. Chủ ngữ: Gió. Vị ngữ: thổi. Câu đã được mở rộng: Những cơn gió heo may đầu mùa đang thổi nhè nhẹ qua kẽ lá.'

print('--- FPT ---')
start = time.time()
f_key = 'Fe55FqdswrC1wNAK01vaMctxh7wDHiaW'
fr = requests.post('https://api.fpt.ai/hmi/tts/v5', headers={'api-key': f_key, 'voice': 'banmai'}, data=text.encode('utf-8'))
furl = fr.json().get('async')
print('FPT URL:', furl)
if furl:
    for i in range(20):
        if requests.get(furl).status_code == 200:
            print('FPT Done in', round(time.time() - start, 2), 's')
            break
        time.sleep(1)
