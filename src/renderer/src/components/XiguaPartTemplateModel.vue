<template>
  <el-form-item label="视频类型">
    <el-radio-group v-model="form.xigua_isReproduce">
      <el-radio value="true">原创</el-radio>
      <el-radio value="false">转载</el-radio>
    </el-radio-group>
  </el-form-item>
  <el-form-item label="视频来源">
    <el-input
      v-model="form.xigua_reproduceDesc"
      placeholder="转载内容应征得原作者同意并请注明来源（例如：视频来源 http://www.xxxx.com/yyyy)"
    />
  </el-form-item>
  <el-form-item label="参与活动">
    <el-select v-model="form.xigua_activityName" placeholder="请选择要参与的活动任务">
      <el-option
        v-for="item in activity_list"
        :key="item.value"
        :label="item.label"
        :value="item.value"
      >
        <a :href="item.url" target="_blank">
          <span style="float: left">{{ item.label }}</span>
        </a>
        <p style="float: left">{{ item.protocol }}</p>
      </el-option>
    </el-select>
  </el-form-item>
  <el-form-item label="谁可以看">
    <el-radio-group v-model="form.xigua_privacyVal">
      <el-radio value="">公开</el-radio>
      <el-radio value="2">粉丝可见</el-radio>
      <el-radio value="1">仅我可见</el-radio>
    </el-radio-group>
  </el-form-item>
  <el-form-item label="定时发布">
    <el-date-picker
      v-model="form.xigua_dtime"
      type="datetime"
      :style="{ width: '100%' }"
      :disabled-date="check_time_is_available"
      placeholder="选择时间则定时发布，否则点击x按钮清空时间"
      format="YYYY-MM-DD HH:mm"
      date-format="MMM DD, YYYY"
      time-format="HH:mm"
    />
  </el-form-item>
  <el-form-item label="允许他人下载">
    <el-radio-group v-model="form.xigua_allowDownload">
      <el-radio :value="true">允许</el-radio>
      <el-radio :value="false">不允许</el-radio>
    </el-radio-group>
  </el-form-item>
</template>

<script setup>
import { ref, watchEffect, defineProps, onMounted, onUnmounted } from 'vue'

const props = defineProps({ platform: String, localConfig: Object, form: Object })
const activity_list = ref([{ label: '活动1', value: '活动1' }])
// 这些属性会被直接注入到form中
const form = props.form

// 西瓜定时发布允许时间: 当前+2小时 ≤ 可选时间 ≤ 当前+7天
const check_time_is_available = (date) => {
  const now_time = new Date().getTime()
  const d_time = date.getTime()
  const hour_mil_sec = 60 * 60 * 1e3
  // 不到两个小时
  if (d_time - now_time < 2 * hour_mil_sec) {
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
  form.xigua_isReproduce = String(props?.localConfig?.xigua_isReproduce) || false
  form.xigua_reproduceDesc = String(props?.localConfig?.xigua_reproduceDesc) || ''
  form.xigua_activityName = String(props?.localConfig?.xigua_activityName) || ''
  form.xigua_privacyVal = props?.localConfig?.xigua_privacyVal || ''
  form.xigua_dtime = Number(props?.localConfig?.xigua_dtime)
    ? new Date(Number(props?.localConfig?.xigua_dtime))
    : ''
  form.xigua_allowDownload = props?.localConfig?.xigua_allowDownload || false
})

onMounted(() => {
  // window.ipcRenderer.receive('distribute-update-process', (info) => {})
})

onUnmounted(() => {
  // window.ipcRenderer.remove('distribute-update-process')
})
</script>

<style scoped></style>
