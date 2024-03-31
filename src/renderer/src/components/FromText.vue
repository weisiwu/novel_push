<script setup>
import { ref, defineProps } from 'vue'
import { VXETable } from 'vxe-table'
import icon from '../../../../resources/imgs/icon.png?asset'

const props = defineProps({
  updateGlobalLoading: Function,
  updateIsProcessVideo: Function
})
const speed = 200 / 60 // 每分钟说多少字
const sceneTableRef = ref('')
const charactorTableRef = ref('')
const textValue = ref('')
const showTable = ref(false)
const startLoading = ref(false)
const isDrawAndPeiyin = ref(false)
const showProgressBar = ref(false)
const exportLoading = ref(false)
const progressBarPercentage = ref(0)
const progressBarText = ref('')
// TODO:(wsw) 临时处理
// const parseTextLoading = ref(true)
const parseTextLoading = ref(false)
// 操作按钮栏状态
const actionbarStatus = {
  PARSE: 'PARSE',
  PREPARE_TO_GENERATE: 'PREPARE_TO_GENERATE',
  READY_TO_OUTPUT_VIDEO: 'READY_TO_OUTPUT_VIDEO'
}
const actionbarCurrentStatus = ref(actionbarStatus.PARSE)
const charactorsTableData = ref([])
const setencesTableData = ref([])
const getSetencesTableData = () => {
  return Array.from(setencesTableData.value)
}

/**
 * 监听传递给渲染线程的事件
 */
if (window.ipcRenderer) {
  /**
   * 文生图，有新数据返回
   */
  window.ipcRenderer.receive('texttovideo-process-update', (info) => {
    startLoading.value = false
    showTable.value = true
    const {
      type,
      sIndex = 0,
      text = '',
      tags = [],
      image = '',
      name = '',
      wav = '',
      relatedCharactor = ''
    } = info || {}
    const isCharactor = type === 'charactor'
    const isIn = isCharactor
      ? charactorsTableData?.value?.findIndex?.((info) => info.sIndex === sIndex)
      : setencesTableData?.value?.findIndex?.((info) => info.sIndex === sIndex)
    // 对表中已经存在的数据进行更新
    if (isIn >= 0) {
      if (isCharactor) {
        const newTableData = [...charactorsTableData.value]
        newTableData[isIn] = {
          name: charactorsTableData.value[isIn].name || '',
          tags: charactorsTableData.value[isIn].tags || [],
          id: sIndex,
          sIndex,
          image: image ? `${image}?t=${new Date().getTime()}` : '',
          redrawing: false
        }
        charactorsTableData.value = newTableData
      } else {
        const newTableData = [...setencesTableData.value]
        newTableData[isIn] = {
          ...setencesTableData.value[isIn],
          id: sIndex,
          sIndex,
          wav: setencesTableData.value[isIn]?.wav || wav,
          image: image ? `${image}?t=${new Date().getTime()}` : '',
          redrawing: false
        }
        setencesTableData.value = newTableData
      }

      if (setencesTableData.value.every((row) => row?.image && row?.wav)) {
        actionbarCurrentStatus.value = actionbarStatus.READY_TO_OUTPUT_VIDEO
        showProgressBar.value = false
        progressBarPercentage.value = 0
      }
      updateProcess()
      return
    }
    // 向表中添加新数据
    if (isCharactor) {
      charactorsTableData.value.push({ id: sIndex, sIndex, name, tags, image })
    } else {
      setencesTableData.value.push({
        id: sIndex,
        sIndex,
        wav,
        text,
        tags,
        image,
        relatedCharactor,
        duration: Math.max(text.length / speed, 0.1),
        move: '向上'
      })
    }
    if (setencesTableData.value.every((row) => row?.image && row?.wav)) {
      isDrawAndPeiyin.value = false
      showProgressBar.value = false
      actionbarCurrentStatus.value = actionbarStatus.READY_TO_OUTPUT_VIDEO
    }
    updateProcess()
  })
  /**
   * 导出视频进度
   */
  window.ipcRenderer.receive('export-process-update', (res) => {
    if (Number(res) === 1) {
      progressBarPercentage.value = 33.3
      progressBarText.value = '已将图片转化为视频，正在合并音频和视频'
    } else if (Number(res) === 2) {
      progressBarPercentage.value = 66.6
      progressBarText.value = '音频视频合成完毕，正在生成字幕和添加字幕'
    } else if (Number(res) === 3) {
      progressBarPercentage.value = 100
      progressBarText.value = '添加字幕完成，马上为您打开视频'
      exportLoading.value = false
      clear()
      props?.updateIsProcessVideo?.(false)
    }
  })
  /**
   * 文案解析完成，已全部解析绘图提示词
   */
  window.ipcRenderer.receive('texttovideo-parsetext-process-finish', () => {
    parseTextLoading.value = false
    showTable.value = true
    actionbarCurrentStatus.value = actionbarStatus.PREPARE_TO_GENERATE
  })
}

// 在编辑字幕后，更新字幕和对应的语音
const updateScentence = (text, row) => {
  // row.refreshing = true
  // window.ipcRenderer.send('refresh-voice', {})
  // window.ipcRenderer.receive('refresh-voice-finish', () => {
  //   row.refreshing = false
  // })
}

const clear = () => {
  textValue.value = ''
  showTable.value = false
  startLoading.value = false
  isDrawAndPeiyin.value = false
  showProgressBar.value = false
  exportLoading.value = false
  progressBarPercentage.value = 0
  progressBarText.value = ''
  parseTextLoading.value = false
  actionbarCurrentStatus.value = actionbarStatus.PARSE
  charactorsTableData.value = []
  setencesTableData.value = []
}

// 更新进度
const updateProcess = () => {
  const allData = [...charactorsTableData.value, ...setencesTableData.value]
  console.log('wswTest: allData', allData)
  const lens = allData.length
  const finishedCharactors =
    charactorsTableData.value?.filter?.((charactor) => {
      console.log('wswTest:charactor ', charactor)
      return charactor?.image
    })?.length || 0
  const finishedSentences =
    setencesTableData.value?.filter?.((sentence) => {
      console.log('wswTest: sentence', sentence)
      return sentence?.image && sentence?.wav
    })?.length || 0

  console.log('wswTest: 多个格式', finishedCharactors, finishedSentences, lens)
  const percentage = ((finishedCharactors + finishedSentences) / (lens || 1)) * 100
  progressBarPercentage.value = percentage
  progressBarText.value = `${percentage}%`
}

// 删除行
const removeCharactorRow = async (row) => {
  const $table = charactorTableRef.value
  if ($table) {
    const type = await VXETable.modal.confirm('您确定要删除该角色?')
    if (type === 'confirm') {
      $table.remove(row)
      charactorsTableData.value = [
        ...charactorsTableData.value.filter((_row) => _row.sIndex === row.sIndex)
      ]
    }
  }
}
const removeSentenceRow = async (row) => {
  const $table = sceneTableRef.value
  if ($table) {
    const type = await VXETable.modal.confirm('您确定要删除该镜头?')
    if (type === 'confirm') {
      $table.remove(row)
      setencesTableData.value = [
        ...setencesTableData.value.filter((_row) => _row.sIndex === row.sIndex)
      ]
    }
  }
}

// 重绘行
const redrawCharactorRow = async (row) => {
  row.redrawing = true
  window.ipcRenderer.send('start-redraw', {
    prompt: row.tags.join(','),
    sIndex: row.sIndex,
    type: 'charactor'
  })
}
const redrawSentenceRow = async (row) => {
  row.redrawing = true
  console.log('wswTest: 重绘图片', row)
  window.ipcRenderer.send('start-redraw', {
    prompt: row.tags.join(','),
    sIndex: row.sIndex,
    relatedCharactor: row?.relatedCharactor || ''
  })
}

// 开始解析文本
const startProcess = () => {
  startLoading.value = true
  parseTextLoading.value = true
  props?.updateIsProcessVideo?.(true)
  window.ipcRenderer.send('texttovideo-process-start', textValue.value)
}
// 开始批量生图
const startGenerate = () => {
  isDrawAndPeiyin.value = true
  showProgressBar.value = true
  window.ipcRenderer.send(
    'generate-image-audio-process-start',
    setencesTableData?.value?.map?.((row) => row?.text || '')
  )
}
const exportVideo = () => {
  exportLoading.value = true
  showProgressBar.value = true
  progressBarText.value = '正将图片合并转化为视频'
  window.ipcRenderer.send('concat-video', JSON.stringify(getSetencesTableData()))
}
</script>

<template>
  <div v-if="progressBarPercentage">
    <n-progress
      type="line"
      :height="32"
      :percentage="progressBarPercentage"
      :indicator-placement="'inside'"
      :border-radius="4"
      processing
    >
      {{ progressBarText }}
    </n-progress>
  </div>
  <n-space :style="{ margin: '20px' }">
    <!-- 文案解析前，操作按钮 -->
    <div v-if="actionbarCurrentStatus === actionbarStatus.PARSE">
      <n-button type="primary" :loading="startLoading" @click="startProcess">{{
        startLoading ? '转换中' : '开始转换'
      }}</n-button>
    </div>
    <!-- 调整完提示词，生图阶段操作按钮 -->
    <div v-if="actionbarCurrentStatus === actionbarStatus.PREPARE_TO_GENERATE">
      <n-button
        type="primary"
        :loading="isDrawAndPeiyin"
        :disabled="isDrawAndPeiyin"
        @click="startGenerate"
        >开始绘图和配音</n-button
      >
    </div>
    <!-- 整体处理完，操作按钮 -->
    <div v-if="actionbarCurrentStatus === actionbarStatus.READY_TO_OUTPUT_VIDEO">
      <n-button type="primary" :loading="exportLoading" @click="exportVideo">导出视频</n-button>
    </div>
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
    <!-- 角色表 -->
    <vxe-table
      ref="charactorTableRef"
      header-align="center"
      show-overflow
      align="center"
      :row-config="{ height: 200 }"
      :style="{ margin: '20px' }"
      :data="charactorsTableData"
    >
      <vxe-column field="name" title="角色名" align="center" width="100"></vxe-column>
      <vxe-column field="tags" title="绘图提示词" align="center">
        <template #default="{ row }">
          <n-dynamic-tags
            v-model:value="row.tags"
            :tag-style="{
              maxWidth: '120px',
              'white-space': 'nowrap',
              'text-overflow': 'ellipsis',
              overflow: 'hidden'
            }"
            :disabled="showProgressBar"
            :edit-config="{ trigger: 'click', mode: 'cell' }"
          />
        </template>
      </vxe-column>
      <vxe-column field="image" width="200" title="效果图" align="center">
        <template #default="{ row }">
          <n-spin :show="!row.image || row.redrawing" :style="{ 'text-align': 'center' }">
            <!-- // TODO:(wsw) 角色图生成的时候，换更合适的展位图 -->
            <n-image
              v-if="row.image"
              height="150"
              :fallback-src="icon"
              :src="row.image"
              :show-toolbar="false"
              lazy
            />
            <n-skeleton v-if="!row.image" :width="150" :height="100" size="medium" />
          </n-spin>
        </template>
      </vxe-column>
      <vxe-column field="action" vxe-column width="120" title="操作" align="center">
        <template #default="{ row }">
          <n-button
            :style="{ 'margin-bottom': '8px' }"
            type="primary"
            :disabled="showProgressBar"
            @click="removeCharactorRow(row)"
            >删除角色</n-button
          >
          <n-button
            type="primary"
            :disabled="showProgressBar"
            :loading="row.redrawing"
            @click="redrawCharactorRow(row)"
            >重新生成</n-button
          >
        </template>
      </vxe-column>
    </vxe-table>
    <!-- 场景/句子表 -->
    <vxe-table
      ref="sceneTableRef"
      header-align="center"
      show-overflow
      align="center"
      :row-config="{ height: 200 }"
      :style="{ margin: '20px' }"
      :data="setencesTableData"
    >
      <vxe-column type="seq" title="镜头序号" align="center" width="100"></vxe-column>
      <vxe-column field="text" title="字幕">
        <template #default="{ row }">
          <n-input
            v-model:value="row.text"
            type="textarea"
            maxlength="100"
            placeholder="字幕文案"
            :disabled="showProgressBar"
            :on-update:value="(text) => updateScentence(text, row)"
            :autosize="{ minRows: 1, maxRows: 2 }"
          >
          </n-input>
        </template>
      </vxe-column>
      <vxe-column field="tags" title="绘图提示词" align="center">
        <template #default="{ row }">
          <n-dynamic-tags
            v-model:value="row.tags"
            :tag-style="{
              maxWidth: '120px',
              'white-space': 'nowrap',
              'text-overflow': 'ellipsis',
              overflow: 'hidden'
            }"
            :disabled="showProgressBar"
            :edit-config="{ trigger: 'click', mode: 'cell' }"
          />
        </template>
      </vxe-column>
      <vxe-column field="image" width="200" title="镜头图" align="center">
        <template #default="{ row }">
          <!-- // TODO:(wsw) 展位图也换成别的 -->
          <n-spin :show="!row.image || row.redrawing" :style="{ 'text-align': 'center' }">
            <n-image
              v-if="row.image"
              height="150"
              :fallback-src="icon"
              :src="row.image"
              :show-toolbar="false"
              lazy
            />
            <n-skeleton v-if="!row.image" :width="150" :height="100" size="medium" />
          </n-spin>
        </template>
      </vxe-column>
      <vxe-column
        field="duration"
        width="90"
        title="持续时间"
        placeholder="持续时间"
        align="center"
      >
        <template #default="{ row }">
          <n-input-number
            v-model:value="row.duration"
            :step="0.1"
            :show-button="false"
            :min="0.1"
            :max="1000"
            :disabled="showProgressBar"
          />
        </template>
      </vxe-column>
      <!-- <vxe-column field="move" width="100" title="图片运动" align="center"></vxe-column> -->
      <vxe-column field="action" width="120" title="操作" align="center">
        <template #default="{ row }">
          <n-button
            :style="{ 'margin-bottom': '8px' }"
            type="primary"
            :disabled="showProgressBar"
            @click="removeSentenceRow(row)"
            >删除</n-button
          >
          <n-button
            type="primary"
            :disabled="showProgressBar"
            :loading="row.redrawing"
            @click="redrawSentenceRow(row)"
            >绘图</n-button
          >
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
.vxe-cell {
  display: flex;
  flex-wrap: wrap;
}
.n-tag__content {
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
}
</style>
