import base64
import json
import time
import requests
from utils.ops import read_wav_bytes

URL = "http://127.0.0.1:20001/all"

wav_bytes, sample_rate, channels, sample_width = read_wav_bytes("assets/A11_0.wav")
datas = {
    "channels": channels,
    "sample_rate": sample_rate,
    "byte_width": sample_width,
    "samples": str(base64.urlsafe_b64encode(wav_bytes), encoding="utf-8"),
}
headers = {"Content-Type": "application/json"}

t0 = time.time()
r = requests.post(URL, headers=headers, data=json.dumps(datas))
t1 = time.time()
r.encoding = "utf-8"

result = json.loads(r.text)
print(result)
print("time:", t1 - t0, "s")
