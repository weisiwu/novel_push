<template>
  <div id="tplBtn">
    <span @click="drawer = !drawer">模板管理</span>
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
        <el-collapse v-model="activeName" accordion>
          <el-collapse-item title="B站" name="bilibili">
            <!-- b站特有字段 -->
            <BilibiliPartTemplateModel
              :platform="platformNames.BILIBILI"
              :local-config="localConfig"
              :form="form"
            />
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
import BilibiliPartTemplateModel from './BilibiliPartTemplateModel.vue'
import 'vue-web-terminal/lib/theme/dark.css'

// 平台列表
const platformNames = {
  BILIBILI: 'bilibili'
}
const props = defineProps({ pushMessage: Function, localConfig: Object })
const drawer = ref(false)
const activeName = ref('')
const form = reactive({
  title_prefix: '',
  desc: '',
  tag: []
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
  form.tag = props?.localConfig?.tag?.split?.(',') || []
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
