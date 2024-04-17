<template>
  <div class="main">
    <transition name="el-zoom-in-top">
      <div v-if="info_alert_show" :style="{ margin: '15px 20px' }">
        <el-alert :title="info_tips" type="success" show-icon />
      </div>
    </transition>
    <el-upload
      ref="video_upload_ref"
      v-model:file-list="selected_videos"
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
        <div
          class="el-upload-list-item-baogan"
          @mouseenter="show_close_bt = true"
          @mouseleave="show_close_bt = false"
        >
          <el-icon class="el-icon--document"><document /></el-icon>
          <span class="el-upload-list-item-baogan-filename">{{ `${file.name}` }}</span>
          <el-progress
            v-if="(file.progress_percent || 0) > 0 && !file.hide_progress"
            :text-inside="true"
            :stroke-width="20"
            :percentage="file.progress_percent || 0"
            class="el-upload-list-item-baogan-progress"
            status="success"
          />
          <div
            v-if="(file.progress_percent || 0) <= 0 || file.hide_progress"
            class="el-upload-list-item-baogan-progress"
          ></div>
          <span
            v-if="file?.step_result"
            class="el-upload-list-item-baogan-stepresult"
            :style="{ color: file.step_result_success ? '#6bc441' : '#f36d6d' }"
            >{{ file?.step_result }}</span
          >
          <el-icon v-show="!show_close_bt" class="el-icon--upload-success">
            <circle-check />
          </el-icon>
          <el-icon
            v-show="show_close_bt"
            class="el-icon--close"
            @click="() => removeSelectedFile(file)"
            ><close
          /></el-icon>
        </div>
      </template>
      <template #tip>
        <div class="el-upload__tip">最多可选择10个视频，将按照选中顺序依次进行分发</div>
      </template>
    </el-upload>
    <div :style="{ display: 'flex', justifyContent: 'center', marginTop: '20px' }">
      <el-dropdown
        v-if="environment.name"
        ref="environment_ref"
        split-button
        type="primary"
        @command="chooseEnvironment"
        @click="login"
      >
        {{ `快捷登录(${environment.name})` }}
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item
              v-for="env in environment_list"
              :key="env?.path"
              divided
              :command="env"
              >{{ env?.name || '' }}</el-dropdown-item
            >
            <el-dropdown-item divided @click="createNewEnvironmentDialogVisible = true"
              ><el-button type="primary">点我新建环境</el-button></el-dropdown-item
            >
          </el-dropdown-menu>
        </template>
      </el-dropdown>
      <div :style="{ width: '30px' }"></div>
      <el-button type="primary" :disabled="disabled_distribute" @click="sendVideo"
        >一键分发</el-button
      >
    </div>
    <div v-if="localConfig?.distribute_platforms?.length" class="platform_desc">
      已选择{{
        support_distribute_platforms
          .filter((platform) => localConfig.distribute_platforms?.includes?.(platform.name))
          ?.map?.((platform) => platform?.name_cn)
          ?.join?.('、')
      }}平台。如需修改分发平台，点击模板管理，勾选需要分发的平台，取消不需要分发的平台
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
        >{{ `点我${show_terminal_log ? '收起' : '展开'}日志面板` }}</el-button
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
  <el-dialog v-model="createNewEnvironmentDialogVisible" title="新建环境" width="500" center>
    <el-input
      v-model="environment_name_val"
      style="width: 300px; margin: 0 84px"
      placeholder="请输入环境名"
    />
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="createNewEnvironmentDialogVisible = false">取消</el-button>
        <el-button type="primary" :disabled="!environment_name_val" @click="createNewEnvironment">
          新建
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { version } from '../../../../package.json'
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import Terminal from 'vue-web-terminal'
import { ElDropdownItem, ElLoading, ElMessage } from 'element-plus'
import { UploadFilled, Close, Document, CircleCheck } from '@element-plus/icons-vue'
import { support_distribute_platforms } from '../../src/constants.js'
import TemplateModel from './TemplateModel.vue'
import 'vue-web-terminal/lib/theme/dark.css'

const maxVideoNumber = 10
const localConfig = ref(null)
const terminal_ref = ref()
const current_uid = ref(0)
const show_close_bt = ref(false)
const video_upload_ref = ref()
const environment_ref = ref()
const environment = ref('默认环境') // 登录环境
const environment_list = ref([])
const environment_name_val = ref()
const info_alert_show = ref(true)
const show_terminal_log = ref(true)
const disabled_distribute = ref(true)
const createNewEnvironmentDialogVisible = ref(false)
const selected_videos = ref([])
const terminalContext = `爆肝分发(${version})`
const info_tips = `【提示】快速分发多稿件到多平台，目前支持${support_distribute_platforms.map((platform) => platform?.name_cn || '').join('、')}`

const login = () => {
  window.ipcRenderer.send('platform-login', {
    platform: localConfig.value?.distribute_platforms?.join(',')
  })
}

const pushMessage = (args) => terminal_ref.value.pushMessage(args)

// on-change会在文件选中上传中，多次触发，需要排除触发条件
const selectFile = (_, files) => {
  // 开始选择文件，alet直接消失
  info_alert_show.value = false
  const ready_files = files.filter((file) => ['ready', 'success'].includes(file.status)) || []
  selected_videos.value =
    ready_files?.map?.((file) => {
      return {
        path: file?.path || file?.raw?.path,
        size: file?.size,
        name: file?.name,
        status: file?.status,
        uid: file?.uid
      }
    }) || []
  // 默认取第一个视频uid
  current_uid.value = selected_videos.value?.[0]?.uid || 0
  disabled_distribute.value = !selected_videos.value.length
}

const removeSelectedFile = (uploadFile) => {
  // 上传中，删除无效
  if (disabled_distribute.value) {
    return
  }
  video_upload_ref.value.handleRemove(uploadFile)
  selected_videos.value = selected_videos.value.filter((file) => file.uid !== uploadFile.uid)
  console.log('wswTest删除后的值是: ', selected_videos.value)
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
      platform: localConfig.value?.distribute_platforms || [],
      videos: Array.from(selected_videos.value)
    })
  )
}

/**
 * 创建新的登录环境
 */
const createNewEnvironment = async () => {
  // 触发创建环境事件
  window.ipcRenderer.send('create-new-environment', { name: environment_name_val.value })
  window.ipcRenderer.receive('create-new-environment-result', (info) => {
    if (info === 'true') {
      ElMessage({
        message: `环境${environment_name_val.value}创建成功`,
        type: 'success'
      })
    } else {
      ElMessage.error(`环境${environment_name_val.value}创建失败`)
    }
    createNewEnvironmentDialogVisible.value = false
  })
}

/**
 * 选择新环境
 */
const chooseEnvironment = (env) => {
  environment.value = env
  window.ipcRenderer.send(
    'distribute-save-tpl-model',
    JSON.stringify({
      useEnvironment: env.name
    })
  )
}

onMounted(() => {
  // 置顶消息，5s后自动隐藏
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
     * 这也是投稿任务队列结束事件
     */
    window.ipcRenderer.receive('distribute-remove-finished-videos', (msg) => {
      if (!msg) {
        disabled_distribute.value = false
        return false
      }
      try {
        const finished_videos = JSON.parse(msg) || []
        console.log('wswTest: 解析出来的要移除的视频列表', finished_videos)
        finished_videos.forEach((finished_video) => {
          removeSelectedFile(finished_video)
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
        const progress_percent = Number(msg)
        selected_videos.value = selected_videos.value.map?.((video) => {
          if (video.uid === current_uid.value) {
            return {
              ...video,
              progress_percent,
              step_result: false,
              step_result_success: false
            }
          }
          return video
        })
        if (progress_percent === 100) {
          const next_index =
            selected_videos.value.findIndex((video) => video.uid === current_uid.value) + 1
          // 转到下一个视频，开始上传，并将进度重置为0
          current_uid.value = selected_videos.value?.[next_index]?.uid || 0
          nextTick(() => {
            selected_videos.value[next_index - 1] = {
              ...selected_videos.value?.[next_index - 1],
              hide_progress: true
            }
          })
        }
      } catch (e) {
        return false
      }
    })

    /**
     * 更新上传步骤级别进度结果
     */
    window.ipcRenderer.receive('upload-video-step-progress', (msg) => {
      if (!msg) {
        return
      }
      const is_success = msg?.indexOf?.('_1') >= 0
      msg = msg?.replace?.('_1', '')
      selected_videos.value = selected_videos.value.map?.((video) => {
        if (video.uid === current_uid.value) {
          return { ...video, step_result: msg, step_result_success: is_success }
        }
        return video
      })
    })

    /**
     * 初始化，执行以下操作，同时全局loading
     * 1、启动后，读取本地已保存视频模板配置
     * 2、查看cookie文件是否存在，存在则认为已登录
     */
    const globalLoadingIns = ElLoading.service({ fullscreen: true })
    window.ipcRenderer.send('platform-init', { platform: ['bilibili'] })
    window.ipcRenderer.receive('platform-init-result', (info) => {
      try {
        localConfig.value = JSON.parse(info) || {}
        environment_list.value = localConfig.value?.environments || []
        environment.value =
          environment_list.value.find?.((env) => env.name === localConfig.value?.useEnvironment) ||
          {}
      } catch (error) {
        console.log('wswTest: error', error?.message || '')
      }

      setTimeout(() => {
        globalLoadingIns.close()
      }, 1000)
    })
  }
})

onUnmounted(() => {
  window.ipcRenderer.remove('distribute-update-process')

  window.ipcRenderer.remove('distribute-remove-finished-videos')

  window.ipcRenderer.remove('upload-video-progress')

  window.ipcRenderer.remove('upload-video-step-progress')

  window.ipcRenderer.remove('platform-init-result')
})
</script>

<style>
.upload-demo {
  max-height: 420px;
  overflow: hidden;
  margin-bottom: 10px;
}
.el-upload-list {
  max-height: 150px;
  overflow-y: scroll;
}
.el-upload-list-item-baogan {
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  flex-wrap: nowrap;
  height: 30px;
  line-height: 30px;
  align-items: center;

  .el-upload-list-item-baogan-filename {
    flex-shrink: 2;
    max-width: 300px;
    text-wrap: nowrap;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .el-upload-list-item-baogan-progress {
    flex-grow: 1;
    flex-shrink: 1;
    top: 0px;
    position: relative;
  }
  .el-icon--upload-success {
  }
  .el-icon--close {
    position: relative;
    top: 6px;
    right: 0px;
  }
  .el-upload-list-item-baogan-stepresult {
    position: absolute;
    left: 50%;
    width: 200px;
    margin-left: -100px;
    font-weight: bold;
    font-size: 16px;
    text-align: center;
  }
}
.platform_desc {
  line-height: 20px;
  font-size: 14px;
}
</style>
