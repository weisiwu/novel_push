<template>
  <div class="main">
    <el-row>
      <el-col v-if="!selected_file" :span="9"></el-col>
      <el-col :span="6">
        <el-button v-if="!selected_file" type="primary" @click="selectFile">选择视频</el-button>
        <p v-if="selected_file">{{ selected_file.value.path }}</p>
      </el-col>
    </el-row>
    <el-row>
      <el-col :span="4"></el-col>
      <el-col :span="6"> <el-button type="primary" @click="login">登录</el-button></el-col>
      <el-col :span="4"></el-col>
      <el-col :span="6">
        <el-button type="primary" @click="sendVideo">发视频</el-button>
      </el-col>
      <el-col :span="4"></el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref } from 'vue'
const selected_file = ref('')
const login = () => {
  window.ipcRenderer.send('platform-login', { platform: 'bilibili' })
}
const selectFile = () => {
  window.ipcRenderer.send('select-video')
  window.ipcRenderer.receive('select-video-finish', ({ path, size } = {}) => {
    selected_file.value = { path, size }
  })
}
const sendVideo = () => {
  window.ipcRenderer.send('platform-send-video', {
    platform: 'bilibili',
    videoInfo: {
      // TODO:(wsw) mac下测试使用
      // video: String(selected_file.value.path), // 视频路径
      // videoSize: selected_file.value.size,
      video: 'C:\\Users\\Administrator\\Desktop\\baogao_ai_novel_push_output\\output.mp4',
      videoSize: 10981560,
      title: '【AI】小说文本转视频-效果预览-1',
      describe: '【AI】小说文本转视频，目前正在开发中，效果预览+推送测试。'
    }
  })
}
</script>

<style scoped></style>
