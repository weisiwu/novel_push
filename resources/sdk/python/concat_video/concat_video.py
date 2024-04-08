import os
import cv2
import sys
import json
import argparse
from pathlib import *
from PIL import Image
import numpy as np
import moviepy.editor as mp
from moviepy.editor import *
from moviepy.video.tools.subtitles import SubtitlesClip
from os.path import isfile

def custom_sort(frame_img):
    name = Path(frame_img).name
    return name


def custom_sort_wav(frame_img):
    name = Path(frame_img).name
    return int(name[:-4])


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
    parser.add_argument("--wavs", type=str, default="")
    parser.add_argument("--imgs", type=str, default="")
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


def concat_imgs_to_video(
    image_path, background_music_path, srt_path, durations, selected_imgs
):
    """
    生成视频
    image_path: 需要处理的图片所在路径
    background_music_path: 需要添加的配音文件路径
    srt_path: 需要添加的字幕路径
    durations: 每张图片显示时长
    selected_imgs: 需要拼接的图片
    """
    image_path = Path(image_path)
    images = selected_imgs
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
    imageNums = len(images)

    for index, frame_img in enumerate(images):
        duration_time = float(durations[index])
        img = cv2.resize(cv2.imread(str(image_path / frame_img)), img_size)

        if img is None:
            continue

        total_num = int(frame_rate * duration_time)
        transition_time = float(sd_config["frame_transition_time"]) or 0
        transition_nums = int(transition_time * frame_rate)
        for cur_index in range(total_num):
            # 达到末尾什么位置开始渐变，按照百分比计算
            if (total_num - cur_index) < transition_nums and (index + 1 < imageNums):
                next_img = cv2.resize(
                    cv2.imread(str(image_path / images[index + 1])), img_size
                )
                alpha = (total_num - cur_index) / transition_nums
                img_with_transition = cv2.addWeighted(
                    img, alpha, next_img, 1 - alpha, 0
                )
                videowrite.write(img_with_transition)
            else:
                videowrite.write(img)

    videowrite.release()

    # 同步UI进度 - 图片组装视频已完成
    sys.stdout = sysout
    print(
        json.dumps(
            {
                "code": 1,
                "type": "concat_imgs_to_video",
                "step": 2,
                "message": "concat images to video success",
            }
        )
    )
    sys.stdout.flush()
    sysout = sys.stdout
    sys.stdout = NullWriter()

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
        outputFile.as_posix(),
        srt_path.as_posix(),
        video_file,
        audio_file,
        tmpSavePath,
        sysout,
    )
    # 同步UI进度 - 添加字幕完成 - 整体完成
    sys.stdout = sysout
    print(
        json.dumps(
            {
                "code": 1,
                "step": 4,
                "type": "concat_imgs_to_video",
                "outputFile": outputFile.as_posix(),
            }
        )
    )
    sys.stdout.flush()
    return True


def concat_audio(audio_path, save_name, selected_wavs):
    """
    将音频片段合并成整体
    audio_path: 音频片段所在文件夹
    save_name: 输出的整体文件名
    selected_wavs: 需要拼接的音频片段
    """
    audio_path = Path(audio_path)
    audio_num = len(selected_wavs)

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

    for index, audio in enumerate(selected_wavs):
        if isfile(audio_path / audio):
            print("合并音频", audio)
            audios_clip.append(AudioFileClip(str(audio_path / audio)))

    final_audio = concatenate_audioclips(audios_clip)
    final_audio.write_audiofile(str(audio_path / save_name))
    final_audio.close()
    sys.stdout = sysout
    print(
        json.dumps(
            {
                "code": 1,
                "type": "concat_imgs_to_video",
                "step": 1,
                "message": "concat audio success",
            }
        )
    )
    sys.stdout.flush()


# class RealizeAddSubtitles:
#     """
#     合成字幕与视频
#     https://blog.csdn.net/qq_40584593/article/details/110353923
#     """

#     def __init__(self, videoFile, txtFile, video_clip, audio_clip, tmpSavePath, sysout):
#         self.src_video = videoFile
#         self.sentences = txtFile
#         # 传入音轨和视频轨道
#         video_with_audio = video_clip.set_audio(audio_clip)
#         video_with_audio.write_videofile(videoFile, codec="libx264", audio_codec="aac")

#         # 同步UI进度 - 音频视频合成完毕
#         sys.stdout = sysout
#         print(
#             json.dumps(
#                 {
#                     "code": 1,
#                     "type": "concat_imgs_to_video",
#                     "step": 3,
#                     "message": "add audio to video success"
#                 }
#             )
#         )
#         sys.stdout.flush()
#         sysout = sys.stdout
#         sys.stdout = NullWriter()

#         if not (
#             isfile(self.src_video)
#             and self.src_video.endswith((".avi", ".mp4"))
#             and isfile(self.sentences)
#             and self.sentences.endswith(".srt")
#         ):
#             print("视频仅支持avi以及mp4，字幕仅支持srt格式")
#         else:
#             video = VideoFileClip(self.src_video)
#             # 获取视频的宽度和高度
#             w, h = video.w, video.h
#             # 所有字幕剪辑
#             txts = []
#             content = read_srt(self.sentences)
#             sequences = get_sequences(content)

#             for line in sequences:
#                 if len(line) < 3:
#                     continue
#                 sentences = line[2]
#                 start = line[1].split(" --> ")[0]
#                 end = line[1].split(" --> ")[1]

#                 start = strFloatTime(start)
#                 end = strFloatTime(end)

#                 start, end = map(float, (start, end))
#                 span = end - start
#                 txt = (
#                     TextClip(
#                         sentences,
#                         fontsize=select_font_size,
#                         font=select_font,
#                         stroke_color="black",
#                         stroke_width=1,
#                         size=(w - 40, None),
#                         align="center",
#                         method="caption",
#                         color="white",
#                     )
#                     .set_position((20, h * 0.8))
#                     .set_duration(span)
#                     .set_start(start)
#                 )
#                 txts.append(txt)
#             video = CompositeVideoClip([video_with_audio, *txts])
#             video.write_videofile(videoFile)

#             video_clip.close()
#             audio_clip.close()
#             video_with_audio.close()
#             video.close()
#             # 删除临时文件
#             os.remove(tmpSavePath)


class RealizeAddSubtitles:
    """
    合成字幕与视频
    https://blog.csdn.net/qq_40584593/article/details/110353923
    """

    def __init__(self, videoFile, txtFile, video_clip, audio_clip, tmpSavePath, sysout):
        self.src_video = videoFile
        self.sentences = txtFile
        # 获取视频的宽度和高度
        w, h = video_clip.w, video_clip.h
        # 传入音轨和视频轨
        video_with_audio = video_clip.set_audio(audio_clip)

        # 同步UI进度 - 音频视频合成完毕
        sys.stdout = sysout
        print(
            json.dumps(
                {
                    "code": 1,
                    "type": "concat_imgs_to_video",
                    "step": 3,
                    "message": "add audio to video success",
                }
            )
        )
        sys.stdout.flush()
        sysout = sys.stdout
        sys.stdout = NullWriter()
        generator = lambda txt: TextClip(
            txt,
            fontsize=select_font_size,
            font=select_font,
            stroke_color="black",
            stroke_width=1,
            size=(w - 40, None),
            align="center",
            method="caption",
            color="white",
        )

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
            txts.append(((start, end), sentences))

        subtitles = SubtitlesClip(txts, generator)
        video_with_subtitles = CompositeVideoClip(
            [video_with_audio, subtitles.set_position(("center", "bottom"))]
        )
        video_with_subtitles.write_videofile(
            (Path(videoFile).parent / "output.mp4").as_posix(),
            codec="libx264",
            audio_codec="aac",
        )

        video_clip.close()
        audio_clip.close()
        video_with_audio.close()
        video_with_subtitles.close()
        # 删除临时文件
        os.remove(tmpSavePath)
        sys.stdout = sysout

args = parse_args()
with open(args.config_file, "r", encoding="utf-8") as f:
    sd_config = json.load(f)
    sd_config["sdBaseUrl"] = sd_config["sdBaseUrl"].rstrip("/") or ""

# 字幕字体ttf文件路径
select_font_name = sd_config["ttf"]
select_font_size = sd_config["fontsize"] or 56
select_font = Path(args.font_base) / f"{select_font_name}.ttf"

# 过滤后的wavs、imgs列表
selected_wavs = (args.wavs or "").split(",")
selected_imgs = (args.imgs or "").split(",")

# 合并音频
concat_audio(
    Path(sd_config["outputPath"]) / sd_config["audioOutputFolder"],
    sd_config["audioOutput"],
    selected_wavs,
)

# 生成视频
concat_imgs_to_video(
    image_path=Path(sd_config["outputPath"]) / sd_config["imageOutputFolder"],
    background_music_path=Path(sd_config["outputPath"])
    / sd_config["audioOutputFolder"]
    / sd_config["audioOutput"],
    srt_path=Path(sd_config["outputPath"])
    / sd_config["srtOutputFolder"]
    / sd_config["srtOutput"],
    durations=args.durations,
    selected_imgs=selected_imgs,
)
