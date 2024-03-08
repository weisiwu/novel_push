import argparse
from pathlib import *
import numpy as np
import onnxruntime as rt
import pandas as pd
from PIL import Image

# 直接调用反推模型
# https://hf-mirror.com/spaces/SmilingWolf/wd-tagger/raw/main/app.py

MODEL_FILENAME = "model.onnx"
LABEL_FILENAME = "selected_tags.csv"

# https://github.com/toriato/stable-diffusion-webui-wd14-tagger/blob/a9eacb1eff904552d3012babfa28b57e1d3e295c/tagger/ui.py#L368
kaomojis = [
    "0_0",
    "(o)_(o)",
    "+_+",
    "+_-",
    "._.",
    "<o>_<o>",
    "<|>_<|>",
    "=_=",
    ">_<",
    "3_3",
    "6_9",
    ">_o",
    "@_@",
    "^_^",
    "o_o",
    "u_u",
    "x_x",
    "|_|",
    "||_||",
]


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--image", type=str)
    parser.add_argument("--general_thresh", type=float, default=0.35)
    parser.add_argument("--general_mcut_enabled", action="store_false")
    parser.add_argument("--character_thresh", type=float, default=0.85)
    parser.add_argument("--character_mcut_enabled", action="store_false")
    parser.add_argument("--csv_path", type=str)
    parser.add_argument("--model_path", type=str)
    return parser.parse_args()


def load_labels(dataframe) -> list[str]:
    name_series = dataframe["name"]
    name_series = name_series.map(
        lambda x: x.replace("_", " ") if x not in kaomojis else x
    )
    tag_names = name_series.tolist()

    rating_indexes = list(np.where(dataframe["category"] == 9)[0])
    general_indexes = list(np.where(dataframe["category"] == 0)[0])
    character_indexes = list(np.where(dataframe["category"] == 4)[0])
    return tag_names, rating_indexes, general_indexes, character_indexes


def mcut_threshold(probs):
    """
    Maximum Cut Thresholding (MCut)
    Largeron, C., Moulin, C., & Gery, M. (2012). MCut: A Thresholding Strategy
     for Multi-label Classification. In 11th International Symposium, IDA 2012
     (pp. 172-183).
    """
    sorted_probs = probs[probs.argsort()[::-1]]
    difs = sorted_probs[:-1] - sorted_probs[1:]
    t = difs.argmax()
    thresh = (sorted_probs[t] + sorted_probs[t + 1]) / 2
    return thresh


class Predictor:
    def __init__(self):
        self.model_target_size = None

    def load_model(self, model_path, csv_path):
        # csv_path = Path(__file__).parent.parent / "models" / "tagger" / LABEL_FILENAME
        # model_path = Path(__file__).parent.parent / "models" / "tagger" / MODEL_FILENAME

        tags_df = pd.read_csv(csv_path)
        sep_tags = load_labels(tags_df)

        self.tag_names = sep_tags[0]
        self.rating_indexes = sep_tags[1]
        self.general_indexes = sep_tags[2]
        self.character_indexes = sep_tags[3]

        model = rt.InferenceSession(model_path, providers=["CPUExecutionProvider"])
        _, height, width, _ = model.get_inputs()[0].shape
        self.model_target_size = height

        self.model = model

    def prepare_image(self, image):
        target_size = self.model_target_size

        canvas = Image.new("RGBA", image.size, (255, 255, 255))
        canvas.alpha_composite(image)
        image = canvas.convert("RGB")

        # Pad image to square
        image_shape = image.size
        max_dim = max(image_shape)
        pad_left = (max_dim - image_shape[0]) // 2
        pad_top = (max_dim - image_shape[1]) // 2

        padded_image = Image.new("RGB", (max_dim, max_dim), (255, 255, 255))
        padded_image.paste(image, (pad_left, pad_top))

        # Resize
        if max_dim != target_size:
            padded_image = padded_image.resize(
                (target_size, target_size),
                Image.BICUBIC,
            )

        # Convert to numpy array
        image_array = np.asarray(padded_image, dtype=np.float32)

        # Convert PIL-native RGB to BGR
        image_array = image_array[:, :, ::-1]

        return np.expand_dims(image_array, axis=0)

    def predict(
        self,
        image,
        general_thresh,
        general_mcut_enabled,
        character_thresh,
        character_mcut_enabled,
        model_path,
        csv_path,
    ):
        self.load_model(model_path, csv_path)

        image = self.prepare_image(Image.open(image).convert("RGBA"))

        input_name = self.model.get_inputs()[0].name
        label_name = self.model.get_outputs()[0].name
        preds = self.model.run([label_name], {input_name: image})[0]

        labels = list(zip(self.tag_names, preds[0].astype(float)))

        # First 4 labels are actually ratings: pick one with argmax
        ratings_names = [labels[i] for i in self.rating_indexes]
        rating = dict(ratings_names)

        # Then we have general tags: pick any where prediction confidence > threshold
        general_names = [labels[i] for i in self.general_indexes]

        if general_mcut_enabled:
            general_probs = np.array([x[1] for x in general_names])
            general_thresh = mcut_threshold(general_probs)

        general_res = [x for x in general_names if x[1] > general_thresh]
        general_res = dict(general_res)

        # Everything else is characters: pick any where prediction confidence > threshold
        character_names = [labels[i] for i in self.character_indexes]

        if character_mcut_enabled:
            character_probs = np.array([x[1] for x in character_names])
            character_thresh = mcut_threshold(character_probs)
            character_thresh = max(0.15, character_thresh)

        character_res = [x for x in character_names if x[1] > character_thresh]
        character_res = dict(character_res)

        sorted_general_strings = sorted(
            general_res.items(),
            key=lambda x: x[1],
            reverse=True,
        )
        sorted_general_strings = [x[0] for x in sorted_general_strings]
        sorted_general_strings = (
            ", ".join(sorted_general_strings).replace("(", "\(").replace(")", "\)")
        )

        return sorted_general_strings, rating, character_res, general_res


def main(config={}):
    (
        image,
        general_thresh,
        general_mcut_enabled,
        character_thresh,
        character_mcut_enabled,
        model_path,
        csv_path,
    ) = (
        config[k]
        for k in (
            "image",
            "general_thresh",
            "general_mcut_enabled",
            "character_thresh",
            "character_mcut_enabled",
            "model_path",
            "csv_path",
        )
    )
    predictor = Predictor()

    sorted_general_strings, rating, character_res, general_res = predictor.predict(
        image,  # Path(__file__).parent.parent.parent / "demo" / "demo.png"
        general_thresh,  # 0.35
        general_mcut_enabled,  # False
        character_thresh,  # 0.85
        character_mcut_enabled,  # False
        model_path,
        csv_path,
    )

    # general_res 就是关键词+频率列表
    return [sorted_general_strings, rating, character_res, general_res]


# 通过命令行进行传参，获取后执行
args = parse_args()
[sorted_general_strings, rating, character_res, general_res] = main(
    {
        "image": args.image,  # 传入图片目录，读取目录下所有的图片
        "general_thresh": args.general_thresh,
        "general_mcut_enabled": args.general_mcut_enabled,
        "character_thresh": args.character_thresh,
        "character_mcut_enabled": args.character_mcut_enabled,
        "csv_path": args.csv_path,
        "model_path": args.model_path,
    }
)
print(general_res)
