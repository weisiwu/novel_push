<template>
  <div
    class="statusbar"
    :style="{
      position: 'fixed',
      height: '50px',
      right: '0px',
      'z-index': 999
    }"
  >
    <div class="blank"></div>
    <div class="config topbar_icon" @click="props.toggleConfig">
      <n-icon size="24" color="#2080f0" :component="SettingsOutline" />
      <n-gradient-text style="font-size: 16px; cursor: pointer; font-weight: bold" type="info">
        快捷设置
      </n-gradient-text>
    </div>
    <div class="update topbar_icon" @click="props.jumpUpdate">
      <n-icon size="24" color="#2080f0" :component="NotificationsOutline" />
      <n-gradient-text style="font-size: 16px; cursor: pointer; font-weight: bold" type="info">
        更新说明
      </n-gradient-text>
    </div>
  </div>
</template>

<script setup>
import { defineProps, onMounted } from 'vue'
import { useMessage } from 'naive-ui'
import axios from 'axios'
import { sdBaseUrl, samplersApi } from '../../../../resources/BaoganAiConfig.json?asset&asarUnpack'

const props = defineProps({
  toggleConfig: Function,
  jumpUpdate: Function,
  updateGlobalLoading: Function
})
const message = useMessage()
props.updateGlobalLoading(true)

const fetchModelList = () => {
  const _sdBaseUrl = sdBaseUrl.replace(/\/$/, '')
  if (!_sdBaseUrl) {
    props.updateGlobalLoading(false)
    message.error('未填写stable diffusion地址')
    return
  }
  return axios
    .get(`${_sdBaseUrl}${samplersApi}`, { timeout: 4000 })
    .then((result) => {
      if (result.status === 200) {
        message.success('stable diffusion可用')
      } else {
        message.error('stable diffusion地址访问异常')
      }
      props.updateGlobalLoading(false)
    })
    .catch((e) => {
      if (e?.message?.includes('timeout')) {
        message.error('请求stable diffusion状态失败，请重试')
      } else {
        message.error('stable diffusion地址不可用')
      }
      props.updateGlobalLoading(false)
    })
}

onMounted(() => {
  fetchModelList()
})
</script>

<style scoped></style>
