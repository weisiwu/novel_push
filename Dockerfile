FROM ubuntu:22.04
FROM python:3.10-slim-bookworm

LABEL maintainer="weisiwu <siwu.wsw@gmail.com>"

RUN mkdir -p /etc/apk

RUN cp /etc/apt/sources.list.d/debian.sources /etc/apt/sources.list.d/debian.sources.bak
RUN sed -i 's|http://deb.debian.org/debian|http://mirrors.aliyun.com/debian|g' /etc/apt/sources.list.d/debian.sources

RUN apt-get update && \
    apt-get install -y git vim wget unzip

# 设置工作目录为 /app
WORKDIR /novel_push_sd

# 保持在后台持续运行
CMD ["sleep", "infinity"]

# 启动镜像命令
# docker build -t novel_push:latest .
# docker run -it -v /C/Users/Administrator/Desktop/github/novel_push/stable-diffusion-webui:/novel_push_sd -p 7860:7860 --entrypoint /bin/bash --name novel_push novel_push
# 安装 requirements.txt 中指定的任何所需包
# python launch.py --no-download-sd-model --xformers --share --listen --enable-insecure-extension-access --precision full --no-half --skip-torch-cuda-test
