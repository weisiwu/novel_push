import os
import cv2
import glob
import numpy as np
from pathlib import *


def custom_sort(frame_img):
    name = Path(frame_img).name
    num = int(name.split("_")[0])
    return num


script_dir = str(Path(__file__).resolve().parent)
dll_path = os.path.join(script_dir, "openh264-2.4.0-win64.dll")

if os.path.exists(dll_path):
    # 设置 OpenCV 的 DLL 文件路径
    os.environ["PATH"] += ";" + script_dir


def concat_imgs_to_video(frame_rate=30, transition_duration_rate=0.5):
    """
    将关键帧合成视频
    frame_rate: 视频帧率
    transition_duration_rate: 过渡百分比，比如当前图片出现时长是10S，过渡百分比15，那么会有1.5S的过渡，目前过渡效果仅支持透明过渡
    """
    videowrite = cv2.VideoWriter(
        (Path.cwd() / "output.mp4").as_posix(),
        cv2.VideoWriter_fourcc(*"mp4v"),
        frame_rate,
        (512, 288),
    )

    frame_img_path = Path.cwd() / "video_frames_cahce"
    filtered_files = glob.glob(f"{frame_img_path}/*_new*")
    sort_imgs = sorted(filtered_files, key=custom_sort)
    imgs_num = len(sort_imgs)
    prev_end = 0

    print("sort_imgs==>", type(sort_imgs))
    for index, frame_img in enumerate(sort_imgs):
        next_index = index + 1 if index + 1 < imgs_num else index
        img = cv2.imread(frame_img)
        next_img = cv2.imread(sort_imgs[next_index])
        print("当前图片", frame_img)
        print("下一个图片", sort_imgs[next_index])

        if img is None:
            continue

        img_duration = (custom_sort(frame_img) - prev_end) / frame_rate
        prev_end = custom_sort(frame_img)
        print("当前帧持续时间", img_duration)
        total_num = int(frame_rate * img_duration)
        transition_num = int(total_num * transition_duration_rate)
        transition_start_index = int(total_num * (1 - transition_duration_rate))
        print("过渡帧数量", transition_num)
        print("过渡帧起始点", transition_start_index)

        for cur_index in range(total_num):
            # 计算过渡效果的每一帧
            if next_img is not None and cur_index >= transition_start_index:
                # 计算过渡权重（0到1之间）
                alpha = (cur_index - transition_start_index) / transition_num
                print("计算后的透明", alpha)

                # 使用 alpha 权重进行混合
                blended_img = cv2.addWeighted(img, 1 - alpha, next_img, alpha, 0)

                # 将混合后的图像写入视频文件
                videowrite.write(np.uint8(blended_img))
            else:
                videowrite.write(img)

    videowrite.release()


concat_imgs_to_video()
