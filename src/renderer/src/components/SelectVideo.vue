<script setup>
import { defineProps } from 'vue'
import { useLoadingBar } from 'naive-ui'

const loadingBar = useLoadingBar()
const props = defineProps({ video: Object, next: Function })
const next = props.next

const parseVideo = async (file) => {
  // 开始loading效果
  loadingBar.start()
  // 开始解析视频，切割视频需要再主进程里，所以需要通过ipc形式进行访问
  window.ipcRenderer.send('cut-video', file?.file?.file?.path || file?.fileList?.[0]?.file?.path)
  window.ipcRenderer.receive('cut-video-complete', (result) => {
    // 结束loading效果(最少500ms)
    loadingBar.finish()
    next(result)
  })
}
</script>

<template>
  <n-upload
    multiple
    directory-dnd
    style="margin: 50px 50px; width: auto"
    :default-upload="false"
    action="https://www.mocky.io/v2/5e4bafc63100007100d8b70f"
    :max="1"
    @change="parseVideo"
  >
    <n-upload-dragger>
      <div style="margin-bottom: 12px">
        <n-icon size="48" :depth="3" :component="ArchiveOutline" />
      </div>
      <n-text style="font-size: 16px"> 点击或者拖动文件到该区域来上传 </n-text>
      <n-p depth="3" style="margin: 8px 0 0 0"> 上传需要进行二次创作的视频 </n-p>
    </n-upload-dragger>
  </n-upload>
</template>
