<template>
  <el-form-item label="是否自制">
    <el-radio-group v-model="form.bilibili_copyright">
      <el-radio value="1">自制</el-radio>
      <el-radio value="2">转载</el-radio>
    </el-radio-group>
  </el-form-item>
  <el-form-item label="是否禁止转载">
    <el-radio-group v-model="form.bilibili_no_reprint">
      <el-radio value="0">允许</el-radio>
      <el-radio value="1">禁止</el-radio>
    </el-radio-group>
  </el-form-item>
  <el-form-item label="是否开启充电">
    <el-radio-group v-model="form.bilibili_open_elec">
      <el-radio value="0">不开启</el-radio>
      <el-radio value="1">开启</el-radio>
    </el-radio-group>
  </el-form-item>
  <!-- <el-form-item label="【待确认】bilibili_recreate">
    <el-input v-model="form.bilibili_recreate" />
  </el-form-item>
  <el-form-item label="【待确认】bilibili_no_disturbance">
    <el-input v-model="form.bilibili_no_disturbance" />
  </el-form-item>
  <el-form-item label="【待确认】bilibili_act_reserve_create">
    <el-input v-model="form.bilibili_act_reserve_create" />
  </el-form-item>
  <el-form-item label="【待确认】bilibili_dolby">
    <el-input v-model="form.bilibili_dolby" />
  </el-form-item> -->
  <el-form-item label="视频分类">
    <el-tree-select
      v-model="form.bilibili_tid"
      filterable
      placeholder="请选择视频默认分区"
      :data="bilibili_tids"
      :render-after-expand="false"
      @change="tidChange"
    />
  </el-form-item>
  <div v-loading="fetch_mission_topic_loading" element-loading-text="正在切换新分区的任务和话题">
    <el-form-item label="活动任务（请先选分类）">
      <el-select v-model="form.bilibili_mission_id" placeholder="请选择要参与的活动任务">
        <el-option
          v-for="item in missions_list"
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
    <el-form-item label="活动话题（请先选分类）">
      <el-select v-model="form.bilibili_topic_id" placeholder="请选择要参与的活动任务">
        <el-option
          v-for="item in topics_list"
          :key="item.value"
          :label="item.label"
          :value="item.value"
        >
          <span style="float: left">{{ item.label }}</span>
          <p style="float: left">{{ item.description }}</p>
        </el-option>
      </el-select>
    </el-form-item>
  </div>
</template>

<script setup>
import { ref, reactive, watchEffect, defineProps } from 'vue'
import bilibili_tids from '../../../../resources/sdk/node/platform_api/bilibili_tids.json'
import 'vue-web-terminal/lib/theme/dark.css'

const props = defineProps({ platform: String, localConfig: Object, form: Object })
const platform = props?.platform || ''
// 这些属性会被直接注入到form中
const form = props.form
const fetch_mission_topic_loading = ref(false)
const missions_list = ref([]) // 任务列表
const topics_list = ref([]) // 话题列表

// 新配置加载成功后，覆盖初始值
watchEffect(() => {
  if (!props?.localConfig) {
    return
  }
  form.bilibili_copyright = String(props?.localConfig?.bilibili_copyright) || '1'
  form.bilibili_no_reprint = String(props?.localConfig?.bilibili_no_reprint) || '1'
  form.bilibili_open_elec = String(props?.localConfig?.bilibili_open_elec) || '1'
  form.bilibili_recreate = props?.localConfig?.bilibili_recreate || ''
  form.bilibili_no_disturbance = props?.localConfig?.bilibili_no_disturbance || ''
  form.bilibili_act_reserve_create = props?.localConfig?.bilibili_act_reserve_create || ''
  form.bilibili_dolby = props?.localConfig?.bilibili_dolby || ''
  form.bilibili_tid = props?.localConfig?.bilibili_tid || ''
  form.bilibili_mission_id = props?.localConfig?.bilibili_mission_id || ''
  form.bilibili_topic_id = props?.localConfig?.bilibili_topic_id || ''
})

const tidChange = (bilibili_tid) => {
  // 获取bilibili_tid后，开始更新missions和topics
  fetch_mission_topic_loading.value = true
  window.ipcRenderer.send('distribute-fetch-mission-topic', bilibili_tid)
}

window.ipcRenderer.receive('distribute-update-process', (info) => {
  const { action } = info || {}
  let data = null

  if (action) {
    const { data: dataStr, type } = action || {}
    try {
      data = JSON.parse(dataStr) || {}
    } catch (e) {
      fetch_mission_topic_loading.value = false
      return false
    }
    if (type === 'topic') {
      topics_list.value = data
    } else if (type === 'mission') {
      missions_list.value = data
    }
    fetch_mission_topic_loading.value = false
  }
})
</script>

<style scoped></style>
