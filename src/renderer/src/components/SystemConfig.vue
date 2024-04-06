<template>
  <n-drawer
    v-model:show="active"
    :width="500"
    placement="right"
    :trap-focus="false"
    :block-scroll="false"
    @update:show="toggle"
  >
    <n-drawer-content title="快捷设置" :style="{ 'margin-top': '20px' }">
      <n-space class="actionbars">
        <n-button @click="toggle">取消</n-button>
        <n-button type="primary" @click="saveConfig">保存</n-button>
      </n-space>
      <n-space vertical>
        <n-form ref="formRef" :model="formModel" :label-width="200" :style="{ maxWidth: '640px' }">
          <n-form-item label="输入SD服务地址" path="sdBaseUrl">
            <n-input
              v-model:value="formModel.sdBaseUrl"
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
          <n-form-item label="绘图模型" path="models">
            <n-select
              v-model:value="formModel.models"
              remote
              placeholder="请选择绘画模型"
              :loading="modelLoading"
              :options="modelsOptions"
              :on-update:show="startModelsLoading"
            />
          </n-form-item>
          <n-form-item label="绘图lora" path="lora">
            <n-select
              v-model:value="formModel.lora"
              remote
              placeholder="请选择绘画lora"
              :loading="loraLoading"
              :options="loraOptions"
              :on-update:show="startLoraLoading"
            />
          </n-form-item>
          <n-form-item label="配音角色" path="voicer">
            <n-select
              v-model:value="formModel.voicer"
              placeholder="请选择配音角色"
              :options="voicerOptions"
            />
          </n-form-item>
          <n-form-item label="字幕字体" path="subfont">
            <n-select
              v-model:value="formModel.subfont"
              placeholder="请选择字幕字体"
              :options="fontsOptions"
            />
          </n-form-item>
          <n-form-item label="字幕大小" path="subfontsize">
            <n-input-number
              v-model:value="formModel.subfontsize"
              placeholder="字体大小"
              :min="20"
              :max="70"
            />
          </n-form-item>
          <n-form-item label="画面宽(500~2000)" path="HDImageWidth">
            <n-input-number
              v-model:value="formModel.HDImageWidth"
              max="2000"
              min="1"
              :show-button="false"
              placeholder="画面宽"
            >
            </n-input-number>
          </n-form-item>
          <n-form-item label="画面高(500~2000)" path="HDImageHeight">
            <n-input-number
              v-model:value="formModel.HDImageHeight"
              max="2000"
              min="1"
              :show-button="false"
              placeholder="画面高"
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
import {
  sdBaseUrl,
  loraListApi,
  modelListApi,
  getConfigApi,
  updateConfigApi
} from '../../../../resources/BaoganAiConfig.json?asset&asarUnpack'
import { voicers } from '../../../../resources/sdk/node/ms_azure_tts/chn_voice_list.json?asset&asarUnpack'
import { fonts } from '../../../../resources/sdk/node/ms_azure_tts/sub_font_list.json?asset&asarUnpack'

let readConfigModels = ''
const props = defineProps({ toggleShow: Function, updateGlobalLoading: Function })
const retryTimes = 5
const active = ref(true)
const message = useMessage()
const loraOptions = ref([])
const modelsOptions = ref([])
const voicerOptions = ref(voicers)
const fontsOptions = ref(fonts)
const loraLoading = ref(false)
const modelLoading = ref(false)
const formRef = ref(null)
const formModel = ref({
  models: '',
  lora: '',
  voicer: '',
  subfont: '',
  subfontsize: 56,
  sdBaseUrl: '',
  outputPath: '',
  HDImageWidth: 512,
  HDImageHeight: 512
})
const toggle = () => {
  props.toggleShow(active.value)
  active.value = !active.value
}
const selectFolder = () => {
  window.ipcRenderer.send('open-dialog')
}
const fetchModelList = (_retryTimes = 0) => {
  const _sdBaseUrl = sdBaseUrl.replace(/\/$/, '')
  if (!_sdBaseUrl) {
    props.updateGlobalLoading(false)
    message.error('未填写stable diffusion地址')
    return
  }
  return axios
    .get(`${_sdBaseUrl}${modelListApi}`)
    .then((result) => {
      props.updateGlobalLoading(false)
      const model_list = result?.data
      modelLoading.value = false
      if (model_list?.length) {
        modelsOptions.value =
          model_list?.map?.((model) => {
            console.log('wswTest: 获取的模型 列表', model)
            return {
              ...model,
              label: model.model_name,
              value: model.title
            }
          }) || []
        return
      }
      throw new Error('没有发现绘画模型')
    })
    .catch(() => {
      if (_retryTimes < retryTimes) {
        return fetchModelList(_retryTimes + 1)
      }
      message.error('stable diffusion地址不可用')
      props.updateGlobalLoading(false)
    })
}

const fetchLoraList = (_retryTimes = 0) => {
  const _sdBaseUrl = sdBaseUrl.replace(/\/$/, '')
  if (!_sdBaseUrl) {
    props.updateGlobalLoading(false)
    message.error('未填写stable diffusion地址')
    return
  }
  return axios
    .get(`${_sdBaseUrl}${loraListApi}`)
    .then((result) => {
      console.log('wswTest: 这些都是lora', result)
      props.updateGlobalLoading(false)
      const lora_list = result?.data
      loraLoading.value = false
      if (lora_list?.length) {
        loraOptions.value =
          lora_list?.map?.((lora) => {
            return {
              label: lora.name,
              value: lora.name
            }
          }) || []
        return
      }
      throw new Error('没有发现lora模型')
    })
    .catch(() => {
      if (_retryTimes < retryTimes) {
        return fetchLoraList(_retryTimes + 1)
      }
      message.error('stable diffusion地址不可用')
      props.updateGlobalLoading(false)
    })
}

const fetchConfigInfo = (_retryTimes = 0) => {
  const _sdBaseUrl = sdBaseUrl.replace(/\/$/, '')
  if (!_sdBaseUrl) {
    props.updateGlobalLoading(false)
    message.error('未填写stable diffusion地址')
    return
  }
  return axios
    .get(`${_sdBaseUrl}${getConfigApi}`)
    .then((result) => {
      props.updateGlobalLoading(false)
      const { sd_model_checkpoint } = result?.data || {}
      console.log('wswTest: 获取配置sd_model_checkpoint', sd_model_checkpoint)
      if (sd_model_checkpoint) {
        formModel.value.models = sd_model_checkpoint
      }
      if (loraOptions.value?.[0]) {
        formModel.value.lora = loraOptions.value[0]?.name
      }
    })
    .catch(() => {
      if (_retryTimes < retryTimes) {
        return fetchConfigInfo(_retryTimes + 1)
      }
      message.error('stable diffusion地址不可用')
      props.updateGlobalLoading(false)
    })
}

onMounted(() => {
  fetchModelList()
  fetchLoraList()
  fetchConfigInfo()
})

if (window.ipcRenderer) {
  window.ipcRenderer.receive('select-folder', (params) => {
    formModel.value.outputPath = params
  })

  // 发起读取本地配置
  window.ipcRenderer.send('fetch-config')

  window.ipcRenderer.receive('read-config', (params) => {
    try {
      const localConfig = JSON.parse(params)
      localConfig.sdBaseUrl = localConfig.sdBaseUrl.replace(/\/$/, '')
      formModel.value = localConfig
      formModel.value.subfont = localConfig.ttf
      formModel.value.subfontsize = localConfig.fontsize
      formModel.value.voicer = localConfig.azureTTSVoice
      formModel.value.lora = localConfig.lora
      formModel.value.models = localConfig.models
      readConfigModels = localConfig.models
    } catch (e) {
      console.log('wswTest: 传入的本地配置异常', params, e)
    }
  })
}

const saveConfig = () => {
  // 请求api地址去除末尾/，防止接口请求不通
  if (formModel.value?.sdBaseUrl) {
    formModel.value.sdBaseUrl = formModel.value.sdBaseUrl.replace(/\/$/, '')
  }
  // 模型发生改变时，尝试更新默认模型
  if (formModel.value.models && readConfigModels !== formModel.value.models) {
    const switchMsg = message.info(`正在切换模型为: ${formModel.value.models}`, { duration: 0 })
    axios
      .post(`${sdBaseUrl}${updateConfigApi}`, {
        sd_model_checkpoint: formModel.value.models
      })
      .then((res) => {
        console.log('wswTest: 切换模型结果是是什么', res)
        switchMsg.destroy()
        if (res.status == 200) {
          message.success(`模型成功切换为: ${formModel.value.models}`)
        } else {
          message.error('所选模型无法使用')
        }
      })
      .catch((e) => {
        console.log('wswTest: 切换模型发生错误', e)
        switchMsg.destroy()
        message.error('所选模型切换失败')
      })
  }
  window.ipcRenderer.send('save-config', JSON.stringify(formModel.value))
  message.success('修改配置保存成功！将全局生效')
  toggle()
}

const startModelsLoading = (show) => {
  modelLoading.value = show
}
const startLoraLoading = (show) => {
  loraLoading.value = show
}
</script>

<style scoped>
.actionbars {
  position: absolute;
  right: 32px;
  top: 28px;
}
</style>
