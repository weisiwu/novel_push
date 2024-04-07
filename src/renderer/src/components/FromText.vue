<script setup>
import { ref, defineProps } from 'vue'
import { useMessage } from 'naive-ui'
import { VXETable } from 'vxe-table'
import waitforgeneratelogo from '../../public/logos/wait_for_generate.svg?asset'
import generatefaillogo from '../../public/logos/generate_fail.png?asset'

const props = defineProps({
  updateGlobalLoading: Function,
  updateIsProcessVideo: Function
})
const message = useMessage()
const sceneTableRef = ref('')
const charactorTableRef = ref('')
const textValue = ref('')
const showTable = ref(false)
const startLoading = ref(false)
const isDrawAndPeiyin = ref(false)
const showProgressBar = ref(false)
const parseTextProcessing = ref(false)
const amplifyHDLoading = ref(false)
const exportLoading = ref(false)
const cancelLoading = ref(false)
const progressBarPercentage = ref(0)
const progressBarText = ref('')
const parseTextLoading = ref(false)
// 操作按钮栏状态
const actionbarStatus = {
  PARSE: 'PARSE', // 智能解析文本
  PREPARE_TO_GENERATE: 'PREPARE_TO_GENERATE', // 准备生成物料
  AMPLIFY_TO_HD: 'AMPLIFY_TO_HD', // 高清放大图片
  READY_TO_OUTPUT_VIDEO: 'READY_TO_OUTPUT_VIDEO' // 导出视频
}
const actionbarCurrentStatus = ref(actionbarStatus.PARSE)
const charactorsTableData = ref([])
const setencesTableData = ref([])
const getSetencesTableData = () => {
  return Array.from(setencesTableData.value)
}
/**
 * 选择备选图
 */
const selectImg = (img, row) => {
  console.log('wswTest: 选择备选图', img, row)
  const curImg = row.image
  const curRestImgs = row.restImgs || []
  row.image = img
  row.restImgs = curRestImgs.map((_img) => (_img === img ? curImg : _img))
  console.log('wswTest: 修改后的效果', row.restImgs)
}

/**
 * 监听传递给渲染线程的事件
 */
if (window.ipcRenderer) {
  /**
   * 文生图，有新数据返回
   */
  window.ipcRenderer.receive('texttovideo-process-update', (info) => {
    // 有返回就停止loading
    parseTextLoading.value = false
    // 如果文章解析错误，直接返回到最开始，toast给用户，让用户自己出发重试
    if (info?.type === 'parse_text_error') {
      startLoading.value = false
      showTable.value = false
      props?.updateIsProcessVideo?.(false)
      message.error('解析文本失败，请重试，如连续失败，请在群里反馈~')
      return
    }
    showTable.value = true
    // type: charactor/sentence 为绘制人物和绘制句子两种绘图人物
    const {
      type,
      sIndex = 0,
      text = '',
      tags = '',
      name = '',
      HDImage = '',
      restImgs = [],
      wav = '',
      relatedCharactor = ''
    } = info || {}
    let image = info?.image || ''
    const isCharactor = type === 'charactor'
    const isSentence = type === 'sentence'
    const iswav = type === 'generate_wav'
    const isAmplifyToHD = type === 'amplify_to_hd'
    // 只要不是人物的任务，就都放到场景中
    const isIn = isCharactor
      ? charactorsTableData?.value?.findIndex?.((info) => info.sIndex === sIndex)
      : setencesTableData?.value?.findIndex?.((info) => info.sIndex === sIndex)

    console.log('wswTest: 收到的信息是什么', isCharactor && '是角色', isSentence && '是场景', info)
    let disabledPreview = false
    if (isCharactor || isSentence) {
      // 绘图的时候，返回的错误图地址统一处理
      disabledPreview = image === 'error_img' || !image
      image = image === 'error_img' ? generatefaillogo : image
    }
    // 人物角色绘图
    if (isCharactor) {
      const updateIndex = isIn >= 0 ? isIn : charactorsTableData.value.length
      const newTableData = [...charactorsTableData.value]
      newTableData[updateIndex] = {
        name: name || charactorsTableData.value?.[updateIndex]?.name || '',
        tags: tags || charactorsTableData.value?.[updateIndex]?.tags || '',
        id: sIndex,
        sIndex,
        text: text || charactorsTableData.value?.[updateIndex]?.text,
        image: isIn >= 0 ? (image ? `${image}?t=${new Date().getTime()}` : '') : image,
        restImgs: restImgs || [],
        redrawing: false,
        disabledPreview
      }
      charactorsTableData.value = newTableData
    } else if (isSentence) {
      // 场景绘图
      const updateIndex = isIn >= 0 ? isIn : setencesTableData.value.length
      const newTableData = [...setencesTableData.value]
      newTableData[updateIndex] = {
        ...setencesTableData.value?.[updateIndex],
        id: sIndex,
        sIndex,
        wav: wav || setencesTableData.value?.[updateIndex]?.wav,
        tags: tags || charactorsTableData.value?.[updateIndex]?.tags || '',
        image: isIn >= 0 ? (image ? `${image}?t=${new Date().getTime()}` : '') : image,
        restImgs,
        text: text || setencesTableData.value?.[updateIndex]?.text,
        relatedCharactor:
          relatedCharactor || setencesTableData.value?.[updateIndex]?.relatedCharactor,
        redrawing: false,
        disabledPreview
      }
      setencesTableData.value = newTableData
    } else if (iswav) {
      // 场景配音
      const updateIndex = isIn >= 0 ? isIn : setencesTableData.value.length
      const newTableData = [...setencesTableData.value]
      newTableData[updateIndex] = {
        ...setencesTableData.value?.[updateIndex],
        wav: wav || setencesTableData.value?.[updateIndex]?.wav
      }
      setencesTableData.value = newTableData
    } else if (isAmplifyToHD) {
      // 高清放大
      const updateIndex = isIn >= 0 ? isIn : setencesTableData.value.length
      const newTableData = [...setencesTableData.value]
      newTableData[updateIndex] = {
        ...setencesTableData.value?.[updateIndex],
        redrawing: false,
        HDImage: HDImage || setencesTableData.value?.[updateIndex]?.HDImage || ''
      }
      setencesTableData.value = newTableData
    }

    updateProcess()
  })
  /**
   * 导出视频进度
   */
  window.ipcRenderer.receive('export-process-update', (res) => {
    if (Number(res) === 1) {
      progressBarPercentage.value = 25
      progressBarText.value = '已将图片转化为视频，正在合并音频和视频'
    } else if (Number(res) === 2) {
      progressBarPercentage.value = 50
      progressBarText.value = '已将图片转化为视频，正在合并音频和视频'
    } else if (Number(res) === 3) {
      progressBarPercentage.value = 75
      progressBarText.value = '音频视频合成完毕，正在生成字幕和添加字幕'
    } else if (Number(res) === 4) {
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
    if (!charactorsTableData.value.length && !setencesTableData.value.length) {
      clear()
      message.error('未解析出场景或人物，请重试')
      return
    }
    startLoading.value = false
    parseTextLoading.value = false
    showTable.value = true
    parseTextProcessing.value = false
    actionbarCurrentStatus.value = actionbarStatus.PREPARE_TO_GENERATE
  })
  /**
   * 取消导出
   */
  window.ipcRenderer.receive('cancel-process-finish', (res) => {
    exportLoading.value = false
  })
}

const clear = () => {
  textValue.value = ''
  showTable.value = false
  startLoading.value = false
  isDrawAndPeiyin.value = false
  showProgressBar.value = false
  amplifyHDLoading.value = false
  exportLoading.value = false
  cancelLoading.value = false
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
  console.log('wswTest: 所有数据都有什么====>', allData)
  // console.log('wswTest: allData', allData)
  const lens = allData.length
  const finishedCharactors =
    charactorsTableData.value?.filter?.((charactor) => {
      // console.log('wswTest:charactor ', charactor.image)
      return charactor?.image && charactor?.image?.includes?.(generatefaillogo) >= 0
    })?.length || 0
  const finishedSentences =
    setencesTableData.value?.filter?.((sentence) => {
      // console.log('wswTest: sentence', sentence.image)
      return sentence?.image && sentence?.wav && sentence?.image?.includes?.(generatefaillogo) >= 0
    })?.length || 0

  // console.log('wswTest: 多个格式', finishedCharactors, finishedSentences, lens)
  const percentage = ((finishedCharactors + finishedSentences) / (lens || 1)) * 100
  progressBarPercentage.value = percentage.toFixed(2)
  progressBarText.value = `${progressBarPercentage.value}%`

  if (
    setencesTableData.value.every((row) => row?.image && row?.wav) &&
    setencesTableData.value.length > 0
  ) {
    isDrawAndPeiyin.value = false
    showProgressBar.value = false
    actionbarCurrentStatus.value = actionbarStatus.AMPLIFY_TO_HD
    // 如果是高清放大进度，则要另外计算(中间出现了高清图，则开始计算进度)
    if (setencesTableData.value.some((row) => row?.HDImage)) {
      const finishedSentences =
        setencesTableData.value?.filter?.((sentence) => sentence?.HDImage)?.length || 0
      const sentencesLen = setencesTableData.value.length || 1
      const percentage = (finishedSentences / sentencesLen) * 100
      progressBarPercentage.value = percentage.toFixed(2)
      progressBarText.value = `${progressBarPercentage.value}%`
      // 高清放大结束
      if (setencesTableData.value.every((row) => row?.HDImage)) {
        amplifyHDLoading.value = false
        progressBarPercentage.value = 0
        actionbarCurrentStatus.value = actionbarStatus.READY_TO_OUTPUT_VIDEO
      }
    } else {
      progressBarPercentage.value = 0
    }
  }
}

// 删除行
const removeCharactorRow = async (row) => {
  const $table = charactorTableRef.value
  if ($table) {
    const type = await VXETable.modal.confirm('您确定要删除该角色?')
    if (type === 'confirm') {
      $table.remove(row)
      charactorsTableData.value = [
        ...charactorsTableData.value.filter((_row) => _row.sIndex !== row.sIndex)
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
        ...setencesTableData.value.filter((_row) => _row.sIndex !== row.sIndex)
      ]
    }
  }
}

// 重绘行
const redrawCharactorRow = async (row) => {
  row.redrawing = true
  window.ipcRenderer.send('start-redraw', {
    prompt: row.tags,
    sIndex: row.sIndex,
    type: 'charactor',
    name: row?.name || ''
  })
}
const redrawSentenceRow = async (row) => {
  row.redrawing = true
  console.log('wswTest: 重绘图片', row)
  window.ipcRenderer.send('start-redraw', {
    prompt: row.tags,
    sIndex: row.sIndex,
    relatedCharactor: row?.relatedCharactor || ''
  })
}

const reAmplifySentenceRow = async (row) => {
  row.redrawing = true
  window.ipcRenderer.send('start-redraw', {
    prompt: row.tags,
    sIndex: row.sIndex,
    isHd: true,
    image: row?.image,
    relatedCharactor: row?.relatedCharactor || ''
  })
}

// 开始解析文本
const startProcess = () => {
  startLoading.value = true
  parseTextLoading.value = true
  parseTextProcessing.value = true
  props?.updateIsProcessVideo?.(true)
  window.ipcRenderer.send('texttovideo-process-start', textValue.value)
}
/**
 * 开始批量生图
 * 自动完成表中没有完成绘图和配音
 */
const startGenerate = () => {
  isDrawAndPeiyin.value = true
  showProgressBar.value = true
  window.ipcRenderer.send(
    'generate-image-audio-process-start',
    // TODO:(wsw) 这里已经生成过的都不再生成
    setencesTableData?.value?.map?.((row) => row?.text || '')
  )
}
const amplifyToHD = () => {
  // 开始对图片进行放大
  const allSentenceFinished = setencesTableData.value.every(
    (row) =>
      row?.wav &&
      row?.image &&
      !row?.image?.includes?.(waitforgeneratelogo) &&
      !row?.image?.includes?.(generatefaillogo)
  )
  if (!allSentenceFinished) {
    message.error('表格中有未生成的图，请重新生成后再高清放大')
    return
  }
  amplifyHDLoading.value = true
  showProgressBar.value = true
  progressBarText.value = '正对所有场景图片进行高清放大'
  setencesTableData.value = setencesTableData.value.map((row) => ({ ...row, redrawing: true }))
  window.ipcRenderer.send('amplify-to-hd', JSON.stringify(getSetencesTableData()))
}

const exportVideo = () => {
  // 在开始导出前，先判断图片和对应的音频是否成功生成
  const allCharactorFinished = charactorsTableData.value.every((row) => row?.image)
  const allSentenceFinished = setencesTableData.value.every(
    (row) =>
      row?.image &&
      row?.wav &&
      !row?.image?.includes?.(waitforgeneratelogo) &&
      !row?.image?.includes?.(generatefaillogo)
  )
  if (!allCharactorFinished || !allSentenceFinished) {
    message.error('表格中有未生成的图，请重新生成后再导出视频')
    return
  }
  amplifyHDLoading.value = false
  exportLoading.value = true
  showProgressBar.value = true
  progressBarText.value = '正将图片合并转化为视频'
  console.log('wswTest: 转换的数据是什么', getSetencesTableData())
  window.ipcRenderer.send('concat-video', JSON.stringify(getSetencesTableData()))
}

// 'cancel-process-start',
// 'cancel-process-finish'
// 取消正在处理的结果，返回最开始
const cancelProcess = () => {
  cancelLoading.value = true
  progressBarPercentage.value = 0
  showProgressBar.value = false
  window.ipcRenderer.send('cancel-process-start')
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
        startLoading ? '文章解析中' : '开始解析文章'
      }}</n-button>
    </div>
    <!-- 调整完提示词，生图阶段操作按钮 -->
    <div v-if="actionbarCurrentStatus === actionbarStatus.PREPARE_TO_GENERATE">
      <n-button
        type="primary"
        :loading="isDrawAndPeiyin"
        :disabled="isDrawAndPeiyin"
        @click="startGenerate"
        >点我:自动绘制分镜和配音</n-button
      >
    </div>
    <!-- 开始高清放大 -->
    <div v-if="actionbarCurrentStatus === actionbarStatus.AMPLIFY_TO_HD">
      <n-button type="primary" :loading="amplifyHDLoading" @click="amplifyToHD"
        >点我:高清放大所有分镜</n-button
      >
    </div>
    <!-- 整体处理完，操作按钮 -->
    <div v-if="actionbarCurrentStatus === actionbarStatus.READY_TO_OUTPUT_VIDEO">
      <n-button type="primary" :loading="exportLoading" @click="exportVideo"
        >点我:导出视频</n-button
      >
    </div>
    <!-- 整体处理完，操作按钮 -->
    <div v-if="actionbarCurrentStatus === actionbarStatus.READY_TO_OUTPUT_VIDEO && exportLoading">
      <n-button type="primary" :loading="cancelLoading" @click="cancelProcess">取消</n-button>
    </div>
  </n-space>
  <n-space v-if="!showTable" vertical :style="{ margin: '20px 20px 0px' }">
    <n-input
      v-model:value="textValue"
      type="textarea"
      maxlength="5000"
      :autosize="{ minRows: 5, maxRows: 50 }"
      placeholder="请输入待转换的文案"
    />
  </n-space>
  <n-spin v-if="parseTextLoading" class="parse-text-loading" :show="parseTextLoading">
    <p class="parse-text-loading-info">正在解析文案中</p>
  </n-spin>
  <div v-if="showTable">
    <!-- 角色表 -->
    <vxe-table
      v-if="
        [actionbarStatus.PREPARE_TO_GENERATE, actionbarStatus.AMPLIFY_TO_HD].includes(
          actionbarCurrentStatus
        ) && !amplifyHDLoading
      "
      ref="charactorTableRef"
      show-overflow
      align="center"
      :column-config="{ resizable: true }"
      :row-config="{ height: 200, isHover: true }"
      :style="{ margin: '20px' }"
      :data="charactorsTableData"
      :edit-config="{ trigger: 'click', mode: 'cell' }"
    >
      <vxe-column field="name" title="角色名" width="100"></vxe-column>
      <vxe-column field="tags" title="绘图提示词">
        <template #default="{ row }">
          <n-input
            v-model:value="row.tags"
            type="textarea"
            maxlength="100"
            placeholder="绘图提示词"
            :disabled="showProgressBar"
            :autosize="{ minRows: 1, maxRows: 7 }"
          >
          </n-input>
        </template>
      </vxe-column>
      <vxe-column field="image" width="300" title="角色效果">
        <template #default="{ row }">
          <n-spin :show="row.redrawing" :style="{ 'text-align': 'center' }">
            <n-image
              :width="
                !row.image ||
                row.image?.includes?.(waitforgeneratelogo) ||
                row.image?.includes?.(generatefaillogo)
                  ? 200
                  : 300
              "
              :object-fit="fill"
              :fallback-src="generatefaillogo"
              :preview-disabled="!row.image"
              :src="row.image || waitforgeneratelogo"
              :show-toolbar="false"
              lazy
            />
          </n-spin>
        </template>
      </vxe-column>
      <vxe-column field="image" width="300" title="可选角色效果">
        <template #default="{ row }">
          <div :style="{ display: 'flex', 'flex-wrap': 'wrap' }">
            <n-image
              v-for="img in row.restImgs"
              :key="img"
              :object-fit="contain"
              height="80"
              :preview-disabled="img"
              :fallback-src="generatefaillogo"
              :src="img || waitforgeneratelogo"
              :show-toolbar="false"
              lazy
              @click="selectImg(img, row)"
            />
            <n-skeleton v-if="!row.restImgs?.length" :width="150" :height="100" size="medium" />
          </div>
        </template>
      </vxe-column>
      <vxe-column field="action" vxe-column width="120" title="操作">
        <template #default="{ row }">
          <div :style="{ display: 'flex', 'flex-direction': 'column' }">
            <n-button
              :style="{ 'margin-bottom': '8px' }"
              type="primary"
              :disabled="showProgressBar"
              @click="removeCharactorRow(row)"
              >删除</n-button
            >
            <n-button
              type="primary"
              :disabled="showProgressBar"
              :loading="row.redrawing"
              @click="redrawCharactorRow(row)"
              >绘图</n-button
            >
          </div>
        </template>
      </vxe-column>
    </vxe-table>
    <!-- 场景/句子表 -->
    <vxe-table
      ref="sceneTableRef"
      align="center"
      show-overflow
      :column-config="{ resizable: true }"
      :row-config="{ height: 200, isHover: true }"
      :style="{ margin: '20px' }"
      :data="setencesTableData"
      :edit-config="{ trigger: 'click', mode: 'cell' }"
    >
      <vxe-column type="seq" title="镜头序号" width="100"></vxe-column>
      <vxe-column field="text" title="字幕">
        <template #default="{ row }">
          <n-input
            v-model:value="row.text"
            type="textarea"
            maxlength="100"
            placeholder="字幕文案"
            :disabled="
              showProgressBar || actionbarCurrentStatus !== actionbarStatus.PREPARE_TO_GENERATE
            "
            :on-update:value="(text) => updateScentence(text, row)"
            :autosize="{ minRows: 1, maxRows: 7 }"
          >
          </n-input>
        </template>
      </vxe-column>
      <vxe-column field="tags" title="绘图提示词">
        <template #default="{ row }">
          <n-input
            v-model:value="row.tags"
            type="textarea"
            maxlength="100"
            placeholder="绘图提示词"
            :disabled="
              showProgressBar || actionbarCurrentStatus !== actionbarStatus.PREPARE_TO_GENERATE
            "
            :autosize="{ minRows: 1, maxRows: 7 }"
          >
          </n-input>
        </template>
      </vxe-column>
      <vxe-column field="image" width="300" title="镜头图">
        <template #default="{ row }">
          <n-spin :show="row.redrawing" :style="{ 'text-align': 'center' }">
            <n-image
              :width="
                !row.image ||
                row.image?.includes?.(waitforgeneratelogo) ||
                row.image?.includes?.(generatefaillogo)
                  ? 200
                  : 300
              "
              :fallback-src="generatefaillogo"
              :preview-disabled="row.disabledPreview"
              :src="
                (row.HDImage ? `${row.HDImage}?t=${new Date().getTime()}` : '') ||
                row.image ||
                waitforgeneratelogo
              "
              :show-toolbar="false"
              lazy
            />
          </n-spin>
        </template>
      </vxe-column>
      <vxe-column
        v-if="
          [
            actionbarStatus.PARSE,
            actionbarStatus.PREPARE_TO_GENERATE,
            actionbarStatus.AMPLIFY_TO_HD
          ].includes(actionbarCurrentStatus) && !amplifyHDLoading
        "
        field="image"
        width="300"
        title="可选镜头图"
      >
        <template #default="{ row }">
          <div :style="{ display: 'flex', 'flex-wrap': 'wrap' }">
            <n-image
              v-for="img in row.restImgs"
              :key="img"
              height="80"
              :object-fit="contain"
              :fallback-src="generatefaillogo"
              :src="img || waitforgeneratelogo"
              :preview-disabled="img"
              :show-toolbar="false"
              lazy
              @click="selectImg(img, row)"
            />
            <n-skeleton v-if="!row.restImgs?.length" :width="150" :height="100" size="medium" />
          </div>
        </template>
      </vxe-column>
      <!-- <vxe-column field="move" width="100" title="图片运动" align="center"></vxe-column> -->
      <vxe-column field="action" width="120" title="操作" align="center" header-align="center">
        <template #default="{ row }">
          <div :style="{ display: 'flex', 'flex-direction': 'column' }">
            <n-button
              :style="{ 'margin-bottom': '8px' }"
              type="primary"
              :disabled="showProgressBar"
              @click="removeSentenceRow(row)"
              >删除</n-button
            >
            <n-button
              v-show="!row.HDImage"
              v-if="
                [actionbarStatus.PREPARE_TO_GENERATE, actionbarStatus.AMPLIFY_TO_HD].includes(
                  actionbarCurrentStatus
                ) && !amplifyHDLoading
              "
              type="primary"
              :style="{ 'margin-bottom': '8px' }"
              :disabled="startLoading || showProgressBar"
              :loading="row.redrawing"
              @click="redrawSentenceRow(row)"
              >绘图</n-button
            >
            <n-button
              v-if="actionbarCurrentStatus === actionbarStatus.AMPLIFY_TO_HD"
              type="primary"
              :disabled="row.HDImage || startLoading || showProgressBar"
              :loading="row.redrawing"
              @click="reAmplifySentenceRow(row)"
              >重新放大</n-button
            >
          </div>
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
  background-color: #fff;
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
.n-tag__content {
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
}
</style>
