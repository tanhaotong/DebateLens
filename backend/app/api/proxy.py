from flask import Blueprint, request, Response
import requests as pyrequests

proxy_bp = Blueprint('proxy', __name__)

@proxy_bp.route('/api/proxy_image')
def proxy_image():
    url = request.args.get('url')
    if not url:
        return "Missing url", 400
    r = pyrequests.get(url, headers={"Referer": ""})
    if r.status_code == 200:
        return Response(r.content, content_type=r.headers.get("Content-Type", "image/jpeg"))
    else:
        return "Failed to fetch image", r.status_code












