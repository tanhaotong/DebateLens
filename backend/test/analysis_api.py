import requests

url="http://127.0.0.1:5000/api/analysis/analyze_transcript_bubble/3bc762dd-cb16-4809-9fee-361dc911640c"
response=requests.get(url)
print(response.json())