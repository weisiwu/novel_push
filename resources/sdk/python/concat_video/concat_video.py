import os
import cv2
import sys
import json
import glob
import argparse
from pathlib import *
from PIL import Image
import moviepy.editor as mp

def custom_sort(frame_img):
    name = Path(frame_img).name
    return name


# 创建一个类用于“吞噬”输出
class NullWriter(object):
    def write(self, s):
        pass


class CacheConfig:
    """
    图片处理过程，使用到的内部设置，如切割完的视频片段存放位置、关键帧存放位置等
    """
    def __init__(self) -> None:
        # 视频片段缓存
        self.video_parts_cahce_path = Path.cwd() / "video_parts_cahce"
        # 视频关键帧缓存
        self.video_frames_cahce_path = Path.cwd() / "video_frames_cahce"
        pass


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--image_path", type=str, default="")
    parser.add_argument("--durations", type=str, default="")
    parser.add_argument("--background_music_path", type=str, default="")
    parser.add_argument("--config_file", type=str, default="")
    return parser.parse_args()


def concat_imgs_to_video(image_path, background_music_path, durations):
    image_path = Path(image_path)
    images = os.listdir(image_path)
    imgs_num = len(images)
    img_size = None
    durations = str(durations).split(",")

    if not imgs_num:
        print(json.dumps({"code": 0, "type": "concat_video", "message": "no picture"}))
        sys.stdout.flush()
        return False

    for image in images:
        if not img_size:
            img_size = Image.open(image_path / image).size

    # 获取图片尺寸
    frame_rate = 30
    outputPath = Path(sd_config["outputPath"])
    tmpSavePath = outputPath / "tmp_save.mp4"
    outputFile = outputPath / sd_config["saveFileName"]
    videowrite = cv2.VideoWriter(
        tmpSavePath.as_posix(),
        cv2.VideoWriter_fourcc(*"mp4v"),
        frame_rate,
        img_size,
    )
    filtered_files = glob.glob(f"{image_path}/*")
    sort_imgs = sorted(filtered_files, key=custom_sort)

    for index, frame_img in enumerate(sort_imgs):
        duration_time = float(durations[index])
        img = cv2.resize(cv2.imread(frame_img), img_size)

        if img is None:
            continue

        total_num = int(frame_rate * duration_time)
        for cur_index in range(total_num):
            videowrite.write(img)

    videowrite.release()
    video_file = mp.VideoFileClip(tmpSavePath.as_posix()).without_audio()
    audio_file = mp.AudioFileClip(str(background_music_path))
    v_duration = video_file.duration
    a_duration = audio_file.duration
    if v_duration > a_duration:
        video_file = video_file.subclip(0, a_duration)
    else:
        audio_file = audio_file.subclip(0, v_duration)
    video_with_audio = video_file.set_audio(audio_file)

    # 将生成视频的输出重定向，防止输出
    sysout = sys.stdout
    sys.stdout = NullWriter()
    video_with_audio.write_videofile(
        outputFile.as_posix(), codec="libx264", audio_codec="aac"
    )
    sys.stdout = sysout

    video_file.close()
    audio_file.close()
    video_with_audio.close()
    # 删除临时文件
    os.remove(tmpSavePath)
    print(
        json.dumps(
            {
                "code": 1,
                "type": "concat_video",
                "message": "no picture",
                "outputFile": outputFile.as_posix(),
            }
        )
    )
    sys.stdout.flush()
    return True


args = parse_args()
with open(args.config_file, "r") as f:
    sd_config = json.load(f)
    sd_config["sdBaseUrl"] = sd_config["sdBaseUrl"].rstrip("/") or ""

concat_imgs_to_video(
    image_path=args.image_path,
    background_music_path=args.background_music_path,
    durations=args.durations,
)
