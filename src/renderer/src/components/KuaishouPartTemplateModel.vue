<template>
  <el-form-item label="【个性化设置】是否允许同屏">
    <el-radio-group v-model="form.kuaishou_allowSameScreen">
      <el-radio :value="true">允许</el-radio>
      <el-radio :value="false">不允许</el-radio>
    </el-radio-group>
  </el-form-item>
  <el-form-item label="【个性化设置】不允许下载此作品">
    <el-radio-group v-model="form.kuaishou_allowDownload">
      <el-radio :value="true">允许</el-radio>
      <el-radio :value="false">不允许</el-radio>
    </el-radio-group>
  </el-form-item>
  <el-form-item label="【个性化设置】同城不展示">
    <el-radio-group v-model="form.kuaishou_hideInSameCity">
      <el-radio :value="false">展示</el-radio>
      <el-radio :value="true">不展示</el-radio>
    </el-radio-group>
  </el-form-item>
  <el-form-item v-loading="is_type_loading" label="所属领域">
    <el-tree-select
      v-model="form.kuaishou_type"
      filterable
      placeholder="请选择视频默认分区"
      :data="type_list"
      :render-after-expand="false"
    />
  </el-form-item>
  <el-form-item label="查看权限">
    <el-radio-group v-model="form.kuaishou_privacyVal">
      <el-radio value="1">公开</el-radio>
      <el-radio value="4">好友可见</el-radio>
      <el-radio value="2">私密(仅自己可见)</el-radio>
    </el-radio-group>
  </el-form-item>
  <el-form-item label="定时发布">
    <el-date-picker
      v-model="form.kuaishou_dtime"
      type="datetime"
      :style="{ width: '100%' }"
      :disabled-date="check_time_is_available"
      placeholder="选择时间则定时发布，否则点击x按钮清空时间"
      format="YYYY-MM-DD HH:mm"
      date-format="MMM DD, YYYY"
      time-format="HH:mm"
    />
  </el-form-item>
</template>

<script setup>
import { ref, watchEffect, defineProps, onMounted, onUnmounted } from 'vue'
import type_list from '../../../../resources/sdk/node/platform_api/kuaishou_type_list.json'

const props = defineProps({ platform: String, localConfig: Object, form: Object })
const is_type_loading = ref(false)
const form = props.form

// 快手定时发布允许时间: 当前+1小时 ≤ 可选时间 ≤ 当前+7天
const check_time_is_available = (date) => {
  const now_time = new Date().getTime()
  const d_time = date.getTime()
  const hour_mil_sec = 60 * 60 * 1e3
  // 不到两个小时
  if (d_time - now_time < 1 * hour_mil_sec) {
    return true
  }
  if (d_time - now_time > 7 * 24 * hour_mil_sec) {
    return true
  }
  return false
}

// 新配置加载成功后，覆盖初始值
watchEffect(() => {
  if (!props?.localConfig) {
    return
  }
  form.kuaishou_allowSameScreen = Boolean(props?.localConfig?.kuaishou_allowSameScreen)
  form.kuaishou_allowDownload = Boolean(props?.localConfig?.kuaishou_allowDownload)
  form.kuaishou_hideInSameCity = Boolean(props?.localConfig?.kuaishou_hideInSameCity)
  form.kuaishou_type = props?.localConfig?.kuaishou_type || ''
  form.kuaishou_privacyVal = String(props?.localConfig?.kuaishou_privacyVal || 1)
  console.log('wswTest: kuaishou_dtime', props?.localConfig?.kuaishou_dtime)
  form.kuaishou_dtime = props?.localConfig?.kuaishou_dtime
    ? new Date(props?.localConfig?.kuaishou_dtime)
    : ''
})

onMounted(() => {
  // window.ipcRenderer.send('kuaishou-fetch-typelist')
  // window.ipcRenderer.receive('distribute-update-process', (info) => {
  //   const { action } = info || {}
  //   let data = null
  //   if (action) {
  //     const { data: dataStr, type } = action || {}
  //     // 如果是快手类型列表
  //     if (type === 'kuaishou_video_type') {
  //       try {
  //         if (typeof data === 'string') {
  //           data = JSON.parse(dataStr) || {}
  //         } else {
  //           data = dataStr
  //         }
  //         console.log('wswTest: 类型是是', data)
  //       } catch (e) {
  //         is_type_loading.value = false
  //         return false
  //       }
  //       type_list.value = data
  //     }
  //     is_type_loading.value = false
  //   }
  // })
})

onUnmounted(() => {
  // window.ipcRenderer.remove('distribute-update-process')
})
</script>

<style scoped></style>
