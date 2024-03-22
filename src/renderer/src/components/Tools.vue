<script setup>
import { ref, defineProps, onMounted } from 'vue'

const props = defineProps({ tool: String })

const tabs = {
  video_download: 'video_download',
  video_cover: 'video_cover'
}
</script>

<template>
  <n-space>
    <n-layout v-if="props.tool === tabs.video_download">
      <n-h3 style="text-align: center"> B站/抖音视频下载 </n-h3>
      <n-divider />
      <n-input-group :style="{ margin: '0px 20%', width: '60%' }">
        <n-input size="large" placeholder="请将APP里复制的视频链接粘贴到这里" />
        <n-button size="large" :style="{ width: '120px' }" type="info"> 下载 </n-button>
      </n-input-group>
    </n-layout>
    <n-layout v-if="props.tool === tabs.video_cover">
      <n-h3 style="text-align: center"> 视频封面制作 </n-h3>
      <n-divider />
    </n-layout>
  </n-space>
</template>
