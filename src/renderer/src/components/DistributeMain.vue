<template>
  <div class="main">
    <el-row>
      <el-col v-if="!selected_file" :span="9"></el-col>
      <el-col :span="6">
        <el-button v-if="!selected_file" type="primary" @click="selectFile">选择视频</el-button>
        <p v-if="selected_file">{{ selected_file.path }}</p>
      </el-col>
    </el-row>
    <el-row>
      <el-col :span="9"></el-col>
      <el-col :span="6">
        <input v-model="input_val" type="text" placeholder="输入标题" />
      </el-col>
      <el-col :span="9"></el-col>
    </el-row>
    <el-row>
      <el-col :span="9"></el-col>
      <el-col :span="6">
        <input v-model="desc_val" type="text" placeholder="输入描述" />
      </el-col>
      <el-col :span="9"></el-col>
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

const input_val = ref('')
const desc_val = ref('')
const selected_file = ref(null)
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
      video: String(selected_file.value.path), // 视频路径
      videoSize: selected_file.value.size, // 视频大小
      title: input_val.value || '',
      describe: desc_val.value || ''
    }
  })
}
</script>

<style scoped></style>
