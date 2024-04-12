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
    <terminal
      id="terminal"
      ref="terminal_ref"
      :style="{ height: '350px', position: 'fixed', width: '645px', bottom: '20px' }"
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
</template>

<script setup>
import { version } from '../../../../package.json'
import { ref, onMounted } from 'vue'
import Terminal from 'vue-web-terminal'
import { ElLoading } from 'element-plus'
import { UploadFilled } from '@element-plus/icons-vue'
import TemplateModel from './TemplateModel.vue'
import 'vue-web-terminal/lib/theme/dark.css'

const maxVideoNumber = 10
const localConfig = ref(null)
const terminal_ref = ref()
const video_upload_ref = ref()
const info_alert_show = ref(true)
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
  disabled_distribute.value = !selected_videos.value.length
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
</style>
