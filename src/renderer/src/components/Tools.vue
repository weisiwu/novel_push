<script setup>
const tabs = {
  DONWLOAD_VIDEO: 'DONWLOAD_VIDEO',
  TODO: 'TODO'
}
</script>

<template>
  <n-tabs type="segment" animated>
    <n-tab-pane :name="tabs.DONWLOAD_VIDEO" tab="B站/抖音视频下载">
      <n-h3 style="text-align: center"> B站/抖音视频下载 </n-h3>
      <n-divider />
      <n-input-group :style="{ margin: '0px 20%', width: '60%' }">
        <n-input size="large" placeholder="请将APP里复制的视频链接粘贴到这里" />
        <n-button size="large" :style="{ width: '120px' }" type="info"> 下载 </n-button>
      </n-input-group>
    </n-tab-pane>
    <n-tab-pane :name="tabs.TODO" tab="视频封面制作">
      <n-h3 style="text-align: center"> 视频封面制作 </n-h3>
      <n-divider />
    </n-tab-pane>
  </n-tabs>
</template>
