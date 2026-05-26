import requests, time

text = 'Trái Đất là hành tinh thứ ba tính từ Mặt Trời, đồng thời cũng là hành tinh lớn nhất trong các hành tinh đất đá của hệ Mặt Trời xét về bán kính, khối lượng và mật độ vật chất. Trái Đất còn được biết tên với các tên gọi hành tinh xanh, là nhà của hàng triệu loài sinh vật, trong đó có con người.'

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

print('--- ZALO ---')
start = time.time()
z_key = 'QiYuYBwz8EKfVlwJH3D3vndLxNZaPZzR'
zr = requests.post('https://api.zalo.ai/v1/tts/synthesize', headers={'apikey': z_key}, data={'input': text, 'encode_type': 1, 'speaker_id': 2})
zurl = zr.json().get('data', {}).get('url')
print('ZALO URL:', zurl)
if zurl:
    for i in range(20):
        if requests.get(zurl).status_code == 200:
            print('Zalo Done in', round(time.time() - start, 2), 's')
            break
        time.sleep(1)
