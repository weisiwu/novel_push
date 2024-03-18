import os
import cv2
import sys
import time
import json
import glob
import queue
import base64
import GPUtil
import shutil
import requests
import argparse
import threading
import numpy as np
from pathlib import *
from types import SimpleNamespace
from scenedetect import (
    detect,
    AdaptiveDetector,
    ContentDetector,
)
from rm_subtitle_aliyun import main as RmSubtitleAliyun


def custom_sort(frame_img):
    name = Path(frame_img).name
    num = int(name.split("_")[0])
    return num


"""
考虑的优化点
1、处理视频前，先将视频压缩，再处理
2、支持多种视频类型
3、第一屏只取正常时长的一半
"""

class ClientConfig:
    """
    客户端配置，接受用户的输入
    """

    def __init__(
        self,
        input_path="",
        segment_time=3,
        output_dir="",
        transition_duration_rate=0.3,
        extrac_picture_threshold=27,
        HDImageWidth=512,
        HDImageHeight=512,
        skipRmWatermark=False,
        steps=25,
        cfg=0.5,
        models="",
        isOriginalSize=True,
    ):
        self.input_path = input_path  # 待处理视频
        # 视频分段长度，单位秒
        self.segment_time = segment_time
        self.output_dir = output_dir  # 输出目录
        self.transition_duration_rate = transition_duration_rate
        # 抽取关键帧决断值
        self.extrac_picture_threshold = extrac_picture_threshold
        # 用户写入配置
        self.HDImageWidth = HDImageWidth
        self.HDImageHeight = HDImageHeight
        self.skipRmWatermark = skipRmWatermark
        self.steps = steps
        self.cfg = cfg
        self.models = models
        self.isOriginalSize = isOriginalSize


class VideoInfo:
    """
    读取的视频信息
    """

    def __init__(self, width=0, height=0, frame_rate=0) -> None:
        self.width = width
        self.height = height
        self.frame_rate = frame_rate
        self.size = (width, height)
        self.codec = cv2.VideoWriter_fourcc(*"mp4v")
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

    def __init__(
        self,
        threshold,
        input_file,
        video_info,
        frame_index,
        task_queues,
        client_config,
        video_frames_cahce_path,
    ):
        super().__init__("extract_picture_queue")
        self.threshold = threshold
        self.input_file = input_file
        self.current_index = frame_index
        self.task_queues = task_queues
        self.video_info = video_info
        self.client_config = client_config
        self.sub_task_queue = task_queues.rm_watermark_queue
        self.video_frames_cahce_path = video_frames_cahce_path
        self.cap = cv2.VideoCapture(input_file)
        print("抽出图配置", self.client_config)

    def process(self):
        # 明确每小段视频里，有哪些场景
        # scene_list = detect(self.input_file, ContentDetector())
        scene_list = detect(self.input_file, AdaptiveDetector())
        for i, scene in enumerate(scene_list):
            start_index = scene[0].get_frames()  # 起始帧
            end_index = scene[1].get_frames()  # 结束帧
            key_frame_index = int((start_index + end_index) / 2)  # 关键帧
            self.cap.set(cv2.CAP_PROP_POS_FRAMES, key_frame_index)

            # read方法返回一个布尔值和一个视频帧。若帧读取成功，则返回True
            success, image = self.cap.read()
            # 保存的名字和真实的帧序号并不相同,保存的是终止帧序号，内容对应的是中间帧图片
            save_img_name = (
                self.video_frames_cahce_path / f"{self.current_index + end_index}.png"
            ).as_posix()
            cv2.imwrite(save_img_name, image)
            print(
                json.dumps(
                    {
                        "code": 1,
                        "type": "extract_picture",
                        "input_file": save_img_name,
                        "width": self.video_info.width,
                        "height": self.video_info.height,
                    }
                )
            )
            sys.stdout.flush()
            # 添加去水印任务 - 直接替换源图
            self.sub_task_queue.put(
                RmWatermarkTask(
                    input_file=save_img_name,
                    video_info=self.video_info,
                    task_queues=self.task_queues,
                    client_config=self.client_config,
                )
            )

        self.task_queues.extract_picture_queue.task_done()

class RmWatermarkTask(Task):
    """
    对执行图片去除水印、字幕
    目前阶段使用阿里云RemoveImageSubtitlesRequest API
    后续迁移为(本地方案)
    https://github.com/YaoFANGUK/video-subtitle-remover
    """

    def __init__(
        self,
        input_file,
        video_info,
        task_queues,
        client_config,
    ):
        super().__init__("rm_watermark_queue")
        self.times = 1
        self.input_file = input_file
        self.task_queues = task_queues
        self.video_info = video_info
        self.client_config = client_config
        self.sub_task_queue = task_queues.sd_imgtoimg_queue
        directory, filename = os.path.split(input_file)
        name, extension = os.path.splitext(filename)
        print("去除水印配置", self.client_config)
        self.output_file = os.path.join(directory, f"{name}_new{extension}")

    def process(self):
        print("读取是否跳过配置", type(self.client_config.skipRmWatermark))
        result = RmSubtitleAliyun(
            self.input_file,
            self.output_file,
            skip=self.client_config.skipRmWatermark,
        )
        if result:
            # 【去除图片水印】成功
            print(
                json.dumps(
                    {
                        "code": 1,
                        "type": "rm_watermark",
                        # 是否跳过去除水印
                        "is_skip": self.client_config.skipRmWatermark or False,
                        "input_file": self.input_file,
                        "output_file": self.output_file,
                        "width": self.video_info.width,
                        "height": self.video_info.height,
                    }
                )
            )
            sys.stdout.flush()
            # 向图生图任务队列添加任务
            self.sub_task_queue.put(
                SDImgToImgTask(
                    video_info=self.video_info,
                    input_file=self.output_file,
                    task_queues=self.task_queues,
                    output_file=self.output_file,
                    client_config=self.client_config,
                )
            )
        else:
            # 【去除图片水印】失败
            print(
                json.dumps(
                    {"code": 0, "type": "rm_watermark", "input_file": self.input_file}
                )
            )
            sys.stdout.flush()
            # 失败重试三次
            if self.times <= 3:
                self.times += self.times
                self.process()
                return

        self.task_queues.rm_watermark_queue.task_done()


class SDImgToImgTask(Task):
    """
    SD图生图任务，支持云端/本地
    """

    def __init__(self, input_file, output_file, client_config, task_queues, video_info):
        super().__init__("sd_imgtoimg_queue")
        self.times = 1
        self.video_info = video_info
        self.input_file = input_file
        self.output_file = output_file
        self.task_queues = task_queues
        self.client_config = client_config
        self.base_url = sd_config["baseUrl"]
        self.i2i_api = sd_config["i2iApi"]
        print("图生图配置", self.client_config)
        # 从配置中读取
        if not client_config.isOriginalSize:
            self.output_width = client_config.HDImageWidth or 512
            self.output_height = client_config.HDImageWidth or 512
        else:
            self.output_width = video_info.width or 512
            self.output_height = video_info.height or 512
        # self.output_height = (
        #     self.output_width / self.video_info.width
        # ) * self.video_info.height

    def image_to_base64(self):
        with open(self.input_file, "rb") as image_file:
            base64_string = base64.b64encode(image_file.read()).decode("utf-8")
        return base64_string

    def process(self):
        # 发起 POST 请求
        result = requests.post(
            f"{self.base_url}{self.i2i_api}",
            json={
                "prompt": sd_config["positivePrompt"],
                "init_images": [self.image_to_base64()],
                "negative_prompt": sd_config["negativePrompt"],
                "styles": ["Anime"],
                "batch_size": 1,
                "n_iter": 1,
                "steps": 25,
                "cfg_scale": 7,
                "width": self.output_width,
                "height": self.output_height,
                "denoising_strength": 0.5,
                "sampler_index": "DPM++ 3M SDE Exponential",
                "include_init_images": True,
            },
        )

        # 检查响应状态码
        if result.status_code == 200:
            response_data = result.json()
            img_data = base64.b64decode(response_data["images"][0])
            with open(self.output_file, "wb") as file:
                file.write(img_data)
            # 【图生图任务】成功
            print(
                json.dumps(
                    {
                        "code": 1,
                        "type": "sd_imgtoimg",
                        "input_file": self.input_file,
                        "output_file": self.output_file,
                        "width": self.video_info.width,
                        "height": self.video_info.height,
                    }
                )
            )
            sys.stdout.flush()
        else:
            # 【图生图任务】失败
            print(
                json.dumps(
                    {"code": 0, "type": "sd_imgtoimg", "input_file": self.input_file}
                )
            )
            sys.stdout.flush()
            # 失败重试三次
            if self.times <= 3:
                self.times += self.times
                self.process()
                return

        self.task_queues.sd_imgtoimg_queue.task_done()


class VideoProcess:

    def __init__(self, input_path):
        self.basedir = Path(__file__).parent
        self.gpuInfo = None  # 显卡信息
        self.client_config = ClientConfig(
            input_path=Path(input_path),
            output_dir=sd_config["outputPath"],
            transition_duration_rate=0.3,
            HDImageWidth=sd_config["HDImageWidth"] or 512,
            HDImageHeight=sd_config["HDImageHeight"] or 512,
            skipRmWatermark=sd_config["skipRmWatermark"] or False,
            steps=sd_config["steps"] or 25,
            cfg=sd_config["cfg"] or 0.5,
            models=sd_config["models"] or "",
            isOriginalSize=sd_config["isOriginalSize"] or True,
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
        视频处理过程中，会存在三个任务队列
        1. extract_picture_queue: 抽取关键帧队列
        2. rm_watermark_queue: 去除水印队列
        3. sd_imgtoimg_queue: 图生图任务
        依次往下，上级队列都是下级队列任务的来源
        比如抽取关键帧队列，每处理完一幅图，就会向去除水印队列添加任务
        去除水印队列，每完成10张图，就会向合并视频队列添加任务
        当以上四个队列任务均为空时，视频处理完毕
        任务队列的源头是视频切分
        """
        self.scan_interval = 5  # 每N秒扫描一次，任务是否完成
        self.extract_picture_queue = queue.Queue()
        self.rm_watermark_queue = queue.Queue()
        self.sd_imgtoimg_queue = queue.Queue()
        self.threads = []
        # 任务关系，key表示前置任务，value为后续任务
        self.task_relations = {
            "extract_picture_queue": "rm_watermark_queue",
            "rm_watermark_queue": "sd_imgtoimg_queue",
            "sd_imgtoimg_queue": None,
        }
        self.task_queues = SimpleNamespace(
            extract_picture_queue=self.extract_picture_queue,
            rm_watermark_queue=self.rm_watermark_queue,
            sd_imgtoimg_queue=self.sd_imgtoimg_queue,
        )

        # 开始检查系统
        self.check_system()

    def check_system(self):
        """
        检查系统环境
        如果非N卡，标记无法去除水印
        目前去水印、字幕对N卡是强依赖
        目前仅检查了是否为N卡和基础信息
        https://blog.csdn.net/LuohenYJ/article/details/125857613
        """
        # 获取所有可用GPU列表，id号从0开始
        GPUs = GPUtil.getGPUs()

        if not len(GPUs):
            self.gpuInfo = False
            # print("【读取GPU信息失败】失败")
        else:
            firstGPU = GPUs[0]
            self.gpuInfo = {
                "name": firstGPU.name,  # 显卡名称
                "memoryTotal": firstGPU.memoryTotal,  # 总内存
                "driver": firstGPU.driver,  # 驱动名称
                "load": firstGPU.load,  # GPU负载率
                "memoryUtil": firstGPU.memoryUtil,  # 显存使用率
            }
            # print("【读取GPU信息失败】成功: ", firstGPU)

        # 清空并创建后续需要用到的目录
        if os.path.exists(self.cache_config.video_frames_cahce_path):
            shutil.rmtree(self.cache_config.video_frames_cahce_path)
        if os.path.exists(self.cache_config.video_parts_cahce_path):
            shutil.rmtree(self.cache_config.video_parts_cahce_path)
        os.makedirs(self.cache_config.video_frames_cahce_path, exist_ok=True)
        os.makedirs(self.cache_config.video_parts_cahce_path, exist_ok=True)

        # 加载mp4解析器
        script_dir = str(Path(__file__).resolve().parent)
        dll_path = os.path.join(script_dir, "openh264-2.4.0-win64.dll")

        if os.path.exists(dll_path):
            # 设置 OpenCV 的 DLL 文件路径
            os.environ["PATH"] += ";" + script_dir

        self.read_config()

    def read_config(self):
        """
        读取程序配置
        """
        if not self.client_config:
            return

        self.init_workers()
        self.auto_clip_video()

    def auto_clip_video(self):
        """
        自动分割视频
        """
        self.cap = cv2.VideoCapture(self.client_config.input_path.as_posix())

        if not self.cap:
            # print("【读取视频】失败")
            return

        # 是否成功打开
        if not self.cap.isOpened():
            # print("【打开视频】失败")
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

            for i in range(self.video_info.split_frames):
                success, frame = self.cap.read()
                if not success:
                    break
                self.videowrite.write(frame)

            self.videowrite.release()
            # 添加抽取关键帧任务
            self.task_queues.extract_picture_queue.put(
                ExtractPictureTask(
                    video_info=self.video_info,
                    task_queues=self.task_queues,
                    input_file=segment_file_name,
                    client_config=self.client_config,
                    frame_index=self.current_frame_index,
                    threshold=self.client_config.extrac_picture_threshold,
                    video_frames_cahce_path=self.cache_config.video_frames_cahce_path,
                )
            )
            self.current_segment_index += 1
            self.current_frame_index += self.video_info.split_frames
            if not self.process_start:
                self.process_start = True  # 标记启动

        # 视频切片完成，开始监听任务队列执行情况
        while True:
            time.sleep(self.scan_interval)
            # print("定时扫码的结果是什么", self.process_finish())
            if self.process_finish():

                # 图片处理结束，合成视频
                process_result = self.concat_imgs_to_video(
                    frame_rate=self.video_info.frame_rate,
                    transition_duration_rate=self.client_config.transition_duration_rate,
                    img_size=self.video_info.size,
                )

                if process_result:
                    # print("视频处理完成")
                    print(
                        json.dumps(
                            {
                                "code": 1,
                                "type": "concat_imgs_to_video",
                                "video_path": self.client_config.output_dir,
                            }
                        )
                    )

                # print("【退出主线程】")
                # 发送停止信号给工作线程
                self.task_queues.extract_picture_queue.put(None)
                self.task_queues.rm_watermark_queue.put(None)
                self.task_queues.sd_imgtoimg_queue.put(None)

                # 等待所有线程结束
                for t in self.threads:
                    t.join()

    def concat_imgs_to_video(
        self, frame_rate=30, transition_duration_rate=0.5, img_size=(512, 288)
    ):
        """
        将关键帧合成视频
        img_duration: 图片尺寸时间，单位S
        frame_rate: 视频帧率
        transition_duration_rate: 过渡百分比，比如当前图片出现时长是10S，过渡百分比15，那么会有1.5S的过渡，目前过渡效果仅支持透明过渡
        """
        videowrite = cv2.VideoWriter(
            Path(self.client_config.output_dir).as_posix(),
            cv2.VideoWriter_fourcc(*"mp4v"),
            frame_rate,
            img_size,
        )
        # print("保存视频的位置", self.client_config.output_dir)

        frame_img_path = self.cache_config.video_frames_cahce_path
        # print("图片位置", self.cache_config.video_frames_cahce_path)
        filtered_files = glob.glob(f"{frame_img_path}/*_new*")
        sort_imgs = sorted(filtered_files, key=custom_sort)
        imgs_num = len(sort_imgs)
        prev_end = 0

        for index, frame_img in enumerate(sort_imgs):
            next_index = index + 1 if index + 1 < imgs_num else index
            img = cv2.resize(cv2.imread(frame_img), img_size)
            next_img = cv2.resize(cv2.imread(sort_imgs[next_index]), img_size)

            if img is None:
                continue

            img_duration = (custom_sort(frame_img) - prev_end) / frame_rate
            prev_end = custom_sort(frame_img)
            total_num = int(frame_rate * img_duration)
            transition_num = int(total_num * transition_duration_rate) or 1
            transition_start_index = int(total_num * (1 - transition_duration_rate))

            for cur_index in range(total_num):
                # 计算过渡效果的每一帧
                if (
                    next_img is not None
                    and next_index != index
                    and cur_index >= transition_start_index
                ):
                    # 计算过渡权重（0到1之间）
                    alpha = (cur_index - transition_start_index) / transition_num

                    # 使用 alpha 权重进行混合
                    blended_img = cv2.addWeighted(img, 1 - alpha, next_img, alpha, 0)

                    # 将混合后的图像写入视频文件
                    videowrite.write(np.uint8(blended_img))
                else:
                    videowrite.write(img)

        videowrite.release()
        return True

    def process_finish(self):
        """
        检查视频处理任务的所有对列是否完成
        """
        queues = self.task_queues.__dict__
        # for index, queue_name in enumerate(queues):
        #     print("任务队列还剩余多少", queue_name, queues[queue_name].qsize())
        if self.process_start:
            return all(_queue.empty() for _queue in queues.values())

        return False

    def process_task(self, task, task_type):
        """
        任务处理函数，主要做调用分发
        """
        # print("【执行任务】", task_type)
        task.process()
        pass

    def worker(self, *args):
        """
        任务队列处理
        task_type: 当前处理的任务类型
        """
        task_type = args[0] or None
        task_queue = getattr(self.task_queues, task_type)
        while True:
            task = task_queue.get()
            if task is not None:
                # print("【从任务对列读取任务】", task_type)
                self.process_task(task, task_type)  # 处理当前任务，并分发子任务
                # task_queue.task_done()

    def init_workers(self):
        """
        初始化工作线程，并监听处理结束
        """
        for task_type in self.task_relations.keys():
            # print("【创建任务线程】", task_type)
            t = threading.Thread(target=self.worker, args=(task_type,))
            t.start()
            self.threads.append(t)


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input_file", type=str, default="")
    parser.add_argument("--config_file", type=str, default="")
    return parser.parse_args()


# args = parse_args()
# with open(args.config_file, "r") as f:
#     sd_config = json.load(f)
# VideoProcess(input_path=args.input_file, config_file=args.config_file)


# TODO: 调试时打开
if __name__ == "__main__":
    config_file = r"C:\Users\Administrator\Desktop\github\novel_push\resources\BaoganAiConfig.json"
    input_file = r"C:\Users\Administrator\Desktop\github\novel_push\resources\sdk\main_process\demo.mp4"
    with open(config_file, "r") as f:
        sd_config = json.load(f)
    VideoProcess(input_path=input_file)
