<template>
  <div id="tplBtn">
    <span @click="drawer = !drawer">查看模板</span>
  </div>
  <el-drawer v-model="drawer" size="90%" direction="btt" :before-close="handleTemplateModelClose">
    <template #header>
      <h4>视频信息模板</h4>
    </template>
    <template #default>
      <el-form id="templateModel" :model="form" label-width="auto" label-position="top">
        <el-form-item label="标题前缀">
          <el-input v-model="form.title_prefix" placeholder="投稿标题的统一前缀，非必填" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.desc" placeholder="投稿描述" />
        </el-form-item>
        <el-collapse v-model="activeName" accordion>
          <el-collapse-item title="B站" name="bilibili">
            <el-form-item label="是否自制">
              <el-radio-group v-model="form.copyright">
                <el-radio value="1">自制</el-radio>
                <el-radio value="2">转载</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="是否禁止转载">
              <el-radio-group v-model="form.no_reprint">
                <el-radio value="0">允许</el-radio>
                <el-radio value="1">禁止</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="是否开启充电">
              <el-radio-group v-model="form.open_elec">
                <el-radio value="0">不开启</el-radio>
                <el-radio value="1">开启</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="【待确认】recreate">
              <el-input v-model="form.recreate" />
            </el-form-item>
            <el-form-item label="【待确认】no_disturbance">
              <el-input v-model="form.no_disturbance" />
            </el-form-item>
            <el-form-item label="【待确认】act_reserve_create">
              <el-input v-model="form.act_reserve_create" />
            </el-form-item>
            <el-form-item label="【待确认】dolby">
              <el-input v-model="form.dolby" />
            </el-form-item>
            <el-form-item label="视频标签">
              <el-tag
                v-for="tag in form.tag"
                :key="tag"
                v-model="form.tag"
                closable
                :disable-transitions="false"
                @close="delete_tag(tag)"
              >
                {{ tag }}
              </el-tag>
              <el-input
                v-if="add_tag_input_visible"
                ref="add_tag_input_ref"
                v-model="add_tag_input_val"
                class="w-20"
                size="small"
                @keyup.enter="add_tag"
                @blur="add_tag"
              />
              <el-button v-else class="button-new-tag" size="small" @click="show_add_tag_btn">
                添加标签
              </el-button>
            </el-form-item>
            <el-form-item label="视频分类">
              <el-input v-model="form.tid" />
            </el-form-item>
            <el-form-item label="活动任务">
              <el-input v-model="form.mission_id" />
            </el-form-item>
            <el-form-item label="活动话题">
              <el-input v-model="form.topic_id" />
            </el-form-item>
          </el-collapse-item>
        </el-collapse>
      </el-form>
    </template>
    <template #footer>
      <div style="flex: auto">
        <el-button @click="handleTemplateModelCancel">取消</el-button>
        <el-button type="primary" @click="handleTemplateModelConfirm">保存</el-button>
      </div>
    </template>
  </el-drawer>
</template>

<script setup>
import { ref, reactive, watchEffect, nextTick, defineProps } from 'vue'
import { ElLoading, ElInput, ElMessageBox } from 'element-plus'
import 'vue-web-terminal/lib/theme/dark.css'

const props = defineProps({ pushMessage: Function, localConfig: Object })
const localConfig = props?.localConfig || {}
const platformNames = ['bilibili']
// TODO:(wsw) 临时测四，将drawer显示
// const drawer = ref(true)
const drawer = ref(false)
// TODO:(wsw) 临时测试
const activeName = ref(platformNames[0])
// const activeName = ref('')
const form = reactive({
  title_prefix: '',
  desc: '',
  copyright: '1',
  no_reprint: '1',
  open_elec: '1',
  // TODO:(wsw) 待确认字段
  recreate: '',
  no_disturbance: '',
  act_reserve_create: '',
  dolby: '',
  tag: [],
  // TODO:(wsw) 假值
  tid: 168,
  mission_id: 4011933,
  topic_id: 99191
})

const add_tag_input_val = ref('')
const add_tag_input_visible = ref(false)
const add_tag_input_ref = ref()

// 删除标签
const delete_tag = (tag) => {
  form.tag?.splice?.(form.tag?.indexOf?.(tag), 1)
}

// 添加标签
const add_tag = () => {
  if (form.tag && add_tag_input_val.value) {
    form.tag.push(add_tag_input_val.value)
  }
  add_tag_input_visible.value = false
  add_tag_input_val.value = ''
}

// 展示添加标签按钮
const show_add_tag_btn = () => {
  add_tag_input_visible.value = true
  nextTick(() => {
    add_tag_input_ref.value?.input?.focus?.()
  })
}

const handleTemplateModelClose = (done) => {
  ElMessageBox.confirm('将要离开编辑模板，是否保存修改?', '注意', {
    confirmButtonText: '保存',
    cancelButtonText: '不保存'
  })
    .then((select) => {
      if (select === 'confirm') {
        handleTemplateModelConfirm()
      }
      done()
    })
    .catch(() => done())
}

const handleTemplateModelCancel = () => {
  drawer.value = false
}

// 新配置加载成功后，覆盖初始值
watchEffect(() => {
  if (!props?.localConfig) {
    return
  }
  form.title_prefix = props?.localConfig?.title_prefix || ''
  form.desc = props?.localConfig?.desc || ''
  form.copyright = String(props?.localConfig?.copyright) || '1'
  form.no_reprint = String(props?.localConfig?.no_reprint) || '1'
  form.open_elec = String(props?.localConfig?.open_elec) || '1'
  form.recreate = props?.localConfig?.recreate || ''
  form.no_disturbance = props?.localConfig?.no_disturbance || ''
  form.act_reserve_create = props?.localConfig?.act_reserve_create || ''
  form.dolby = props?.localConfig?.dolby || ''
  form.tag = props?.localConfig?.tag?.split?.(',') || []
  form.tid = props?.localConfig?.tid || 168
  form.mission_id = props?.localConfig?.mission_id || 4011933
  form.topic_id = props?.localConfig?.topic_id || 99191
})

/**
 * 保存视频模板数据，填写到本地文件保存
 */
const handleTemplateModelConfirm = () => {
  const globalLoadingIns = ElLoading.service({ fullscreen: true })
  drawer.value = false
  // 对外通知消息
  window.ipcRenderer.send('distribute-save-tpl-model', JSON.stringify(form))
  props?.pushMessage?.({
    content: `[${new Date().toLocaleString()}]视频模板信息已更新`,
    class: 'success'
  })
  setTimeout(() => globalLoadingIns.close(), 300)
}
</script>

<style scoped>
#tplBtn {
  position: fixed;
  top: 10%;
  right: 0px;
  margin-top: -50px;
  width: 50px;
  height: 100px;
  background-color: transparent;
  z-index: 999;
  span {
    display: inline-block;
    font-size: 16px;
    font-weight: bold;
    padding: 10px 19px;
    border-radius: 5px 0px 0px 5px;
    background: #409eff;
    color: rgba(255, 255, 255, 0.8);
    cursor: pointer;
  }
  span:hover {
    color: #fff;
  }
}
</style>
