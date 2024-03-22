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
        <n-form ref="formRef" :model="formModel" :label-width="200" :style="{ maxWidth: '640px' }">
          <n-form-item label="输入SD服务地址" path="baseUrl">
            <n-input
              v-model:value="formModel.baseUrl"
              placeholder="请输入您的SD地址，如 http://localhost:7860"
            />
          </n-form-item>
          <n-form-item label="保存地址" path="outputPath">
            <n-space v-if="!formModel.outputPath">
              <n-button @click="selectFolder">请选择视频保存文件夹</n-button>
            </n-space>
            <n-space v-if="formModel.outputPath" horizontal :style="{ height: '42px' }">
              <p
                :alt="formModel.outputPath"
                :style="{
                  'line-height': '42px',
                  height: '42px',
                  width: '320px',
                  maxWidth: '320px',
                  overflow: 'hidden',
                  'white-space': 'nowrap',
                  'text-overflow': 'ellipsis'
                }"
              >
                {{ formModel.outputPath }}
              </p>
              <n-button type="primary" @click="selectFolder">重新选择</n-button>
            </n-space>
          </n-form-item>
          <n-form-item
            label-placement="left"
            label-width="90"
            label="是否去水印"
            path="skipRmWatermark"
          >
            <n-switch v-model:value="formModel.skipRmWatermark" size="large" />
          </n-form-item>
          <n-form-item label="原图相关度" path="steps">
            <n-radio-group v-model:value="formModel.cfg" name="原图相关度">
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
              v-model:value="formModel.models"
              remote
              placeholder="请选择绘画模型"
              :loading="modelLoading"
              :options="modelsOptions"
            />
          </n-form-item>
          <n-form-item label="调整视频画面大小" path="imgSize">
            <n-switch v-model:value="formModel.isOriginalSize">
              <template #checked> 保持原画面大小 </template>
              <template #unchecked> 使用下列尺寸 </template>
            </n-switch>
          </n-form-item>
          <n-form-item label="图像宽(512~2000)" path="HDImageWidth">
            <n-input-number
              v-model:value="formModel.HDImageWidth"
              max="2000"
              min="512"
              :show-button="false"
              :disabled="formModel.isOriginalSize"
              placeholder=""
            >
            </n-input-number>
          </n-form-item>
          <n-form-item label="图像高(512~2000)" path="HDImageHeight">
            <n-input-number
              v-model:value="formModel.HDImageHeight"
              max="2000"
              min="512"
              :show-button="false"
              :disabled="formModel.isOriginalSize"
              placeholder=""
            >
            </n-input-number>
          </n-form-item>
        </n-form>
      </n-space>
    </n-drawer-content>
  </n-drawer>
</template>

<script setup>
import { ref, defineProps, onMounted } from 'vue'
import { useMessage } from 'naive-ui'
import axios from 'axios'
import { baseUrl, modelListApi } from '../../../../resources/BaoganAiConfig.json?asset&asarUnpack'

const props = defineProps({ toggleShow: Function })
const CFG_SETS = [
  { value: 7, label: '低相似度' },
  { value: 14, label: '中相似度' },
  { value: 20, label: '高相似度' }
]
const active = ref(true)
const message = useMessage()
const toggle = () => {
  props.toggleShow(active.value)
  active.value = !active.value
}
const modelsOptions = ref([])
const modelLoading = ref(true)
const formRef = ref(null)
const formModel = ref({
  cfg: 14,
  steps: 25,
  baseUrl: '',
  outputPath: '',
  HDImageWidth: 512,
  HDImageHeight: 512,
  isOriginalSize: true,
  models: '',
  skipRmWatermark: false
})
const selectFolder = () => {
  window.ipcRenderer.send('open-dialog')
}

let retryTimes = 0
const fetchModelList = () => {
  return axios
    .get(`${baseUrl}${modelListApi}`)
    .then((result) => {
      const model_list = result?.data
      console.log('wswTest: model_list', model_list)
      modelLoading.value = false
      if (model_list?.length) {
        // demoValue
        // "title": "mixProV4.Cqhm.safetensors [61e23e57ea]",
        // "model_name": "mixProV4.Cqhm",
        // "hash": "61e23e57ea",
        // "sha256": "61e23e57ea13765152435b42d55e7062de188ca3234edb82d751cf52f7667d4f",
        // "filename": "/stable-diffusion-webui/models/Stable-diffusion/mixProV4.Cqhm.safetensors",
        // "config": null
        modelsOptions.value =
          model_list?.map?.((model, index) => {
            index === 0 && (formModel.value.models = model?.model_name || '')
            return {
              ...model,
              label: model.title,
              value: model.model_name
            }
          }) || []
        return
      }
      throw new Error('没有发现绘画模型')
    })
    .catch(() => {
      if (retryTimes < 3) {
        retryTimes++
        return fetchModelList()
      }
    })
}

onMounted(() => {
  // 获取模型列表
  fetchModelList()
})

if (window.ipcRenderer) {
  window.ipcRenderer.receive('select-folder', (params) => {
    console.log('wswTest: 选了的实例拉到', params)
    formModel.value.outputPath = params
  })

  // 发起读取本地配置
  window.ipcRenderer.send('fetch-config')

  window.ipcRenderer.receive('read-config', (params) => {
    console.log('wswTest: 读取本地的配置', params, typeof params)
    try {
      const localConfig = JSON.parse(params)
      formModel.value = localConfig
    } catch (e) {
      console.log('wswTest: 传入的本地配置异常', params, e)
    }
  })
}

const saveConfig = () => {
  console.log('wswTest: model', JSON.stringify(formModel.value))
  if (formModel.value?.baseUrl) {
    formModel.value.baseUrl = formModel.value.baseUrl.replace(/\/$/, '')
  }
  window.ipcRenderer.send('save-config', JSON.stringify(formModel.value))
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
