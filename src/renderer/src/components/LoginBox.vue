<script setup>
import { ref } from 'vue'
import { useMessage } from 'naive-ui'

const message = useMessage()
const isActing = ref(false)
const accountRef = ref('')
const passwordRef = ref('')

const openMainWindow = () => {
  const account = accountRef.value
  const password = passwordRef.value

  window.ipcRenderer.send('check-account-password-valid', { account, password })
}

window.ipcRenderer.receive('check-account-password-result', (result) => {
  if (isActing.value) {
    return
  }
  isActing.value = true
  if (result.code) {
    // 成功登录，则跳走
    message.success('登录成功')
    setTimeout(() => {
      window.ipcRenderer.send('open-new-window')
      isActing.value = false
    }, 200)
  } else {
    message.error(`登录失败： ${result?.msg || ''}`)
    isActing.value = false
  }
})
</script>

<template>
  <p class="title">登录</p>
  <p class="subtitle">AI助力，提升效率</p>
  <n-input-group class="account">
    <n-button class="btn-bk" type="primary"> 账号 </n-button>
    <n-input v-model:value="accountRef" type="text" placeholder="请输入账号" />
  </n-input-group>
  <n-input-group class="password">
    <n-button class="btn-bk" type="primary"> 密码 </n-button>
    <n-input v-model:value="passwordRef" type="text" placeholder="请输入密码" />
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
  background-image: url(../../public/imgs/btn_bk.png);
  background-size: cover;
}
.btn-action {
  background-image: url(../../public/imgs/btn_bk.png);
  background-size: cover;
}
</style>
