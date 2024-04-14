<template>
  <div class="main">
    <transition name="el-zoom-in-top">
      <div v-if="info_alert_show" :style="{ margin: '15px 20px' }">
        <el-alert
          title="【提示】快速分发多稿件到多平台，目前支持B站，单稿件"
          description="使用前需要您登录授权各个平台，授权后所有平台共用一套模板，一次点击即可完成多平台，多视频分发。"
          type="success"
          show-icon
        />
      </div>
    </transition>
    <el-upload
      ref="video_upload_ref"
      class="upload-demo"
      :on-change="selectFile"
      :on-exceed="videoNumberExceed"
      drag
      action=""
      multiple
      accept="video/mp4,video/mkv,video/mov,video/flv,video/avi,video/wmv,video/x-m4v,video/*"
      :limit="maxVideoNumber"
    >
      <el-icon class="el-icon--upload"><upload-filled /></el-icon>
      <div class="el-upload__text">将待分发视频拖放到这里或者<em>点击选择</em></div>
      <template #file="{ file }">
        <div @mouseenter="show_close_bt = true" @mouseleave="show_close_bt = false">
          <span class="el-upload-list__item-actions">
            <el-icon class="el-icon--document"><document /></el-icon>
            <span>{{ file.name }}</span>
            <el-progress
              v-if="current_uid === file.uid"
              :text-inside="true"
              :stroke-width="20"
              :percentage="progress_percent"
              :style="{
                width: '520px',
                display: 'inline-block',
                top: '15%',
                left: '67px'
              }"
              status="success"
            />
            <el-icon v-show="!show_close_bt" class="el-icon--upload-success">
              <circle-check />
            </el-icon>
            <el-icon
              v-show="show_close_bt"
              class="el-icon--close"
              @click="() => removeSelectedFile(file)"
              ><close
            /></el-icon>
          </span>
        </div>
      </template>
      <template #tip>
        <div class="el-upload__tip">最多可选择10个视频，将按照选中顺序依次进行分发</div>
      </template>
    </el-upload>
    <div :style="{ display: 'flex', justifyContent: 'center', marginTop: '20px' }">
      <el-button type="primary" @click="login">授权登录</el-button>
      <div :style="{ width: '30px' }"></div>
      <el-button type="primary" :disabled="disabled_distribute" @click="sendVideo"
        >一键分发</el-button
      >
    </div>
    <!-- 模板表单区 -->
    <TemplateModel :local-config="localConfig" :push-message="pushMessage" />
    <!-- 分发执行日志 -->
    <div :style="{ position: 'fixed', bottom: '20px' }">
      <el-button
        type="success"
        plain
        size="small"
        :style="{ position: 'absolute', right: 0, top: '-24px' }"
        @click="() => (show_terminal_log = !show_terminal_log)"
        >{{ `点我${show_terminal_log.value ? '收起' : '展开'}日志面板` }}</el-button
      >
      <el-collapse-transition>
        <div v-show="show_terminal_log" :style="{ height: '350px', width: '645px' }">
          <terminal
            id="terminal"
            ref="terminal_ref"
            name="分发执行日志"
            :context="terminalContext"
            context-suffix=":"
            title="分发执行日志"
            :show-header="false"
            :auto-help="false"
            :init-log="{ content: `[${new Date().toLocaleString()}]爆肝分发软件启动~` }"
            :input-filter="() => ''"
          ></terminal>
        </div>
      </el-collapse-transition>
      <div
        v-show="!show_terminal_log"
        :style="{
          height: '20px',
          width: '645px',
          'background-color': '#333',
          'border-radius': '5px 5x 0px 0px'
        }"
      ></div>
    </div>
  </div>
</template>

<script setup>
import { version } from '../../../../package.json'
import { ref, onMounted } from 'vue'
import Terminal from 'vue-web-terminal'
import { ElLoading } from 'element-plus'
import { UploadFilled, Close, Document, CircleCheck } from '@element-plus/icons-vue'
import TemplateModel from './TemplateModel.vue'
import 'vue-web-terminal/lib/theme/dark.css'

const maxVideoNumber = 10
const localConfig = ref(null)
const terminal_ref = ref()
const current_uid = ref(0)
const show_close_bt = ref(false)
const progress_percent = ref(0)
const video_upload_ref = ref()
const info_alert_show = ref(true)
const show_terminal_log = ref(true)
const disabled_distribute = ref(true)
const selected_videos = ref([])
const terminalContext = `爆肝分发(${version})`
const login = () => {
  window.ipcRenderer.send('platform-login', { platform: 'bilibili' })
}
const pushMessage = (args) => terminal_ref.value.pushMessage(args)
const selectFile = (_, files) => {
  // 开始选择文件，alet直接消失
  info_alert_show.value = false
  selected_videos.value =
    files?.map?.((file) => {
      return {
        path: file?.raw?.path,
        size: file?.size,
        name: file?.name,
        status: file?.status,
        uid: file?.uid
      }
    }) || []
  current_uid.value = selected_videos.value?.[0]?.uid || 0
  disabled_distribute.value = !selected_videos.value.length
}
const removeSelectedFile = (uploadFile) => {
  video_upload_ref.value.handleRemove(uploadFile)
}
const videoNumberExceed = () => {
  terminal_ref.value.pushMessage({
    content: `[${new Date().toLocaleString()}]选择的视频超出最大限制(${maxVideoNumber}个)，无法继续添加`,
    class: 'error'
  })
}

const sendVideo = () => {
  if (!selected_videos.value.length) {
    terminal_ref.value.pushMessage({
      content: `[${new Date().toLocaleString()}]未选择视频，无法开始分发`,
      class: 'error'
    })
  }
  disabled_distribute.value = true
  window.ipcRenderer.send(
    'platform-send-video',
    JSON.stringify({
      platform: 'bilibili',
      videos: Array.from(selected_videos.value)
    })
  )
}

onMounted(() => {
  // 置顶消息，10s后自动隐藏
  setTimeout(() => (info_alert_show.value = false), 1e4)

  if (window.ipcRenderer) {
    /**
     * 接受分发进程进度更新日志
     */
    window.ipcRenderer.receive('distribute-update-process', (info) => {
      const { msg, className, type, action } = info || {}
      if (action) {
        return false
      }
      if (!terminal_ref.value || !msg) {
        return false
      }
      terminal_ref.value.pushMessage({
        content: `[${new Date().toLocaleString()}]${msg || ''}`,
        class: className,
        type
      })
    })

    /**
     * 接受分发进程投稿完毕指令，移除投稿成功的视频
     */
    window.ipcRenderer.receive('distribute-remove-finished-videos', (msg) => {
      if (!msg) {
        disabled_distribute.value = false
        return false
      }
      try {
        const finished_videos = JSON.parse(msg) || []
        console.log('wswTest: 解析出来的要移除的视频列表', finished_videos)
        // TODO:(wsw) 删除掉上传成功的文件
        finished_videos.forEach((finished_video) => {
          video_upload_ref?.value?.handleRemove?.(finished_video)
        })
        disabled_distribute.value = !selected_videos.value.length
      } catch (e) {
        return false
      }
    })

    /**
     * 视频上传百分比进度
     */
    window.ipcRenderer.receive('upload-video-progress', (msg) => {
      try {
        progress_percent.value = msg || 0
        if (Number(msg) === 100) {
          const next_index =
            selected_videos.value.findIndex((video) => video.uid === current_uid.value) + 1
          current_uid.value = selected_videos.value?.[next_index]?.uid || 0
        }
      } catch (e) {
        return false
      }
    })

    /**
     * 初始化，执行以下操作，同时全局loading
     * 1、启动后，读取本地已保存视频模板配置
     * 2、查看cookie文件是否存在，存在则认为已登录
     */
    const globalLoadingIns = ElLoading.service({ fullscreen: true })
    window.ipcRenderer.send('platform-init', { platform: 'bilibili' })
    window.ipcRenderer.receive('platform-init-result', (info) => {
      try {
        localConfig.value = JSON.parse(info) || {}
        console.log('wswTest: 收到的读取信息', info)
        terminal_ref.value.pushMessage({
          content: `[${new Date().toLocaleString()}]成功读取本地配置`,
          class: 'success'
        })
      } catch (error) {
        terminal_ref.value.pushMessage({
          content: `[${new Date().toLocaleString()}]读取本地配置失败: ${error?.message || ''}`,
          class: 'error'
        })
        console.log('wswTest: error', error?.message || '')
      }

      setTimeout(() => {
        globalLoadingIns.close()
      }, 1000)
    })
  }
})
</script>

<style>
.upload-demo {
  max-height: 420px;
  overflow: hidden;
  margin-bottom: 10px;
}
.el-upload-list {
  max-height: 200px;
  overflow-y: scroll;
}
.el-icon--upload-success {
  position: absolute;
  right: 5px;
}
</style>
