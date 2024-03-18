依赖
pip install --upgrade 'scenedetect[opencv-headless]'

打包命令
pyinstaller --onefile main.py
pyinstaller --onedir main.py
pyinstaller --onedir --clean -F main.py
这个快
pyinstaller --onedir main.py

python测试命令
python main.py --input_file C:\Users\Administrator\Desktop\github\novel_push\src\renderer\src\assets\video\demo.mp4 --config_file C:\Users\Administrator\Desktop\github\novel_push\resources\BaoganAiConfig.json

main.exe --input_file C:\Users\Administrator\Desktop\github\novel_push\src\renderer\src\assets\video\demo1.mp4 --config_file C:\Users\Administrator\Desktop\github\novel_push\resources\BaoganAiConfig.json

prompt
我有三种不同类型的任务： A、B、C，每种任务都有很多子任务，子任务之间是有顺序关系的。
A类型每个子任务完成后，都会向B类型插入新的子任务。同理，B类型子任务完成后，会向C插入新子任务。
每个类型都是独立执行，A、B、C都会在有子任务的时候执行，无子任务的时候等待。
当A、B、C的任务队列都同时清空，那么程序结束。
请用python语言设计实现上面的程序，python版本是3.10。


cd C:\Users\Administrator\Desktop\github\novel_push\resources\sdk\main_process

conda activate py310
