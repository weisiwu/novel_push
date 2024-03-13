import os
import cv2
import GPUtil
import shutil
from pathlib import *
from tqdm import tqdm
from types import SimpleNamespace

# from auto_clip_video import auto_clip_video
# from scenedetect.scene_detector import SceneDetector

# https://www.scenedetect.com/download/
# py_sencedetect

"""
考虑的优化点
1、处理视频前，先将视频压缩，再处理
2、支持多种视频类型
3、第一屏只取正常时长的一半
"""

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

    def __init__(self, input_path="", segment_time=10, output_dir=""):
        self.input_path = input_path  # 待处理视频
        # 视频分段长度，单位秒
        self.segment_time = segment_time
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
        self.codec = cv2.VideoWriter_fourcc(*"XVID")
        self.total_frames = 0  # 视频总帧数
        self.split_frames = 0  # 切割出来的每段视频，有多少帧


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
            input_path=self.basedir / "demo4.mp4",
            output_dir=self.basedir / "output" / "output.mp4",
        )
        self.cache_config = CacheConfig()
        self.cap = None
        self.video_info = VideoInfo()
        # 视频片段的起始帧[[0,99]]表示第一个分段是从第一帧到第100帧，列表中均为已处理
        self.video_segments = []
        self.current_frame_index = 0  # 当前帧序号(未处理)
        self.current_segment_index = 0  # 当前视频片段序号
        self.videowrite = None  # 当前写视频句柄引用
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
                "name": firstGPU.name,  # 显卡名称
                "memoryTotal": firstGPU.memoryTotal,  # 总内存
                "driver": firstGPU.driver,  # 驱动名称
                "load": firstGPU.load,  # GPU负载率
                "memoryUtil": firstGPU.memoryUtil,  # 显存使用率
            }
            VideoProcess.log(self.gpuInfo, log_type.system_check)

        # 清空并创建后续需要用到的目录
        if os.path.exists(self.cache_config.video_frames_cahce_path):
            shutil.rmtree(self.cache_config.video_frames_cahce_path)
        if os.path.exists(self.cache_config.video_parts_cahce_path):
            shutil.rmtree(self.cache_config.video_parts_cahce_path)
        os.makedirs(self.cache_config.video_frames_cahce_path, exist_ok=True)
        os.makedirs(self.cache_config.video_parts_cahce_path, exist_ok=True)

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
        self.cap = cv2.VideoCapture(self.client_config.input_path.as_posix())

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
            # 获取视频宽度
            self.video_info.width = int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        if not self.video_info.height:
            # 获取视频高度
            self.video_info.height = int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            self.video_info.size = (self.video_info.width, self.video_info.height)
        if not self.video_info.total_frames:
            self.video_info.total_frames = int(self.cap.get(cv2.CAP_PROP_FRAME_COUNT))
        if not self.video_info.split_frames:
            # 计算切割点
            self.video_info.split_frames = int(
                self.video_info.frame_rate * self.client_config.segment_time
            )

        while self.current_frame_index < self.video_info.total_frames:
            VideoProcess.log(
                msg=f"Creating {self.current_segment_index}.mp4",
                type=log_type.cut_video,
            )
            self.videowrite = cv2.VideoWriter(
                str(
                    self.cache_config.video_parts_cahce_path
                    / f"{self.current_segment_index}.mp4"
                ),
                self.video_info.codec,
                self.video_info.frame_rate,
                self.video_info.size,
            )

            for i in tqdm(range(self.video_info.split_frames)):
                success, frame = self.cap.read()
                if not success:
                    VideoProcess.log(
                        msg="Failed to read frame, clip completed",
                        type=log_type.cut_video,
                    )
                    break
                self.videowrite.write(frame)

            self.videowrite.release()
            self.current_segment_index += 1
            self.current_frame_index += self.video_info.split_frames

        VideoProcess.log(type=log_type.cut_video)

    def extract_picture(self):
        """
        对分段视频抽取关键帧
        """
        pass

    def rm_watermark(self):
        """
        去除关键帧水印
        https://github.com/YaoFANGUK/video-subtitle-remover
        """
        pass

    def transfer_msg(self):
        """
        同步消息到外部
        """
        pass

    def concat_imgs_to_video(self):
        """
        将关键帧合成视频
        """
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
