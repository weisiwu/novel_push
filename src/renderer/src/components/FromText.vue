<script setup>
import { ref } from 'vue'
import { VXETable } from 'vxe-table'
import { useMessage } from 'naive-ui'
import icon from '../../../../resources/imgs/icon.png?asset'

const tableRef = ref('')
const textValue = ref('')
const message = useMessage()
// TODO:(wsw) 临时处理
// const showTable = ref(true)
const showTable = ref(false)
const startLoading = ref(false)
// TODO:(wsw) 临时处理
// const parseTextLoading = ref(true)
const parseTextLoading = ref(false)
const isVideoPhaseFinish = ref(false)
const isSubtitlePhaseFinish = ref(false)
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
const getTableData = () => {
  console.log('wswTest: 获取表格数据', tableData.value)
  return tableData.value
}

/**
 * 监听传递给渲染线程的事件
 */
if (window.ipcRenderer) {
  /**
   * 文生图，有新数据返回
   */
  window.ipcRenderer.receive('texttovideo-process-update', (info) => {
    // TODO:(wsw) 这里需要先判断下，当前这条提示词是否处理成功
    startLoading.value = false
    showTable.value = true
    tableData.value.push({
      id: 1,
      text: '中文文案中文文案中文文案中文文案',
      tags: info?.tags || [],
      image: info?.img,
      duration: 1,
      move: '向上'
    })
  })
  /**
   * 所有图片均生成完毕
   */
  window.ipcRenderer.receive('texttovideo-process-finish', (res) => {
    startLoading.value = false
    console.log('wswTest: 图片生成结果', res)
    if (res?.code === 1) {
      message.error('图片生成失败')
    } else {
      message.error('图片生成成功')
      isVideoPhaseFinish.value = true
    }
  })
  /**
   * 文案解析完成，已全部解析绘图提示词
   */
  window.ipcRenderer.receive('texttovideo-parsetext-process-finish', () => {
    parseTextLoading.value = false
    showTable.value = true
  })
}

const removeRow = async (row) => {
  const $table = tableRef.value
  if ($table) {
    const type = await VXETable.modal.confirm('您确定要删除该镜头?')
    if (type === 'confirm') {
      $table.remove(row)
    }
  }
}
const startProcess = () => {
  startLoading.value = true
  parseTextLoading.value = true
  window.ipcRenderer.send('texttovideo-process-start', textValue.value)
}
const cancelProcess = () => {}
const exportSubtitles = () => {
  getTableData()
}
const exportVideo = () => {
  getTableData()
}
/**
 * 接受更新进程返回的数据
 */
const formatTableData = () => {}
</script>

<template>
  <n-space :style="{ margin: '20px' }">
    <n-button type="primary" :loading="startLoading" @click="startProcess">{{
      startLoading ? '转换中' : '开始转换'
    }}</n-button>
    <n-button type="primary" @click="cancelProcess">停止转换</n-button>
    <n-button v-show="isVideoPhaseFinish" type="primary" @click="exportSubtitles"
      >导出字幕</n-button
    >
    <n-button v-show="isSubtitlePhaseFinish" type="primary" @click="exportVideo">导出视频</n-button>
  </n-space>
  <n-space v-if="!showTable" vertical :style="{ margin: '20px 20px 0px' }">
    <n-input
      v-model:value="textValue"
      type="textarea"
      maxlength="5000"
      :autosize="{ minRows: 2, maxRows: 50 }"
      placeholder="请输入待转换的文案"
    />
  </n-space>
  <n-spin v-if="parseTextLoading" class="parse-text-loading" :show="parseTextLoading">
    <p v-if="parseTextLoading" class="parse-text-loading-info">正在解析文案中</p>
  </n-spin>
  <div v-if="showTable">
    <vxe-table
      ref="tableRef"
      header-align="center"
      show-overflow
      :row-config="{ height: 200 }"
      :style="{ margin: '20px' }"
      :data="tableData"
    >
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
          <n-dynamic-tags
            v-model:value="row.tags"
            :tag-style="{ maxWidth: '120px', 'white-space': 'nowrap', 'text-overflow': 'ellipsis' }"
            :edit-config="{ trigger: 'click', mode: 'cell' }"
          />
        </template>
      </vxe-column>
      <vxe-column field="image" width="200" title="镜头图" align="center">
        <template #default="{ row }">
          <n-spin :show="!row.image" :style="{ 'text-align': 'center' }">
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
      <vxe-column field="duration" width="90" title="持续时间" align="center">
        <template #default="{ row }">
          <n-input-number
            v-model:value="row.duration"
            :step="0.1"
            :show-button="false"
            :min="0.1"
            :max="5"
          />
        </template>
      </vxe-column>
      <vxe-column field="move" width="100" title="图片运动" align="center"></vxe-column>
      <vxe-column field="action" width="120" title="操作" align="center">
        <template #default="{ row }">
          <n-button :style="{ 'margin-bottom': '8px' }" type="primary" @click="removeRow(row)"
            >删除</n-button
          >
          <n-button type="primary">重绘</n-button>
        </template>
      </vxe-column>
    </vxe-table>
  </div>
</template>

<style>
.parse-text-loading {
  width: 100%;
  height: 100%;
  position: absolute;
  left: 0;
  top: 0;
  display: flex;
  justify-content: center;
  align-items: center;
}
.parse-text-loading-info {
  color: red;
  font-weight: bold;
  font-size: 20px;
  margin: 100px 0 0 0;
}
</style>
