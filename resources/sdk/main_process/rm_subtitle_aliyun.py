import os
from urllib.request import urlopen
from alibabacloud_imageenhan20190930.client import Client
from alibabacloud_imageenhan20190930.models import RemoveImageSubtitlesAdvanceRequest
from alibabacloud_tea_util.models import RuntimeOptions
from alibabacloud_tea_openapi.models import Config

config = Config(
    access_key_id="",
    access_key_secret="",
    endpoint="imageenhan.cn-shanghai.aliyuncs.com",
    region_id="cn-shanghai",
)
runtime_option = RuntimeOptions()


def main(img_path, out_path):
    try:
        img = open(img_path, "rb")
        request = RemoveImageSubtitlesAdvanceRequest()
        request.image_urlobject = img
        client = Client(config)
        response = client.remove_image_subtitles_advance(request, runtime_option)
        img.close()
        result_img = getattr(response.body.data, "image_url", None)
        # print("【去除图片水印任务】成功:", result_img)
        if result_img is None:
            return False
        img_response = urlopen(result_img)
        img_data = img_response.read()

        with open(out_path, "wb") as file:
            file.write(img_data)
        return True
    except Exception as error:
        # print("【去除图片水印任务】失败:", error)
        return False


# if __name__ == "__main__":
#     img = "/Users/siwu/Desktop/github/novel_push/resources/sdk/main_process/video_frames_cahce/347.png"
#     main(img)
