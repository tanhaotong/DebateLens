import requests

url = "http://127.0.0.1:5000/api/videos/search"
data = {"bv_id": "BV1Qw4m1Y7xp"}
response = requests.post(url, json=data)
print("Status code:", response.status_code)
print("Raw response:", response.text)
try:
    print("JSON:", response.json())
except Exception as e:
    print("JSON decode error:", e)

url="http://127.0.0.1:5000/api/videos/download"
data = {"bv_id": "BV1Qw4m1Y7xp"}
response = requests.post(url, json=data)
print("Status code:", response.status_code)
print("Raw response:", response.text)