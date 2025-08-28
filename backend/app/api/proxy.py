from flask import Blueprint, request, Response, redirect
import requests as pyrequests
import logging

# 配置日志
logger = logging.getLogger(__name__)

proxy_bp = Blueprint('proxy', __name__)

@proxy_bp.route('/api/proxy_image')
def proxy_image():
    url = request.args.get('url')
    if not url:
        logger.error("Missing url parameter in proxy_image request")
        return "Missing url", 400
    
    logger.info(f"Proxying image request for URL: {url}")
    
    # 策略1：使用完整的浏览器请求头
    headers_strategy1 = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://www.bilibili.com/",
        "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive",
        "Sec-Fetch-Dest": "image",
        "Sec-Fetch-Mode": "no-cors",
        "Sec-Fetch-Site": "cross-site"
    }
    
    # 策略2：更简单的请求头，模拟移动端
    headers_strategy2 = {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1",
        "Referer": "https://m.bilibili.com/",
        "Accept": "image/*,*/*;q=0.8"
    }
    
    try:
        # 尝试策略1
        logger.info(f"Trying strategy 1 with headers: {headers_strategy1}")
        r = pyrequests.get(url, headers=headers_strategy1, timeout=10)
        logger.info(f"Strategy 1 response status: {r.status_code}, content length: {len(r.content)}")
        
        if r.status_code == 200:
            content_type = r.headers.get("Content-Type", "image/jpeg")
            logger.info(f"Successfully proxied image with strategy 1, content-type: {content_type}")
            return Response(r.content, content_type=content_type)
        
        # 如果策略1失败，尝试策略2
        logger.info(f"Strategy 1 failed, trying strategy 2")
        r = pyrequests.get(url, headers=headers_strategy2, timeout=10)
        logger.info(f"Strategy 2 response status: {r.status_code}, content length: {len(r.content)}")
        
        if r.status_code == 200:
            content_type = r.headers.get("Content-Type", "image/jpeg")
            logger.info(f"Successfully proxied image with strategy 2, content-type: {content_type}")
            return Response(r.content, content_type=content_type)
        
        # 如果两种策略都失败，记录详细错误信息
        logger.error(f"Both strategies failed. Strategy 1: {r.status_code}, Strategy 2: {r.status_code}")
        logger.error(f"Strategy 2 response text: {r.text[:200]}")
        
        # 如果是因为403 Forbidden，可能是B站的反爬虫机制，尝试重定向
        if r.status_code == 403:
            logger.warning(f"Received 403 Forbidden, this might be B站's anti-crawler mechanism")
            # 可以选择重定向到原URL，让浏览器直接访问
            return redirect(url, code=302)
        
        return f"Failed to fetch image: {r.status_code}", r.status_code
        
    except Exception as e:
        logger.error(f"Error fetching image from {url}: {str(e)}")
        return f"Error fetching image: {str(e)}", 500

@proxy_bp.route('/api/proxy_image/test')
def test_proxy_image():
    """测试图片代理功能"""
    test_url = "http://i0.hdslb.com/bfs/archive/b3a04fbb1c9fc39979cbe70407a815fe15313aa2.jpg"
    logger.info(f"Testing proxy with URL: {test_url}")
    
    try:
        # 使用策略1测试
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Referer": "https://www.bilibili.com/",
            "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8"
        }
        
        r = pyrequests.get(test_url, headers=headers, timeout=10)
        logger.info(f"Test response: status={r.status_code}, content_length={len(r.content)}")
        
        if r.status_code == 200:
            return {
                "success": True,
                "status": r.status_code,
                "content_length": len(r.content),
                "content_type": r.headers.get("Content-Type"),
                "message": "Test successful"
            }
        else:
            return {
                "success": False,
                "status": r.status_code,
                "error": f"HTTP {r.status_code}",
                "response_text": r.text[:200]
            }
            
    except Exception as e:
        logger.error(f"Test failed: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }












