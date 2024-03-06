""" Interrogator class and subclasses for tagger """

import os
from pathlib import Path
import io
from re import match as re_match
from platform import system
from typing import Tuple, List, Dict, Callable
from pandas import read_csv
from PIL import Image, UnidentifiedImageError
from numpy import asarray, float32, expand_dims, exp
from tqdm import tqdm

from modules import shared
from tagger import settings  # pylint: disable=import-error
from tagger.uiset import QData, IOData  # pylint: disable=import-error
from . import dbimutils  # pylint: disable=import-error # noqa

# TODO: 后续依赖
# 批处理图片反推
import tensorflow as tf

# 这里的最终引用路径要改
from tagger.generator.tf_data_reader import DataGenerator

Its = settings.InterrogatorSettings

# select a device to process
use_cpu = ("all" in shared.cmd_opts.use_cpu) or (
    "interrogate" in shared.cmd_opts.use_cpu
)

# https://onnxruntime.ai/docs/execution-providers/
# https://github.com/toriato/stable-diffusion-webui-wd14-tagger/commit/e4ec460122cf674bbf984df30cdb10b4370c1224#r92654958
onnxrt_providers = ["CUDAExecutionProvider", "CPUExecutionProvider"]

if shared.cmd_opts.additional_device_ids is not None:
    m = re_match(r"([cg])pu:\d+$", shared.cmd_opts.additional_device_ids)
    if m is None:
        raise ValueError("--device-id is not cpu:<nr> or gpu:<nr>")
    if m.group(1) == "c":
        onnxrt_providers.pop(0)
    TF_DEVICE_NAME = f"/{shared.cmd_opts.additional_device_ids}"
elif use_cpu:
    TF_DEVICE_NAME = "/cpu:0"
    onnxrt_providers.pop(0)
else:
    TF_DEVICE_NAME = "/gpu:0"


class Interrogator:
    """Interrogator class for tagger"""

    # the raw input and output.
    input = {
        "cumulative": False,
        "large_query": False,
        "unload_after": False,
        "add": "",
        "keep": "",
        "exclude": "",
        "search": "",
        "replace": "",
        "output_dir": "",
    }
    output = None
    odd_increment = 0

    @classmethod
    def flip(cls, key):
        def toggle():
            cls.input[key] = not cls.input[key]

        return toggle

    @staticmethod
    def get_errors() -> str:
        errors = ""
        if len(IOData.err) > 0:
            # write errors in html pointer list, every error in a <li> tag
            errors = IOData.error_msg()
        if len(QData.err) > 0:
            errors += (
                "Fix to write correct output:<br><ul><li>"
                + "</li><li>".join(QData.err)
                + "</li></ul>"
            )
        return errors

    @classmethod
    def set(cls, key: str) -> Callable[[str], Tuple[str, str]]:
        def setter(val) -> Tuple[str, str]:
            if key == "input_glob":
                IOData.update_input_glob(val)
                return (val, cls.get_errors())
            if val != cls.input[key]:
                tgt_cls = IOData if key == "output_dir" else QData
                getattr(tgt_cls, "update_" + key)(val)
                cls.input[key] = val
            return (cls.input[key], cls.get_errors())

        return setter

    @staticmethod
    def load_image(path: str) -> Image:
        try:
            return Image.open(path)
        except FileNotFoundError:
            print(f"${path} not found")
        except UnidentifiedImageError:
            # just in case, user has mysterious file...
            print(f"${path} is not a  supported image type")
        except ValueError:
            print(f"${path} is not readable or StringIO")
        return None

    def __init__(self, name: str) -> None:
        self.name = name
        self.model = None
        self.tags = None
        # run_mode 0 is dry run, 1 means run (alternating), 2 means disabled
        self.run_mode = 0 if hasattr(self, "large_batch_interrogate") else 2

    def load(self):
        raise NotImplementedError()

    def large_batch_interrogate(self, images: List, dry_run=False) -> str:
        raise NotImplementedError()

    def unload(self) -> bool:
        unloaded = False

        if self.model is not None:
            del self.model
            self.model = None
            unloaded = True
            print(f"Unloaded {self.name}")

        if hasattr(self, "tags"):
            del self.tags
            self.tags = None

        return unloaded

    def interrogate_image(self, image: Image) -> None:
        sha = IOData.get_bytes_hash(image.tobytes())
        QData.clear(1 - Interrogator.input["cumulative"])

        fi_key = sha + self.name
        count = 0

        if fi_key in QData.query:
            # this file was already queried for this interrogator.
            QData.single_data(fi_key)
        else:
            # single process
            count += 1
            data = ("", "", fi_key) + self.interrogate(image)
            # When drag-dropping an image, the path [0] is not known
            if Interrogator.input["unload_after"]:
                self.unload()

            QData.apply_filters(data)

        for got in QData.in_db.values():
            QData.apply_filters(got)

        Interrogator.output = QData.finalize(count)

    def batch_interrogate_image(self, index: int) -> None:
        # if outputpath is '', no tags file will be written
        if len(IOData.paths[index]) == 5:
            path, out_path, output_dir, image_hash, image = IOData.paths[index]
        elif len(IOData.paths[index]) == 4:
            path, out_path, output_dir, image_hash = IOData.paths[index]
            image = Interrogator.load_image(path)
            # should work, we queried before to get the image_hash
        else:
            path, out_path, output_dir = IOData.paths[index]
            image = Interrogator.load_image(path)
            if image is None:
                return

            image_hash = IOData.get_bytes_hash(image.tobytes())
            IOData.paths[index].append(image_hash)
            if getattr(shared.opts, "tagger_store_images", False):
                IOData.paths[index].append(image)

            if output_dir:
                output_dir.mkdir(0o755, True, True)
                # next iteration we don't need to create the directory
                IOData.paths[index][2] = ""
        QData.image_dups[image_hash].add(path)

        abspath = str(path.absolute())
        fi_key = image_hash + self.name

        if fi_key in QData.query:
            # this file was already queried for this interrogator.
            i = QData.get_index(fi_key, abspath)
            # this file was already queried and stored
            QData.in_db[i] = (abspath, out_path, "", {}, {})
        else:
            data = (abspath, out_path, fi_key) + self.interrogate(image)
            # also the tags can indicate that the image is a duplicate
            no_floats = sorted(
                filter(lambda x: not isinstance(x[0], float), data[3].items()),
                key=lambda x: x[0],
            )
            sorted_tags = ",".join(f"({k},{v:.1f})" for (k, v) in no_floats)
            QData.image_dups[sorted_tags].add(abspath)
            QData.apply_filters(data)
            QData.had_new = True

    def batch_interrogate(self) -> None:
        """Interrogate all images in the input list"""
        QData.clear(1 - Interrogator.input["cumulative"])

        if Interrogator.input["large_query"] is True and self.run_mode < 2:
            # TODO: write specified tags files instead of simple .txt
            image_list = [str(x[0].resolve()) for x in IOData.paths]
            self.large_batch_interrogate(image_list, self.run_mode == 0)

            # alternating dry run and run modes
            self.run_mode = (self.run_mode + 1) % 2
            count = len(image_list)
            Interrogator.output = QData.finalize(count)
        else:
            verb = getattr(shared.opts, "tagger_verbose", True)
            count = len(QData.query)

            for i in tqdm(range(len(IOData.paths)), disable=verb, desc="Tags"):
                self.batch_interrogate_image(i)

            if Interrogator.input["unload_after"]:
                self.unload()

            count = len(QData.query) - count
            Interrogator.output = QData.finalize_batch(count)

    def interrogate(
        self, image: Image
    ) -> Tuple[
        Dict[str, float], Dict[str, float]  # rating confidences  # tag confidences
    ]:
        raise NotImplementedError()


# FIXME this is silly, in what scenario would the env change from MacOS to
# another OS? TODO: remove if the author does not respond.
def get_onnxrt():
    try:
        import onnxruntime

        return onnxruntime
    except ImportError:
        # only one of these packages should be installed at one time in an env
        # https://onnxruntime.ai/docs/get-started/with-python.html#install-onnx-runtime
        # TODO: remove old package when the environment changes?
        from launch import is_installed, run_pip

        if not is_installed("onnxruntime"):
            if system() == "Darwin":
                package_name = "onnxruntime-silicon"
            else:
                package_name = "onnxruntime-gpu"
            package = os.environ.get("ONNXRUNTIME_PACKAGE", package_name)

            run_pip(f"install {package}", "onnxruntime")

    import onnxruntime

    return onnxruntime


class WaifuDiffusionInterrogator(Interrogator):
    """Interrogator for Waifu Diffusion models"""

    def __init__(
        self,
        name: str,
        model_path="model.onnx",
        tags_path="selected_tags.csv",
        repo_id=None,
        is_hf=True,
    ) -> None:
        super().__init__(name)
        self.repo_id = repo_id
        self.model_path = model_path
        self.tags_path = tags_path
        self.tags = None
        self.model = None
        self.tags = None
        self.local_model = None
        self.local_tags = None
        self.is_hf = is_hf

    def interrogate(
        self, image: Image
    ) -> Tuple[
        Dict[str, float], Dict[str, float]  # rating confidences  # tag confidences
    ]:
        # init model
        if self.model is None:
            self.load()

        # code for converting the image and running the model is taken from the
        # link below. thanks, SmilingWolf!
        # https://huggingface.co/spaces/SmilingWolf/wd-v1-4-tags/blob/main/app.py

        # convert an image to fit the model
        _, height, _, _ = self.model.get_inputs()[0].shape

        # alpha to white
        image = dbimutils.fill_transparent(image)

        image = asarray(image)
        # PIL RGB to OpenCV BGR
        image = image[:, :, ::-1]

        tags = dict

        image = dbimutils.make_square(image, height)
        image = dbimutils.smart_resize(image, height)
        image = image.astype(float32)
        image = expand_dims(image, 0)

        # evaluate model
        input_name = self.model.get_inputs()[0].name
        label_name = self.model.get_outputs()[0].name
        confidences = self.model.run([label_name], {input_name: image})[0]

        tags = self.tags[:][["name"]]
        tags["confidences"] = confidences[0]

        # first 4 items are for rating (general, sensitive, questionable,
        # explicit)
        ratings = dict(tags[:4].values)

        # rest are regular tags
        tags = dict(tags[4:].values)

        return ratings, tags

    def dry_run(self, images) -> Tuple[str, Callable[[str], None]]:

        def process_images(filepaths, _):
            lines = []
            for image_path in filepaths:
                image_path = image_path.numpy().decode("utf-8")
                lines.append(f"{image_path}\n")
            with io.open("dry_run_read.txt", "a", encoding="utf-8") as filen:
                filen.writelines(lines)

        scheduled = [f"{image_path}\n" for image_path in images]

        # Truncate the file from previous runs
        print("updating dry_run_read.txt")
        io.open("dry_run_read.txt", "w", encoding="utf-8").close()
        with io.open("dry_run_scheduled.txt", "w", encoding="utf-8") as filen:
            filen.writelines(scheduled)
        return process_images

    def run(self, images, pred_model) -> Tuple[str, Callable[[str], None]]:
        threshold = QData.threshold
        self.tags["sanitized_name"] = self.tags["name"].map(
            lambda i: i if i in Its.kaomojis else i.replace("_", " ")
        )

        def process_images(filepaths, images):
            preds = pred_model(images).numpy()

            for ipath, pred in zip(filepaths, preds):
                ipath = ipath.numpy().decode("utf-8")

                self.tags["preds"] = pred
                generic = self.tags[self.tags["category"] == 0]
                chosen = generic[generic["preds"] > threshold]
                chosen = chosen.sort_values(by="preds", ascending=False)
                tags_names = chosen["sanitized_name"]

                key = ipath.split("/")[-1].split(".")[0] + "_" + self.name
                QData.add_tags = tags_names
                QData.apply_filters((ipath, "", {}, {}), key, False)

                tags_string = ", ".join(tags_names)
                txtfile = Path(ipath).with_suffix(".txt")
                with io.open(txtfile, "w", encoding="utf-8") as filename:
                    filename.write(tags_string)

        return images, process_images

    # TODO: 考虑直接做成一个函数，没有必要搞一堆
    def large_batch_interrogate(self, images, dry_run=True) -> None:
        """Interrogate a large batch of images."""

        # 这里打平，无论什么情况都加载模型
        model_path = Path(__file__)
        tags_path = Path(__file__)
        ort = get_onnxrt()
        model = ort.InferenceSession(model_path, providers=onnxrt_providers)
        tags = read_csv(tags_path)

        os.environ["TF_XLA_FLAGS"] = "--tf_xla_auto_jit=2 " "--tf_xla_cpu_global_jit"

        # tensorflow maps nearly all vram by default, so we limit this
        # https://www.tensorflow.org/guide/gpu#limiting_gpu_memory_growth
        # TODO: only run on the first run
        gpus = tf.config.experimental.list_physical_devices("GPU")
        if gpus:
            for device in gpus:
                try:
                    tf.config.experimental.set_memory_growth(device, True)
                except RuntimeError as err:
                    print(err)

        # TODO: 这里的这个截止
        _, height, width, _ = model.inputs[0].shape

        @tf.function
        def pred_model(model):
            return self.model(model, training=False)

        process_images = self.run(images, pred_model)

        generator = DataGenerator(
            file_list=images,
            target_height=height,
            target_width=width,
            batch_size=getattr(shared.opts, "tagger_batch_size", 1024),
        ).gen_ds()

        orig_add_tags = QData.add_tags
        for filepaths, image_list in tqdm(generator):
            process_images(filepaths, image_list)
        QData.add_tag = orig_add_tags
        del os.environ["TF_XLA_FLAGS"]
        # TODO: 这里是最终怎么获取数据的？
