import os
import cv2
import time
import queue
import GPUtil
import shutil
import threading
from pathlib import *
from tqdm import tqdm
from types import SimpleNamespace
from scenedetect import SceneManager, open_video, ContentDetector

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

    def __init__(
        self,
        input_path="",
        # segment_time=10,
        # TODO: 测试
        segment_time=3,
        output_dir="",
        extrac_picture_threshold=0.35,
    ):
        self.input_path = input_path  # 待处理视频
        # 视频分段长度，单位秒
        self.segment_time = segment_time
        self.output_dir = output_dir  # 输出目录
        # 抽取关键帧决断值
        self.extrac_picture_threshold = extrac_picture_threshold


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


class Task:
    """
    任务基类
    """

    def __init__(self, task_type):
        self.task_type = task_type

    def process(self):
        pass


class ExtractPictureTask(Task):
    """
    对分段视频抽取关键帧任务
    """

    def __init__(self, input_file, threshold):
        super().__init__("extract_picture_queue")
        self.input_file = input_file
        self.threshold = threshold

    def process(self):
        video = open_video(self.input_file)
        scene_manager = SceneManager()
        scene_manager.add_detector(ContentDetector(threshold=self.threshold))
        scene_manager.detect_scenes(video)
        # `get_scene_list` returns a list of start/end timecode pairs
        # for each scene that was found.
        # 明确每小段视频里，有哪些场景
        scene_list = scene_manager.get_scene_list()
        # 直接读取场景的中间帧
        print("视频关键帧抽取任务执行结果====>", scene_list)
        # 保存并返回

        # self.task_queues.rm_watermark_queue.push(
        #     Task(
        #         "rm_watermark_queue",
        #         {
        #             # "input_file": segment_file_name,
        #             # "size": self.video_info.size,
        #         },
        #     )
        # )
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
            extrac_picture_threshold=0.35,
        )
        self.cache_config = CacheConfig()
        self.cap = None
        self.video_info = VideoInfo()
        # 视频片段的起始帧[[0,99]]表示第一个分段是从第一帧到第100帧，列表中均为已处理
        self.video_segments = []
        self.current_frame_index = 0  # 当前帧序号(未处理)
        self.current_segment_index = 0  # 当前视频片段序号
        self.videowrite = None  # 当前写视频句柄引用
        self.process_start = False  # 进程是否启动

        """
        任务队列相关
        视频处理过程中，会存在四个任务队列
        # 1. clip_video_queue: 视频切割队列
        2. extract_picture_queue: 抽取关键帧队列
        3. rm_watermark_queue: 去除水印队列
        4. merge_video_queue: 合并视频队列
        依次往下，上级队列都是下级队列任务的来源
        比如抽取关键帧队列，每处理完一幅图，就会向去除水印队列添加任务
        去除水印队列，每完成10张图，就会向合并视频队列添加任务
        当以上四个队列任务均为空时，视频处理完毕
        任务队列的源头是视频切分
        """
        self.scan_interval = 10  # 每N秒扫描一次，任务是否完成
        # self.clip_video_queue = queue.Queue()
        self.extract_picture_queue = queue.Queue()
        self.rm_watermark_queue = queue.Queue()
        self.merge_video_queue = queue.Queue()
        self.threads = []
        # 任务关系，key表示前置任务，value为后续任务
        self.task_relations = {
            # "clip_video_queue": "extract_picture_queue",
            "extract_picture_queue": "rm_watermark_queue",
            "rm_watermark_queue": "merge_video_queue",
            "merge_video_queue": None,
        }
        self.task_queues = SimpleNamespace(
            # clip_video_queue=self.clip_video_queue,
            extract_picture_queue=self.extract_picture_queue,
            rm_watermark_queue=self.rm_watermark_queue,
            merge_video_queue=self.merge_video_queue,
        )
        # 开始检查系统
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
        self.process_start = True  # 标记启动
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
        self.init_workers()
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
            segment_file_name = str(
                self.cache_config.video_parts_cahce_path
                / f"{self.current_segment_index}.mp4"
            )
            self.videowrite = cv2.VideoWriter(
                segment_file_name,
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
            # 添加抽取关键帧任务
            print("关键帧任务队列附加新任务", self.task_queues.extract_picture_queue)
            self.task_queues.extract_picture_queue.put(
                ExtractPictureTask(
                    input_file=segment_file_name,
                    threshold=self.client_config.extrac_picture_threshold,
                )
            )

        VideoProcess.log(type=log_type.cut_video)

    def rm_watermark(self):
        """
        去除关键帧水印
        https://github.com/YaoFANGUK/video-subtitle-remover
        """
        # TODO: 每到第N张的时候，调用一次合成视频
        self.task_queues.merge_video_queue.push(
            Task(
                "merge_video_queue",
                {
                    # "input_file": segment_file_name,
                    # "size": self.video_info.size,
                },
            )
        )
        pass
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

    # TODO: 目前任务类和调度类是联合在一起的
    def process_finish(self):
        """
        检查视频处理任务的所有对列是否完成
        """
        if self.process_start:
            return all(_queue.empty() for _queue in self.task_queues.values())
        return False

    def process_task(self, task, task_type):
        """
        任务处理函数，主要做调用分发
        """
        print(f"执行任务{task_type}", task)
        task.process()
        # if task_type == "extract_picture_queue":
        #     pass
        # elif task_type == "rm_watermark_queue":
        #     pass
        # elif task_type == "merge_video_queue":
        #     pass
        pass

    def worker(self, *args):
        """
        任务队列处理
        task_type: 当前处理的任务类型
        """
        task_type = args[0] or None
        task_queue = getattr(self.task_queues, task_type)
        print("worker接受到的任务类型", task_type)
        while True:
            task = task_queue.get()
            if task is None:  # None作为停止信号
                break
            self.process_task(task, task_type)  # 处理当前任务，并分发子任务
            self.task_queues[task_type].task_done()

    def init_workers(self):
        """
        初始化工作线程，并监听处理结束
        """
        for task_type in self.task_relations.keys():
            print(f"创建{task_type}线程")
            t = threading.Thread(target=self.worker, args=(task_type,))
            t.start()
            self.threads.append(t)

        # 监控队列，当所有队列都为空时，结束任务
        # try:
        #     while not self.process_finish():
        #         time.sleep(self.scan_interval)
        # finally:
        #     # 发送停止信号给工作线程
        #     self.task_queues.clip_video_queue.put(None)
        #     self.task_queues.extract_picture_queue.put(None)
        #     self.task_queues.rm_watermark_queue.put(None)
        #     self.task_queues.merge_video_queue.put(None)

        #     # 等待所有线程结束
        #     for t in self.threads:
        #         t.join()


if __name__ == "__main__":
    VideoProcess()
