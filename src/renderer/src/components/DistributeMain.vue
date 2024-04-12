<template>
  <div class="main">
    <div :style="{ margin: '15px 20px' }">
      <el-alert
        title="【提示】快速分发多稿件到多平台，目前支持B站，单稿件"
        description="使用前需要您登录授权各个平台，授权后所有平台共用一套模板，一次点击即可完成多平台，多视频分发。"
        type="success"
        show-icon
      />
    </div>
    <el-upload class="upload-demo" :on-change="selectFile" drag action="" multiple limit="10">
      <el-icon class="el-icon--upload"><upload-filled /></el-icon>
      <div class="el-upload__text">将待分发视频拖放到这里或者<em>点击选择</em></div>
      <template #tip>
        <div class="el-upload__tip">最多可选择10个视频，将按照选中顺序依次进行分发</div>
      </template>
    </el-upload>
    <div :style="{ display: 'flex', justifyContent: 'center', marginTop: '20px' }">
      <el-button type="primary" @click="login">授权登录</el-button>
      <div :style="{ width: '30px' }"></div>
      <el-button type="primary" @click="sendVideo">一键分发</el-button>
    </div>
    <!-- 模板 -->
    <div id="tplBtn">
      <span @click="drawer = !drawer">查看模板</span>
    </div>
    <el-drawer v-model="drawer" direction="btt" :before-close="handleTemplateModelClose">
      <template #header>
        <h4>视频信息模板</h4>
      </template>
      <template #default>
        <el-form :model="form" label-width="auto" style="max-width: 600px">
          <el-form-item label="视频标题前缀">
            <el-input v-model="form.title_prefix" />
          </el-form-item>
          <el-form-item label="视频描述">
            <el-input v-model="form.desc" />
          </el-form-item>
        </el-form>
      </template>
      <template #footer>
        <div style="flex: auto">
          <el-button @click="handleTemplateModelCancel">取消</el-button>
          <el-button type="primary" @click="handleTemplateModelConfirm">保存</el-button>
        </div>
      </template>
    </el-drawer>
    <!-- 分发执行日志 -->
    <terminal
      id="terminal"
      ref="terminal_ref"
      :style="{ height: '350px', position: 'fixed', width: '660px', bottom: '30px' }"
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
import { ref, onMounted, reactive } from 'vue'
import { ElMessageBox } from 'element-plus'
import { UploadFilled } from '@element-plus/icons-vue'
import Terminal from 'vue-web-terminal'
import 'vue-web-terminal/lib/theme/dark.css'

const form = reactive({
  title_prefix: '',
  desc: ''
})
const terminal_ref = ref()
const selected_videos = ref([])
const drawer = ref(false)
const terminalContext = `爆肝分发(${version})`
const login = () => {
  window.ipcRenderer.send('platform-login', { platform: 'bilibili' })
}
const selectFile = (_, files) => {
  selected_videos.value =
    files?.map?.((file) => {
      return { path: file?.raw?.path, size: file?.raw?.size, name: file?.name }
    }) || []
}

const sendVideo = () => {
  window.ipcRenderer.send(
    'platform-send-video',
    JSON.stringify({
      platform: 'bilibili',
      videos: Array.from(selected_videos.value),
      videoInfo: {
        title_prefix: form.title_prefix || '',
        describe: form.desc || ''
      }
    })
  )
}
const handleTemplateModelClose = (done) => {
  ElMessageBox.confirm('是否离开编辑模板?', '注意', {
    confirmButtonText: '确定',
    cancelButtonText: '取消'
  })
    .then(() => done())
    .catch(() => {})
}
const handleTemplateModelCancel = () => {
  drawer.value = false
}
// 保存模板更新
const handleTemplateModelConfirm = () => {
  drawer.value = false
}

onMounted(() => {
  if (window.ipcRenderer) {
    window.ipcRenderer.receive('distribute-update-process', (info) => {
      if (!terminal_ref.value) {
        return false
      }
      terminal_ref.value.pushMessage(info?.msg || '')
    })
  }
})
</script>

<style scoped>
#tplBtn {
  position: fixed;
  top: 50%;
  right: 0px;
  margin-top: -50px;
  width: 50px;
  height: 100px;
  background-color: transparent;
  z-index: 999;
  span {
    display: inline-block;
    font-size: 16px;
    font-weight: bold;
    padding: 10px 19px;
    border-radius: 5px 0px 0px 5px;
    background: #409eff;
    color: rgba(255, 255, 255, 0.8);
    cursor: pointer;
  }
  span:hover {
    color: #fff;
  }
}
#terminal {
  height: 350px;
  position: fixed;
  width: 660px;
  bottom: 30px;
}
</style>
