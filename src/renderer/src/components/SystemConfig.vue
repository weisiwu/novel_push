<template>
  <n-drawer
    v-model:show="active"
    :width="500"
    placement="right"
    :trap-focus="false"
    :block-scroll="false"
    @update:show="toggle"
  >
    <n-drawer-content title="软件设置" :style="{ 'margin-top': '20px' }">
      <n-space class="actionbars">
        <n-button @click="toggle">取消</n-button>
        <n-button type="primary" @click="saveConfig">保存</n-button>
      </n-space>
      <n-space vertical>
        <n-form ref="formRef" :model="model" :label-width="200" :style="{ maxWidth: '640px' }">
          <n-form-item label="保存地址" path="savePath">
            <n-space v-if="!model.savePath">
              <n-button @click="selectFolder">请选择视频保存文件夹</n-button>
            </n-space>
            <n-space v-if="model.savePath" horizontal :style="{ height: '42px' }">
              <p
                :alt="model.savePath"
                :style="{
                  'line-height': '42px',
                  height: '42px',
                  width: '335px',
                  maxWidth: '335px',
                  overflow: 'hidden',
                  'white-space': 'nowrap',
                  'text-overflow': 'ellipsis'
                }"
              >
                {{ model.savePath }}
              </p>
              <n-button type="primary" @click="selectFolder">重新选择</n-button>
            </n-space>
          </n-form-item>
          <n-form-item label="原图相关度" path="steps">
            <n-radio-group v-model:value="model.cfg" name="原图相关度">
              <n-radio-button
                v-for="cfg in CFG_SETS"
                :key="cfg.value"
                :value="cfg.value"
                :label="cfg.label"
              />
            </n-radio-group>
          </n-form-item>
          <n-form-item label="绘图模型" path="models">
            <n-select
              v-model:value="model.models"
              placeholder="请选择绘画模型"
              :options="modelsOptions"
            />
          </n-form-item>
        </n-form>
      </n-space>
    </n-drawer-content>
  </n-drawer>
</template>

<script setup>
import { ref, defineProps } from 'vue'
import { useMessage } from 'naive-ui'

const props = defineProps({ toggleShow: Function })

const CFG_SETS = [
  { value: 0.8, label: '低相似度' },
  { value: 0.5, label: '中相似度' },
  { value: 0.3, label: '高相似度' }
]
const active = ref(true)
const message = useMessage()
const toggle = () => {
  props.toggleShow(active.value)
  active.value = !active.value
}
const modelsOptions = [
  { label: '动漫风', value: 'Anime_Model' },
  { label: '写实系', value: 'Real_Model' },
  { label: '赛博朋克', value: 'CyberPunk_Model' }
]
const formRef = ref(null)
const model = ref({
  steps: 25,
  cfg: 0.5,
  model: 'Anime_Model',
  savePath: ''
})
const selectFolder = () => {
  window.ipcRenderer.send('open-dialog')
}

window.ipcRenderer.receive('select-folder', (params) => {
  console.log('wswTest: 选了的实例拉到', params)
  model.value.savePath = params
})

const saveConfig = () => {
  console.log('wswTest: model', model.value)
  message.success('修改配置保存成功！将全局生效')
  toggle()
}
</script>

<style scoped>
.actionbars {
  position: absolute;
  right: 32px;
  top: 28px;
}
</style>
