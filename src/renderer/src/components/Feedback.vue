<script setup>
import { ref } from 'vue'
import bk_img from '../../src/assets/images/contact_us_1.jpg?asset'

const iframe_url =
  'https://player.bilibili.com/player.html?aid=562069487&bvid=BV1Uv4y1S734&cid=875577480&p=1'
const bk_style = {
  height: '250px',
  'background-image': `url(${bk_img})`,
  'background-position': 'center center',
  'background-size': 'cover'
}
const showVideoSkeleton = ref(true)
const iframeRef = ref(null)
const videoLoaded = () => {
  showVideoSkeleton.value = false
}
</script>

<template>
  <n-space vertical>
    <n-card>
      <template #cover>
        <div :style="bk_style"></div>
      </template>
      <p class="use_intro">使用说明</p>
      <p class="chapter_title top">章节一</p>
      <p class="use_intro_desc">
        AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍.
      </p>
      <p class="chapter_title">章节二</p>
      <p class="use_intro_desc">
        AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍.AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍
      </p>
      <p class="chapter_title">章节三</p>
      <p class="use_intro_desc">
        AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍.AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍
      </p>
      <p class="chapter_title">章节四</p>
      <p class="use_intro_desc">
        AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍.AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍，AI推文介绍
      </p>
      <div class="iframe_bilibili">
        <n-space v-show="showVideoSkeleton" :style="{ margin: '0 auto', width: '60%' }" vertical>
          <n-skeleton height="40px" width="33%" />
          <n-skeleton height="40px" width="85%" :sharp="false" />
          <n-skeleton height="40px" width="85%" :sharp="false" />
          <n-skeleton height="40px" width="100%" :sharp="false" />
        </n-space>
        <iframe
          v-show="!showVideoSkeleton"
          :ref="iframeRef"
          :style="{ margin: '0 auto' }"
          :src="iframe_url"
          scrolling="no"
          border="0"
          frameborder="no"
          framespacing="0"
          allowfullscreen="true"
          @load="videoLoaded"
        >
        </iframe>
      </div>
    </n-card>
    <n-card>
      <p class="contact_us">联系我们</p>
      <div class="contact_us_1">
        <p>
          服务邮箱：<a href="mailto:xx@xx.com">xx@xx.com</a><br />
          工作时间：周一至周五 08:30-12:00，13:30-18:00 （法定假期除外）
        </p>
        <p>或者扫二维码加群联系我们</p>
        <n-grid cols="3 s:3 m:4 l:5 xl:6 2xl:7" responsive="self">
          <n-grid-item>
            <n-flex vertical class="ctn">
              <n-qr-code
                value="demo qrcode"
                class="sms_qrcode"
                :color="color"
                :padding="0"
                :size="150"
                background-color="#F5F5F5"
              />
              <img class="bk_img_weixin" src="../../../../resources/imgs/weixin_logo.png" />
              <div class="light-green">微信</div>
            </n-flex>
          </n-grid-item>
          <n-grid-item>
            <n-flex vertical class="ctn">
              <n-qr-code
                value="https://www.douyin.com/user/MS4wLjABAAAA5KspY8Du8osm2PyWHCiygirgaN0_oMnk5pGa6KbnUonjGYOwhqmSei2ZeHRQlA3O"
                class="sms_qrcode"
                :color="color"
                :padding="0"
                :size="150"
                background-color="#F5F5F5"
              />
              <img class="bk_img_douyin" src="../../../../resources/imgs/douyin_logo.png" />
              <div class="light-green">抖音</div>
            </n-flex>
          </n-grid-item>
          <n-grid-item>
            <n-flex vertical class="ctn">
              <n-qr-code
                value="https://space.bilibili.com/675816970"
                class="sms_qrcode"
                :color="color"
                :padding="0"
                :size="150"
                background-color="#F5F5F5"
              />
              <img class="bk_img_b" src="../../../../resources/imgs/bilibili_logo.png" />
              <p class="light-green">B站</p>
            </n-flex>
          </n-grid-item>
        </n-grid>
      </div>
    </n-card>
  </n-space>
</template>

<style scoped>
.use_intro,
.contact_us {
  margin-top: 20px;
  font-size: 24px;
  font-weight: bold;
  position: relative;
}
.top {
  padding-top: 24px;
}
.use_intro_desc {
  color: #666;
  font-size: 1em;
  line-height: 1.95em;
  font-size: 16px;
  font-family:
    Microsoft YaHei,
    Arial,
    Helvetica,
    sans-serif;
  text-indent: 24px;
}
.chapter_title {
  margin: 12px 0px;
  font-size: 18px;
  font-weight: bold;
}
.use_intro::after,
.contact_us::after {
  content: '';
  width: 90px;
  height: 3px;
  background-color: #c7000b;
  position: absolute;
  left: 2px;
  top: 42px;
}
.contact_us_1 {
  margin: 24px 0 0 0;
  color: #666;
  font-size: 1em;
  line-height: 1.95em;
  font-size: 16px;
  font-family:
    Microsoft YaHei,
    Arial,
    Helvetica,
    sans-serif;
  a,
  a:focus,
  a.active {
    outline: none;
    background-color: transparent;
  }
}
.sms_qrcode {
  margin: 30px auto;
}
.iframe_bilibili {
  text-align: center;
  iframe {
    width: 60%;
    height: 500px;
  }
}
.light-green,
.green {
  display: flex;
  align-items: center;
  justify-content: center;
}
.light-green {
  font-weight: bold;
  font-size: 24px;
  position: relative;
  top: -20px;
}
.ctn {
  position: relative;
}
.bk_img_weixin {
  position: absolute;
  left: 209px;
  top: 54px;
  width: 130px;
  height: 130px;
  opacity: 0.35;
}
.bk_img_douyin {
  position: absolute;
  left: 196px;
  top: 34px;
  width: 140px;
  height: 140px;
  opacity: 0.35;
}
.bk_img_b {
  position: absolute;
  left: 217px;
  top: 55px;
  width: 105px;
  height: 105px;
  opacity: 0.35;
}
</style>
