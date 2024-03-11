<script setup>
const openMainWindow = () => {
  window.ipcRenderer.send('open-new-window')
}
</script>

<template>
  <p class="title">登录</p>
  <p class="subtitle">AI生成短视频，记录美好生活</p>
  <n-input-group class="account">
    <n-button class="btn-bk" type="primary"> 账号 </n-button>
    <n-input type="text" placeholder="请输入账号" />
  </n-input-group>
  <n-input-group class="password">
    <n-button class="btn-bk" type="primary"> 密码 </n-button>
    <n-input type="text" placeholder="请输入密码" />
  </n-input-group>
  <n-button class="btn btn-action" @click="openMainWindow"> 登录 </n-button>
</template>

<style scoped>
.title {
  color: #0c0d0f;
  font-size: 26px;
  text-align: center;
  font-weight: bold;
  margin-bottom: 8px;
}
.subtitle {
  color: #808080;
  font-size: 16px;
  text-align: center;
  margin-bottom: 8px;
}
.account {
  width: 300px;
  margin: 32px 20px 12px 20px;
}
.password {
  width: 300px;
  margin: 0px 20px 24px 20px;
}
.btn {
  width: 300px;
  height: 43px;
  color: #fff;
}
.btn:hover {
  color: #fff;
}
.btn-bk {
  width: 100px;
  background-image: url(../assets/images/btn_bk.png);
  background-size: cover;
}
.btn-action {
  background-image: url(../assets/images/btn_bk.png);
  background-size: cover;
}
</style>
