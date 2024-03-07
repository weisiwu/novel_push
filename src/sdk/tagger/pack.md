打包命令
pyinstaller --onefile interrogator_wd-v1-4-moat-tagger-v2.py
pyinstaller --onedir interrogator_wd-v1-4-moat-tagger-v2.py

python测试命令
./interrogator_wd-v1-4-moat-tagger-v2.py --image /Users/siwu/Desktop/github/novel_push/src/demo/demo.png --csv_path /Users/siwu/Desktop/github/novel_push/src/sdk/models/tagger/selected_tags.csv --model_path /Users/siwu/Desktop/github/novel_push/src/sdk/models/tagger/model.onnx

mac测试命令
./mac/interrogator_wd-v1-4-moat-tagger-v2 --image /Users/siwu/Desktop/github/novel_push/src/demo/demo.png --csv_path /Users/siwu/Desktop/github/novel_push/src/sdk/models/tagger/selected_tags.csv --model_path /Users/siwu/Desktop/github/novel_push/src/sdk/models/tagger/model.onnx

python源文件:interrogator_wd-v1-4-moat-tagger-v2.py
mac可执行文件:mac_interrogator_wd-v1-4-moat-tagger-v2
windows可执行文件:

