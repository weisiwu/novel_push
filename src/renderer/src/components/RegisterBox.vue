<script setup>
import { ref, defineProps } from 'vue'
import { useMessage } from 'naive-ui'

const message = useMessage()
const accountRef = ref('')
const passwordRef = ref('')
const confirmPasswordRef = ref('')
const props = defineProps({
  switchToTab: Function
})

const registerAccout = () => {
  const account = accountRef.value
  const password = passwordRef.value
  const password1 = confirmPasswordRef.value

  if (account && password && password === password1) {
    window.ipcRenderer.send('register-account', { account, password })
  } else if (password !== password1) {
    message.error('两次填写密码不一致')
  } else {
    message.error('存在未填写信息')
  }
}

window.ipcRenderer.receive('register-account-result', (result) => {
  if (result.code) {
    // 成功登录，则跳走
    message.success('注册成功，请登录')
    setTimeout(() => {
      props?.switchToTab?.()
    }, 200)
  } else {
    message.error(`注册失败，${result.msg || ''}`)
  }
})
</script>

<template>
  <p class="title">注册</p>
  <p class="subtitle">AI助力，提升效率</p>
  <n-input-group class="account">
    <n-button class="btn-bk" type="primary"> 账号 </n-button>
    <n-input v-model:value="accountRef" type="text" placeholder="请输入账号" />
  </n-input-group>
  <n-input-group class="password">
    <n-button class="btn-bk" type="primary"> 密码 </n-button>
    <n-input v-model:value="passwordRef" type="text" placeholder="请输入密码" />
  </n-input-group>
  <n-input-group class="password">
    <n-button class="btn-bk" type="primary"> 确认密码 </n-button>
    <n-input v-model:value="confirmPasswordRef" type="text" placeholder="请重复输入以确认密码" />
  </n-input-group>
  <n-button class="btn btn-action" @click="registerAccout"> 注册账号 </n-button>
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
  margin: 10px 20px 12px 20px;
}
.password {
  width: 300px;
  margin: 0px 20px 12px 20px;
}
.password-1 {
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
