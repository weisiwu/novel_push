import json
from pathlib import *

config_file = Path(__file__).parent.parent.parent / "BaoganAiConfig.json"
print(config_file)

with open(config_file, "r") as f:
    sd_config = json.load(f)

print(sd_config)
print(sd_config["skipRmWatermark"])
print(type(sd_config["skipRmWatermark"]))
print(type(True))
