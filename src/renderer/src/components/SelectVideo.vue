<script setup>
import { ArchiveOutline } from '@vicons/ionicons5'

const props = defineProps({
  updateGlobalLoading: Function
})
const parseVideo = async (file) => {
  props.updateGlobalLoading(true)
  // 开始解析视频，切割视频需要再主进程里，所以需要通过ipc形式进行访问
  window.ipcRenderer.send(
    'start-process',
    file?.file?.file?.path || file?.fileList?.[0]?.file?.path
  )
}
</script>

<template>
  <n-upload
    multiple
    directory-dnd
    style="margin: 50px 50px; width: auto"
    :default-upload="false"
    :max="1"
    @change="parseVideo"
  >
    <n-upload-dragger>
      <div style="margin-bottom: 12px">
        <n-icon size="48" :depth="3" :component="ArchiveOutline" />
      </div>
      <n-text style="font-size: 16px"> 点击或者拖动文件到该区域来上传 </n-text>
      <n-p depth="3" style="margin: 8px 0 0 0"> 上传需要进行一键追爆款的视频 </n-p>
    </n-upload-dragger>
  </n-upload>
</template>
