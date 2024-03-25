依赖
pip install --upgrade 'scenedetect[opencv-headless]'

打包命令
pyinstaller --onefile main.py
pyinstaller --onedir main.py
pyinstaller --onedir --clean -F main.py
先安装upx，然后指定upx位置，进行打包
去除无关依赖+upx压缩，打包出来的文件大小约
pyinstaller main.py --onefile --upx-dir=/opt/homebrew/Cellar/upx/4.1.0

python测试命令
window
python main.py --input_file C:\Users\Administrator\Desktop\demo\5.mp4 --config_file C:\Users\Administrator\Desktop\github\novel_push\resources\BaoganAiConfig.json

出视频
python main.py --input_file C:\Users\Administrator\Desktop\demo\5.mp4 --config_file C:\Users\Administrator\Desktop\github\novel_push\resources\BaoganAiConfig.json --is_concat_imgs_to_video True

重绘
python main.py --input_file C:\Users\Administrator\Desktop\demo\test.png --config_file C:\Users\Administrator\Desktop\github\novel_push\resources\BaoganAiConfig.json --redraw True


mac
python main.py --input_file /Users/siwu/Desktop/github/novel_push/resources/sdk/main_process/1.mp4  --config_file /Users/siwu/Desktop/github/novel_push/resources/BaoganAiConfig.json

./main.exe --input_file C:\Users\Administrator\Desktop\demo\1.mp4  --config_file C:\Users\Administrator\Desktop\github\novel_push\resources\BaoganAiConfig.json

mac test
./bin/main --input_file /Users/siwu/Desktop/github/novel_push/resources/sdk/main_process/1.mp4  --config_file /Users/siwu/Desktop/github/novel_push/resources/BaoganAiConfig.json

prompt
我有三种不同类型的任务： A、B、C，每种任务都有很多子任务，子任务之间是有顺序关系的。
A类型每个子任务完成后，都会向B类型插入新的子任务。同理，B类型子任务完成后，会向C插入新子任务。
每个类型都是独立执行，A、B、C都会在有子任务的时候执行，无子任务的时候等待。
当A、B、C的任务队列都同时清空，那么程序结束。
请用python语言设计实现上面的程序，python版本是3.10。


cd C:\Users\Administrator\Desktop\github\novel_push\resources\sdk\main_process

conda activate py310

虚拟环境打包
python -m venv pack
pip install alibabacloud_imageenhan20190930 alibabacloud_tea_util alibabacloud_tea_openapi opencv-python GPUtil scenedetect numpy requests argparse
如果使用单目录打包，体积会到500+M
pyinstaller --onefile main.py
pyinstaller --onedir main.py
