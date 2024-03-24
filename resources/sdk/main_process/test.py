import json
import base64
import requests


with open(
    r"C:\\Users\\Administrator\\Desktop\\github\\novel_push\\resources\\BaoganAiConfig.json",
    "r",
) as f:
    sd_config = json.load(f)


def image_to_base64(input_file):
    with open(input_file, "rb") as image_file:
        base64_string = base64.b64encode(image_file.read()).decode("utf-8")
    return base64_string


baseUrl = sd_config["baseUrl"]
i2iApi = sd_config["i2iApi"]
print(sd_config["cfg"])
result = requests.post(
    f"{baseUrl}{i2iApi}",
    json={
        "prompt": sd_config["positivePrompt"],
        "init_images": [
            image_to_base64(
                r"C:\Users\Administrator\Desktop\github\\novel_push\\resources\sdk\main_process\video_frames_cahce\34.png"
            )
        ],
        "negative_prompt": sd_config["negativePrompt"],
        "styles": ["Anime"],
        "batch_size": 1,
        "steps": 25,
        "cfg_scale": str(sd_config["cfg"]),
        "cfg_scale": 4,
        "width": 961,
        "height": 559,
        "denoising_strength": str(sd_config["denoising_strength"]),
        "sampler_index": "DPM++ 3M SDE Exponential",
        "include_init_images": True,
    },
)

print(result)
if result.status_code == 200:
    response_data = result.json()
    img_data = base64.b64decode(response_data["images"][0])
    with open(
        r"C:\Users\Administrator\Desktop\github\novel_push\resources\sdk\main_process\video_frames_cahce\34_new.png",
        "wb",
    ) as file:
        file.write(img_data)
        print("保存完毕")
