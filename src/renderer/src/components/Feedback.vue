<script setup>
import { ref } from 'vue'
import bk_img from '../../public/imgs/contact_us_1.jpg?asset'
import WXLogo from '../../public/imgs/weixin_logo.png?asset'
import DYLogo from '../../public/imgs/douyin_logo.png?asset'
import BiliLogo from '../../public/imgs/bilibili_logo.png?asset'
import intro1 from '../../public/imgs/intro1.png?asset'
import intro2 from '../../public/imgs/intro2.png?asset'
import intro3 from '../../public/imgs/intro3.png?asset'
import intro4 from '../../public/imgs/intro4.png?asset'
import intro5 from '../../public/imgs/intro5.png?asset'
import intro6 from '../../public/imgs/intro6.png?asset'
import intro7 from '../../public/imgs/intro7.png?asset'
import intro8 from '../../public/imgs/intro8.png?asset'
import intro9 from '../../public/imgs/intro9.png?asset'
import intro10 from '../../public/imgs/intro10.png?asset'

const iframe_url =
  'https://player.bilibili.com/player.html?aid=1252788731&bvid=BV1CJ4m1G7hb&cid=1497318714&p=1'
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
      <p class="chapter_title top">1、下载</p>
      <p class="use_intro_desc">
        点击链接下载压缩包到本地，解压压缩包。找到包中 baogan_ai_novel_push.exe 文件
      </p>
      <n-image width="50%" :src="intro1"></n-image>
      <p class="chapter_title">2、注册账号</p>
      <p class="use_intro_desc">依次填写账号，确认密码</p>
      <n-image width="50%" :src="intro2"></n-image>
      <p class="chapter_title">3、登录</p>
      <p class="use_intro_desc">输入登录的账号密码，点击登录</p>
      <p class="chapter_title">4、输入小说片段</p>
      <p class="use_intro_desc">粘贴需要转换为视频的文本，最长不超过5000字</p>
      <n-image width="50%" :src="intro3"></n-image>
      <n-image width="50%" :src="intro4"></n-image>
      <p class="chapter_title">5、生成视频 - 智能分析文案</p>
      <p class="use_intro_desc">
        这步主要是分析文案内容，生成人物和镜头。其中镜头是后续视频中的画面，人物则用于绘制补充镜头。<br />
        在此，需要完善以下工作项 <br />
        1、删除不必要镜头<br />
        2、编辑字幕文案<br />
        3、选择镜头合适图片<br />
      </p>
      <n-image width="50%" :src="intro5"></n-image>
      <p class="chapter_title">6、生成视频 - 字幕配音和补完镜头</p>
      <p class="use_intro_desc">
        这一步，会对编辑整理完善的镜头统一生成配音文件，对未手动绘图的镜头补充绘图。完成后会自动进入下一步。<!--  -->
      </p>
      <n-image width="50%" :src="intro6"></n-image>
      <p class="chapter_title">7、生成视频 - 高清重绘</p>
      <p class="use_intro_desc">
        之前所有镜头生成的图片，都是低分辨率的。在这里会对所有选中的镜头统一重绘。
      </p>
      <n-image width="50%" :src="intro7"></n-image>
      <n-image width="50%" :src="intro8"></n-image>
      <p class="chapter_title">8、生成视频 - 导出视频</p>
      <p class="use_intro_desc">对前面步骤生成的资料做合并处理，生成最终视频。处理步骤一共有4步</p>
      <p class="use_intro_desc">1、合并图片转化为视频</p>
      <p class="use_intro_desc">2、合并音频片段到一体</p>
      <p class="use_intro_desc">3、将视频和音频合并到一起</p>
      <p class="use_intro_desc">4、向视频添加字幕</p>
      <n-image width="50%" :src="intro9"></n-image>
      视频效果
      <n-image width="50%" :src="intro10"></n-image>
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
      <p class="contact_us">联系方式</p>
      <div class="contact_us_1">
        <!-- <p>
          服务邮箱：<a href="mailto:xx@xx.com">xx@xx.com</a><br />
          工作时间：周一至周五 08:30-12:00，13:30-18:00 （法定假期除外）
        </p> -->
        <p>扫二维码加群</p>
        <n-flex vertical class="ctn">
          <n-qr-code
            value="demo qrcode"
            class="sms_qrcode"
            :color="color"
            :padding="0"
            :size="150"
            background-color="#F5F5F5"
          />
          <div class="light-green">微信</div>
        </n-flex>
        <n-grid cols="3 s:3 m:4 l:5 xl:6 2xl:7" responsive="self">
          <!-- <n-grid-item>
            <n-flex vertical class="ctn">
              <n-qr-code
                value="demo qrcode"
                class="sms_qrcode"
                :color="color"
                :padding="0"
                :size="150"
                background-color="#F5F5F5"
              />
              <img class="bk_img_weixin" :src="WXLogo" />
              <div class="light-green">微信</div>
            </n-flex>
          </n-grid-item> -->
          <!-- <n-grid-item>
            <n-flex vertical class="ctn">
              <n-qr-code
                value="https://www.douyin.com/user/MS4wLjABAAAA5KspY8Du8osm2PyWHCiygirgaN0_oMnk5pGa6KbnUonjGYOwhqmSei2ZeHRQlA3O"
                class="sms_qrcode"
                :color="color"
                :padding="0"
                :size="150"
                background-color="#F5F5F5"
              />
              <img class="bk_img_douyin" :src="DYLogo" />
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
              <img class="bk_img_b" :src="BiliLogo" />
              <p class="light-green">B站</p>
            </n-flex>
          </n-grid-item> -->
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
