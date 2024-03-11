import os
import argparse
from pathlib import *
from moviepy.editor import VideoFileClip


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--interval", type=int, default=10)
    parser.add_argument("--input_file", type=str)
    parser.add_argument("--output_dir", type=str)
    return parser.parse_args()


def auto_clip_video(input_file, output_dir, interval):
    # 加载视频文件
    video_clip = VideoFileClip(input_file)
    cursor_time = 0
    cursor_index = 0

    # 获取视频的总时长（秒）
    total_duration = video_clip.duration
    filename, extension = os.path.splitext(input_file)

    while cursor_time < total_duration:
        print(total_duration, cursor_time)
        if total_duration < (cursor_time + interval):
            clip = video_clip.subclip(cursor_time, total_duration)
        else:
            clip = video_clip.subclip(cursor_time, cursor_time + interval)

        clip.write_videofile(
            os.path.join(output_dir, f"{cursor_index}{extension}"), codec="mpeg4"
        )
        cursor_time += interval
        cursor_index += 1

    print("auto_clip_video_finish")


# if __name__ == "__main__":
#     input_file = (
#         "D:\\电影\\万丨里归途.mp4"
#         # "C:\\Users\\Administrator\\Desktop\\PR素材\\检测手机.mp4"  # 输入视频文件路径
#     )
#     output_dir = os.path.join(os.path.dirname(__file__), "output")  # 输出文件路径
#     split_video(input_file, output_dir, interval=10)


args = parse_args()
auto_clip_video(
    input_file=args.input_file,
    output_dir=args.output_dir,
    interval=args.interval,
)
