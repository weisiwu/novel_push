import argparse
from moviepy.editor import *
from pathlib import *


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--width", type=str, default=500)
    parser.add_argument("--height", type=str, default=500)
    parser.add_argument("--image_folder", type=str)
    parser.add_argument("--durations")
    parser.add_argument("--output_file", type=str, default="output.mp4")
    return parser.parse_args()


def list_files(directory):
    result = []
    files = os.listdir(directory)
    for file in files:
        if os.path.isfile(os.path.join(directory, file)):
            result.append(file)
    return result


def concat_video(
    width,
    height,
    image_folder,
    durations,
    output_file,
):
    clips = []
    durations = durations.split(",")

    for index, image in enumerate(
        sorted(list_files(image_folder), key=lambda x: int(x.split(".")[0]))
    ):
        # 创建一个 10 秒的空白片段
        blank_clip = ColorClip(
            size=(int(width), int(height)),
            color=(0, 0, 0),
            duration=float(durations[index]),
        )

        # 加载要播放的图片
        image_clip = ImageClip(os.path.join(image_folder, image))

        # 将图片剪辑放置在空白片段中心
        image_clip = image_clip.set_position(("center", "center")).set_duration(
            float(durations[index])
        )

        clip = CompositeVideoClip([blank_clip, image_clip])

        clips.append(clip)

    final_clip = concatenate_videoclips(clips)
    # 导出视频
    final_clip.write_videofile(f"{output_file}", fps=30)


args = parse_args()
concat_video(
    width=args.width,
    height=args.height,
    image_folder=args.image_folder,
    durations=args.durations,
    output_file=args.output_file,
)
