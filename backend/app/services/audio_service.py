import os
import subprocess
import sys

class AudioService:
    def extract_audio(self, video_path: str, output_path: str) -> str:
        try:
            # 首先尝试使用 ffmpeg-python
            try:
                import ffmpeg
                stream = ffmpeg.input(video_path)
                stream = ffmpeg.output(
                    stream,
                    output_path,
                    acodec='pcm_s16le',  # 使用更兼容的编码
                    ac=1,
                    ar='16000',
                    loglevel='error'
                )
                ffmpeg.run(stream, overwrite_output=True)
                return output_path
            except ImportError:
                # 如果 ffmpeg-python 不可用，使用 subprocess 调用 ffmpeg
                self._extract_audio_with_subprocess(video_path, output_path)
                return output_path
        except Exception as e:
            raise Exception(f"音频提取失败: {str(e)}")
    
    def _extract_audio_with_subprocess(self, video_path: str, output_path: str):
        """使用 subprocess 调用 ffmpeg 命令"""
        try:
            cmd = [
                'ffmpeg',
                '-i', video_path,
                '-vn',  # 不包含视频
                '-acodec', 'pcm_s16le',  # 音频编码
                '-ac', '1',  # 单声道
                '-ar', '16000',  # 采样率
                '-y',  # 覆盖输出文件
                output_path
            ]
            
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                check=True
            )
            
            if not os.path.exists(output_path):
                raise Exception("音频文件未生成")
                
        except subprocess.CalledProcessError as e:
            raise Exception(f"FFmpeg 命令执行失败: {e.stderr}")
        except FileNotFoundError:
            raise Exception("FFmpeg 未安装或不在 PATH 中")

    def cleanup_temp_files(self, file_paths: list):
        for path in file_paths:
            if os.path.exists(path):
                os.remove(path)
