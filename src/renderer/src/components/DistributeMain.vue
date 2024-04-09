<template>
  <div class="main">
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
const login = () => {
  window.ipcRenderer.send('platform-login', { platform: 'bilibili' })
}
const sendVideo = () => {
  window.ipcRenderer.send('platform-send-video', {
    platform: 'bilibili',
    videoInfo: {
      // TODO:(wsw) mac下测试使用
      video: '/Users/siwu/Desktop/baogao_ai_novel_push_output/1.mp4', // 视频路径
      title: '【AI】小说文本转视频-效果预览-1',
      describe: '【AI】小说文本转视频，目前正在开发中，效果预览+推送测试。'
    }
  })
}
</script>

<style scoped></style>
