import os
import cv2
import sys
import json
import glob
import argparse
from pathlib import *
from PIL import Image
import moviepy.editor as mp
from moviepy.editor import *
from os.path import isfile

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
    parser.add_argument("--durations", type=str, default="")
    parser.add_argument("--font_base", type=str, default="")
    parser.add_argument("--config_file", type=str, default="")
    return parser.parse_args()


# 读取字幕文件
def read_srt(path):
    content = ""
    with open(path, "r", encoding="UTF-8") as f:
        content = f.read()
        return content


# 字幕拆分
def get_sequences(content):
    sequences = content.split("\n\n")
    sequences = [sequence.split("\n") for sequence in sequences]
    # 去除每一句空值
    sequences = [list(filter(None, sequence)) for sequence in sequences]
    # 去除整体空值
    return list(filter(None, sequences))


def strFloatTime(tempStr):
    xx = tempStr.split(":")
    hour = int(xx[0])
    minute = int(xx[1])
    second = int(xx[2].split(",")[0])
    minsecond = int(xx[2].split(",")[1])
    allTime = hour * 60 * 60 + minute * 60 + second + minsecond / 1000
    return allTime


def concat_imgs_to_video(image_path, background_music_path, srt_path, durations):
    image_path = Path(image_path)
    images = os.listdir(image_path)
    imgs_num = len(images)
    img_size = None
    durations = str(durations).split(",")

    if not imgs_num:
        print(
            json.dumps(
                {"code": 0, "type": "concat_imgs_to_video", "message": "no picture"}
            )
        )
        sys.stdout.flush()
        return False

    # 将生成视频的输出重定向，防止输出
    sysout = sys.stdout
    sys.stdout = NullWriter()

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
    # 添加字幕,同音轨。视频一起合并
    RealizeAddSubtitles(
        outputFile.as_posix(), srt_path.as_posix(), video_file, audio_file, tmpSavePath
    )
    sys.stdout = sysout
    print(
        json.dumps(
            {
                "code": 1,
                "type": "concat_imgs_to_video",
                "outputFile": outputFile.as_posix(),
            }
        )
    )
    sys.stdout.flush()
    return True


def concat_audio(audio_path, save_name):
    audio_path = Path(audio_path)
    audios = os.listdir(audio_path)
    audio_num = len(audios)

    if not audio_num:
        print(
            json.dumps(
                {"code": 0, "type": "concat_audio", "message": "concat audio fail"}
            )
        )
        sys.stdout.flush()
        return False

    audios_clip = []
    # 将生成视频的输出重定向，防止输出
    sysout = sys.stdout
    sys.stdout = NullWriter()

    for audio in audios:
        audios_clip.append(AudioFileClip(str(audio_path / audio)))

    final_audio = concatenate_audioclips(audios_clip)
    final_audio.write_audiofile(str(audio_path / save_name))
    final_audio.close()
    sys.stdout = sysout
    print(
        json.dumps(
            {
                "code": 1,
                "type": "concat_audio",
                "message": "concat audio success",
            }
        )
    )
    sys.stdout.flush()


class RealizeAddSubtitles:
    """
    合成字幕与视频
    https://blog.csdn.net/qq_40584593/article/details/110353923
    """

    def __init__(self, videoFile, txtFile, video_clip, audio_clip, tmpSavePath):
        self.src_video = videoFile
        self.sentences = txtFile
        # 传入音轨和视频轨道
        video_with_audio = video_clip.set_audio(audio_clip)
        video_with_audio.write_videofile(videoFile, codec="libx264", audio_codec="aac")
        if not (
            isfile(self.src_video)
            and self.src_video.endswith((".avi", ".mp4"))
            and isfile(self.sentences)
            and self.sentences.endswith(".srt")
        ):
            print("视频仅支持avi以及mp4，字幕仅支持srt格式")
        else:
            video = VideoFileClip(self.src_video)
            # 获取视频的宽度和高度
            w, h = video.w, video.h
            # 所有字幕剪辑
            txts = []
            content = read_srt(self.sentences)
            sequences = get_sequences(content)

            for line in sequences:
                if len(line) < 3:
                    continue
                sentences = line[2]
                start = line[1].split(" --> ")[0]
                end = line[1].split(" --> ")[1]

                start = strFloatTime(start)
                end = strFloatTime(end)

                start, end = map(float, (start, end))
                span = end - start
                txt = (
                    TextClip(
                        sentences,
                        fontsize=56,
                        font=select_font,
                        stroke_color="black",
                        stroke_width=1,
                        size=(w - 40, None),
                        align="center",
                        method="caption",
                        color="white",
                    )
                    .set_position((20, h * 0.65))
                    .set_duration(span)
                    .set_start(start)
                )
                txts.append(txt)
            video = CompositeVideoClip([video_with_audio, *txts])
            video.write_videofile(videoFile)

            video_clip.close()
            audio_clip.close()
            video_with_audio.close()
            video.close()
            # 删除临时文件
            os.remove(tmpSavePath)


args = parse_args()
with open(args.config_file, "r") as f:
    sd_config = json.load(f)
    sd_config["sdBaseUrl"] = sd_config["sdBaseUrl"].rstrip("/") or ""

select_font_name = sd_config["ttf"]
select_font = Path(args.font_base) / f"{select_font_name}.ttf"

# 合并音频
concat_audio(
    Path(sd_config["outputPath"]) / sd_config["audioOutputFolder"],
    sd_config["audioOutput"],
)

"""
合并视频
注意，视频和音频均在此文件内拼接处理
字幕在调用azure接口生成，这里直接合成字幕
"""
concat_imgs_to_video(
    image_path=Path(sd_config["outputPath"]) / sd_config["imageOutputFolder"],
    background_music_path=Path(sd_config["outputPath"])
    / sd_config["audioOutputFolder"]
    / sd_config["audioOutput"],
    srt_path=Path(sd_config["outputPath"])
    / sd_config["srtOutputFolder"]
    / sd_config["srtOutput"],
    durations=args.durations,
)
