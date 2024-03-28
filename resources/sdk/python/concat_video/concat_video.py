import os
import cv2
import sys
import json
import glob
import argparse
from pathlib import *
from PIL import Image
import moviepy.editor as mp
from moviepy.audio.AudioClip import AudioClip


def custom_sort(frame_img):
    name = Path(frame_img).name
    num = int(name.split("_")[0])
    return num


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
    parser.add_argument("--data", type=str, default="")
    parser.add_argument("--config_file", type=str, default="")
    return parser.parse_args()


def concat_imgs_to_video(raw_data, selected_imgs_str=""):
    data = json.loads(raw_data)

    if not len(data):
        print(json.dumps({"code": 0, "type": "concat_video", "message": "no picture"}))
        sys.stdout.flush()
        return False

    # 获取图片尺寸
    img_size = Image.open(data[0].get("image")).size
    print("图片尺寸是什么", img_size)
    frame_rate = 30
    return
    cache_config = CacheConfig()
    outputPath = Path(sd_config["outputPath"])
    tmpSavePath = outputPath / "tmp_save.mp4"
    outputFile = outputPath / sd_config["saveFileName"]
    # videowrite = cv2.VideoWriter(
    #     tmpSavePath.as_posix(),
    #     cv2.VideoWriter_fourcc(*"mp4v"),
    #     frame_rate,
    #     img_size,
    # )
    frame_img_path = cache_config.video_frames_cahce_path
    filtered_files = glob.glob(f"{frame_img_path}/*_new*")
    sort_imgs = sorted(filtered_files, key=custom_sort)

    for index, frame_img in enumerate(sort_imgs):
        next_index = index + 1 if index + 1 < imgs_num else None
        img = cv2.resize(cv2.imread(frame_img), img_size)
        next_img = (
            cv2.resize(cv2.imread(sort_imgs[next_index]), img_size)
            if next_index is not None
            else None
        )

        if img is None:
            continue

        img_duration = (custom_sort(frame_img) - prev_end) / frame_rate
        total_num = int(frame_rate * img_duration)
        transition_num = int(total_num * transition_duration_rate) or 1
        transition_start_index = int(total_num * (1 - transition_duration_rate))
        for cur_index in range(total_num):
            # 计算过渡效果的每一帧
            if next_img is not None and cur_index >= transition_start_index:
                # 计算过渡权重（0到1之间）
                alpha = (cur_index - transition_start_index) / transition_num
                # 使用alpha权重进行混合
                blended_img = cv2.addWeighted(img, 1 - alpha, next_img, alpha, 0)
                # 将混合后的图像写入视频文件
                videowrite.write(np.uint8(blended_img))
            else:
                videowrite.write(img)

        prev_end = custom_sort(frame_img)

    videowrite.release()
    video_file = mp.VideoFileClip(tmpSavePath.as_posix())
    v_duration = video_file.duration
    silent_audio_clip = AudioClip(lambda t: [0, 0], duration=v_duration, fps=44100)
    # 如果视频无音轨，则创建静音音轨
    audio_file = mp.VideoFileClip(str(input_path)).audio or silent_audio_clip
    a_duration = audio_file.duration
    if v_duration > a_duration:
        video_file = video_file.subclip(0, a_duration)
    else:
        audio_file = audio_file.subclip(0, v_duration)
    video_with_audio = video_file.set_audio(audio_file)

    # 将生成视频的输出重定向，防止输出
    sysout = sys.stdout
    sys.stdout = NullWriter()
    video_with_audio.write_videofile(outputFile.as_posix(), codec="libx264")
    sys.stdout = sysout

    video_file.close()
    audio_file.close()
    silent_audio_clip.close()
    video_with_audio.close()
    # 删除临时文件
    os.remove(tmpSavePath)
    print(
        json.dumps(
            {
                "code": 1,
                "type": "concat_video",
                "outputPath": outputPath.as_posix(),
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

concat_imgs_to_video(data=args.data)
