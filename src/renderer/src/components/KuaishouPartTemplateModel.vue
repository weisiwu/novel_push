<template>
  <el-form-item label="视频类型">
    <el-radio-group v-model="form.kuaishow_test">
      <el-radio :value="true">原创</el-radio>
      <el-radio :value="false">转载</el-radio>
    </el-radio-group>
  </el-form-item>
  <el-form-item v-loading="is_type_loading" label="所属领域">
    <el-tree-select
      v-model="form.kuaishow_type"
      filterable
      placeholder="请选择视频默认分区"
      :data="type_list"
      :render-after-expand="false"
    />
  </el-form-item>
  <!-- <el-form-item label="参与活动">
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
  </el-form-item> -->
</template>

<script setup>
import { ref, watchEffect, defineProps, onMounted, onUnmounted } from 'vue'
import type_list from '../../../../resources/sdk/node/platform_api/kuaishou_type_list.json'

const props = defineProps({ platform: String, localConfig: Object, form: Object })
const is_type_loading = ref(false)
const form = props.form

// 新配置加载成功后，覆盖初始值
// watchEffect(() => {
//   if (!props?.localConfig) {
//     return
//   }
//   form.xigua_isReproduce = props?.localConfig?.xigua_isReproduce || false
//   form.xigua_reproduceDesc = props?.localConfig?.xigua_reproduceDesc || ''
//   form.xigua_activityName = props?.localConfig?.xigua_activityName || ''
//   form.xigua_privacyVal = props?.localConfig?.xigua_privacyVal || ''
//   form.xigua_dtime = Number(props?.localConfig?.xigua_dtime)
//     ? new Date(Number(props?.localConfig?.xigua_dtime))
//     : ''
//   form.xigua_allowDownload = props?.localConfig?.xigua_allowDownload || false
// })

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
