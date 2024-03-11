打包命令
pyinstaller --onefile concat_video.py
pyinstaller --onedir concat_video.py

python源文件:concat_video.py
mac可执行文件:
windows可执行文件:

python测试命令
python concat_video.py --width 640 --height 360 --image_folder C:\\Users\\Administrator\\Desktop\\github\\novel_push\\resources\\video_frames --output_file C:\\Users\\Administrator\\Desktop\\github\\novel_push\\resources\\cache\\1710044734676.mp4 --durations '1.000000,2.466667,1.600000'


concat_video.exe --width 500 --height 500 --image_folder C:\Users\Administrator\Desktop\github\novel_push\src\renderer\public\cache\imgs --output_file out_test  --durations "[1, 1, 2]"
