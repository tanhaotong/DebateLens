import yt_dlp
import os
import glob

class BilibiliService:
    def __init__(self):
        self.ydl_opts = {
            # 'format': 'best[height<=720]',
            'outtmpl': 'temp/%(id)s/%(id)s.%(ext)s',
            'quiet': True,
            'no_warnings': True,
        }

    def get_video_info(self, bv_id: str) -> dict:
        url = f"https://www.bilibili.com/video/{bv_id}"
        with yt_dlp.YoutubeDL(self.ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            # print(info)
        return {
            'bvid': bv_id,
            'uploader': info.get('uploader'),
            'title': info.get('title'),
            'cover': info.get('thumbnail'),
            'duration': info.get('duration')
        }

    def download_video(self, bv_id: str, video_id: str) -> str:
        url = f"https://www.bilibili.com/video/{bv_id}"
        # 临时修改输出模板
        temp_opts = self.ydl_opts.copy()
        temp_opts['outtmpl'] = f'temp/{video_id}/video.%(ext)s'
        
        with yt_dlp.YoutubeDL(temp_opts) as ydl:
            info = ydl.extract_info(url, download=True)
        return f"temp/{video_id}/video.{info.get('ext')}"

    def cleanup_part_files(self, video_id: str):
        """清理下载失败的.part文件"""
        try:
            # 查找所有相关的.part文件
            part_files = glob.glob(f"temp/{video_id}*.part*")
            for part_file in part_files:
                try:
                    os.remove(part_file)
                    print(f"已删除失败的下载文件: {part_file}")
                except Exception as e:
                    print(f"删除文件失败 {part_file}: {str(e)}")
        except Exception as e:
            print(f"清理.part文件时出错: {str(e)}")

    def download_audio(self, bv_id: str, video_id: str) -> str:
        os.makedirs('temp', exist_ok=True)
        url = f"https://www.bilibili.com/video/{bv_id}"

        preferred_formats = ['m4a', 'aac', 'mp3']
        for fmt in preferred_formats:
            audio_opts = self.ydl_opts.copy()
            audio_opts.update({
                'format': f'bestaudio[ext={fmt}]/bestaudio/best',
                'outtmpl': f'temp/{video_id}/audio.{fmt}',
                'postprocessors': [{
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': fmt,
                    'preferredquality': '192',
                }],
                'quiet': True,
                'no_warnings': True,
            })
            try:
                with yt_dlp.YoutubeDL(audio_opts) as ydl:
                    info = ydl.extract_info(url, download=True)
                # 检查文件是否真的下载成功
                file_path = f"temp/{video_id}/audio.{fmt}"
                if os.path.exists(file_path) and os.path.getsize(file_path) > 0:
                    # 下载成功，清理可能存在的.part文件
                    self.cleanup_part_files(video_id)
                    return file_path
                else:
                    # 文件不存在或大小为0，清理.part文件
                    self.cleanup_part_files(video_id)
            except Exception as e:
                # 下载失败，清理.part文件
                self.cleanup_part_files(video_id)
                print(f"下载格式 {fmt} 失败: {str(e)}")
                continue
        
        # 如果所有格式都失败，最后清理一次
        self.cleanup_part_files(video_id)
        raise Exception("fail to download audio")
