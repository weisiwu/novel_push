import cv2
from ..vse.backend.main import

def get_subtitle_from_video(input_video):
    """
    获取视频字幕
    使用 https://github.com/YaoFANGUK/video-subtitle-extractor 进行抽取
    获取输入原视频前对视频做优化处理，按照人类反应最快0.1s计算。字幕的淡入淡出各0.1s。
    理解0.3s。每条字幕至少要0.5s时间。对每秒视频抽两帧图重组视频。
    取帧位置分别是三分之一和三分之二处。
    input_video: 输入视频路径
    """
    subtitls = []
    tmp_file = "tmp_subtitle_extract.mp4"

    cap = cv2.VideoCapture(input_video)

    # 【读取视频】失败
    if not cap:
        return

    # 【打开视频】失败
    if not cap.isOpened():
        return

    frame_rate = cap.get(cv2.CAP_PROP_FPS)  # 获取视频帧率
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    current_frame_index = 0
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    # TODO: 可优化，目前每秒多一帧
    split_frames = int(frame_rate * 0.33)
    x, y, w, h = 843, 1070, 72, 1368  # 字幕区域

    while current_frame_index < total_frames:

        videowrite = cv2.VideoWriter(
            tmp_file,
            cv2.VideoWriter_fourcc(*"mp4v"),
            frame_rate,
            (width, height),
        )

        for i in range(split_frames):
            success, frame = cap.read()
            if not success:
                break

            cropped_frame = frame[y : y + h, x : x + w]
            videowrite.write(cropped_frame)

    cap.release()
    videowrite.release()

    return subtitls
