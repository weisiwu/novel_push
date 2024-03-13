import os
import cv2
import GPUtil
from pathlib import *
from types import SimpleNamespace

# from auto_clip_video import auto_clip_video

# from scenedetect.scene_detector import SceneDetector

# https://www.scenedetect.com/download/
# py_sencedetect

log_type = SimpleNamespace(
    system_check="_system_check",
    read_config="_read_config",
    cut_video="_cut_video",
    extract_picture="_extract_picture",
    rm_watermark="_rm_watermark",
    transfer_msg="_transfer_msg",
    merge_video="_merge_video",
)


class ClientConfig:
    """
    客户端配置，接受用户的输入
    """

    def __init__(self, input_path="", batch_size=100, output_dir=""):
        self.input_path = input_path  # 待处理视频
        self.batch_size = (
            batch_size  # 视频分段大小，单位帧，切割生成的小视频，每段有100帧画面
        )
        self.output_dir = output_dir  # 输出目录


class SDConfig:
    """
    sd相关设置
    """

    def __init__(self) -> None:
        pass


class VideoInfo:
    """
    读取的视频信息
    """

    def __init__(self, width=0, height=0, frame_rate=0) -> None:
        self.width = width
        self.height = height
        self.frame_rate = frame_rate
        self.size = (width, height)


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


class VideoProcess:
    def __init__(self):
        self.basedir = Path(__file__).parent
        self.gpuInfo = None  # 显卡信息
        self.sd_config = SDConfig()  # sd配置
        # 客户端配置,比如输出位置和输入位置
        self.client_config = ClientConfig(
            input_path=self.basedir / "demo.mp4",
            output_dir=self.basedir / "output" / "output.mp4",
        )
        self.cache_config = CacheConfig()
        self.cap = None
        self.video_info = VideoInfo()
        # 视频片段的起始帧[[0,99]]表示第一个分段是从第一帧到第100帧，列表中均为已处理
        self.video_segments = []
        # 当前帧序号(未处理)
        self.current_frame_index = 0
        self.videowrite = None  #
        self.check_system()

    # 程序进度，True: 完成  False: 未执行或执行中
    _system_check = False
    _read_config = False
    _cut_video = False
    _extract_picture = False
    _rm_watermark = False
    _transfer_msg = False
    _merge_video = False

    @staticmethod
    def log(msg="", type=log_type.system_check):
        if not msg or msg == "":
            type_status = getattr(VideoProcess, type)
            if type_status:
                print(f"======= {type} end =======")
            else:
                setattr(VideoProcess, type, True)
                print(f"======= {type} start =======")
            return

        print(f"{type} ==> ", msg)

    @staticmethod
    def error(msg, type=log_type.system_check):
        print(f"【Error】{type} ==> ", msg)

    def check_system(self):
        """
        检查系统环境
        如果非N卡，标记无法去除水印
        目前去水印、字幕对N卡是强依赖
        目前仅检查了是否为N卡和基础信息
        https://blog.csdn.net/LuohenYJ/article/details/125857613
        """
        VideoProcess.log()
        # 获取所有可用GPU列表，id号从0开始
        GPUs = GPUtil.getGPUs()

        if not len(GPUs):
            self.gpuInfo = False
            VideoProcess.error(
                "can't find gpu info, please confirm your system info",
                log_type.system_check,
            )
        else:
            firstGPU = GPUs[0]
            self.gpuInfo = {
                "name": firstGPU["name"],  # 显卡名称
                "memoryTotal": firstGPU["memoryTotal"],  # 总内存
                "driver": firstGPU["driver"],  # 驱动名称
                "load": firstGPU["load"],  # GPU负载率
                "memoryUtil": firstGPU["memoryUtil"],  # 显存使用率
            }
            VideoProcess.log(self.gpuInfo, log_type.system_check)

        VideoProcess.log()
        self.read_config()

    def read_config(self):
        """
        读取程序配置
        """
        VideoProcess.log(type=log_type.read_config)
        if not self.client_config:
            VideoProcess.error("client config empty", log_type.read_config)
            return

        VideoProcess.log(type=log_type.read_config)
        self.auto_clip_video()

    def auto_clip_video(self):
        """
        自动分割视频
        """
        VideoProcess.log(type=log_type.cut_video)
        input_path = self.client_config.input_path
        output_dir = self.client_config.output_dir
        batch_size = self.client_config.batch_size
        self.cap = cv2.VideoCapture(input_path.as_posix())

        if not self.cap:
            VideoProcess.error("video empty", log_type.cut_video)
            return

        # 是否成功打开
        if not self.cap.isOpened():
            VideoProcess.error("video can not open", log_type.cut_video)
            return

        if not self.video_info.frame_rate:
            self.video_info.frame_rate = self.cap.get(cv2.CAP_PROP_FPS)  # 获取视频帧率
        if not self.video_info.width:
            self.video_info.width = int(
                self.cap.get(cv2.CAP_PROP_FRAME_WIDTH)
            )  # 获取视频宽度
        if not self.video_info.height:
            self.video_info.height = int(
                self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT)
            )  # 获取视频高度

        VideoProcess.log(
            f"\n width:{self.video_info.width} \n heihgt:{self.video_info.height} \n frame_rate:{self.video_info.frame_rate}",
            log_type.cut_video,
        )

        self.video_segments.append([])

        # while True:

    # 对分段视频抽取关键帧

    # 去除关键帧水印
    # https://github.com/YaoFANGUK/video-subtitle-remover

    # 同步消息到外部

    # 将关键帧合成视频
    def concat_imgs_to_video(self):
        VideoProcess.log(log_type.merge_video)
        self.videowrite = cv2.VideoWriter(
            self.client_config.output_dir,
            -1,
            self.video_infol.frame_rate,
            self.video_info.size,
        )

        img_array = []

        for frame_img in os.listdir(self.cache_config.video_frames_cahce_path):
            filename = Path(self.cache_config.video_frames_cahce_path) / frame_img
            img = cv2.imread(filename)

            if img is None:

                continue
            self.videowrite.write(img)

        self.videowrite.release()

        VideoProcess.log(log_type.merge_video)


if __name__ == "__main__":
    VideoProcess()
