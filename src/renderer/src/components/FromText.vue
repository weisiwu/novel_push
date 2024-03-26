<script setup>
import { ref } from 'vue'
import icon from '../../../../resources/imgs/icon.png?asset'

const textValue = ref('')
// TODO:(wsw) 临时处理
// const showTable = ref(true)
const showTable = ref(false)
const startLoading = ref(false)
const parseTextLoading = ref(false)
const startProcess = () => {
  startLoading.value = true
  parseTextLoading.value = true
  window.ipcRenderer.send('start-process-texttovideo', textValue.value)
}
if (window.ipcRenderer) {
  window.ipcRenderer.receive('finish-process-texttovideo', (imgs) => {
    startLoading.value = false
    showTable.value = true
    if (imgs?.length) {
      tableData.value = imgs.map((img, index) => {
        return {
          id: index + 1,
          text: '中文文案中文文案中文文案中文文案',
          tags: ['tagA', 'tagB', 'tagC', 'tagD'],
          image: img,
          duration: 1,
          move: '向上'
        }
      })
    }
  })
  window.ipcRenderer.receive('text-parse-finish', () => {
    parseTextLoading.value = false
  })
}
const cancelProcess = () => {}
const tableData = ref([
  // {
  //   id: 1,
  //   text: '中文文案中文文案中文文案中文文案',
  //   tags: ['tagA', 'tagB', 'tagC', 'tagD'],
  //   image: 'xxx',
  //   duration: 1,
  //   move: '向上'
  // },
  // {
  //   id: 2,
  //   text: '中文文案中文文案中文文案中文文案',
  //   tags: ['tagA', 'tagB', 'tagC', 'tagD'],
  //   image: 'xxx',
  //   duration: 1,
  //   move: '向下'
  // },
  // {
  //   id: 3,
  //   text: '中文文案中文文案中文文案中文文案',
  //   tags: ['tagA', 'tagB', 'tagC', 'tagD'],
  //   image: 'xxx',
  //   duration: 1,
  //   move: '向左'
  // }
])
</script>

<template>
  <n-space :style="{ margin: '20px' }">
    <n-button type="primary" :loading="startLoading" @click="startProcess">{{
      startLoading ? '转换中' : '开始转换'
    }}</n-button>
    <n-button type="primary" @click="cancelProcess">停止转换</n-button>
  </n-space>
  <n-spin v-if="!showTable" :show="parseTextLoading">
    <n-space vertical :style="{ margin: '20px 20px 0px' }">
      <n-input
        v-model:value="textValue"
        type="textarea"
        maxlength="5000"
        :autosize="{ minRows: 2, maxRows: 50 }"
        placeholder="请输入待转换的文案"
      />
      <p v-if="parseTextLoading">正在解析文案中</p>
    </n-space>
  </n-spin>
  <div v-if="showTable">
    <vxe-table header-align="center" :style="{ margin: '20px' }" :data="tableData">
      <vxe-column type="seq" title="镜头序号" align="center" width="100"></vxe-column>
      <vxe-column field="text" title="文本">
        <template #default="{ row }">
          <n-input
            v-model:value="row.text"
            type="textarea"
            maxlength="100"
            placeholder="文案"
            :autosize="{ minRows: 1, maxRows: 2 }"
          >
          </n-input>
        </template>
      </vxe-column>
      <vxe-column field="tags" title="绘图提示词" align="center">
        <template #default="{ row }">
          <n-dynamic-tags v-model:value="row.tags" />
        </template>
      </vxe-column>
      <vxe-column field="image" width="200" title="镜头图" align="center">
        <template #default="{ row }">
          <n-spin :style="{ 'text-align': 'center' }">
            <n-image
              :src="row.image"
              width="100"
              height="100"
              :fallback-src="icon"
              show-toolbar="false"
              lazy
            />
          </n-spin>
        </template>
      </vxe-column>
      <vxe-column field="duration" width="90" title="持续时间" align="center"></vxe-column>
      <vxe-column field="move" width="100" title="图片运动" align="center"></vxe-column>
      <vxe-column field="action" width="120" title="操作" align="center">
        <n-button :style="{ 'margin-bottom': '8px' }" type="primary">删除</n-button>
        <n-button type="primary">重绘</n-button>
      </vxe-column>
    </vxe-table>
  </div>
</template>
