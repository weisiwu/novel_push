<script setup>
import { ref } from 'vue'
import { VXETable } from 'vxe-table'
import { useMessage } from 'naive-ui'
import icon from '../../../../resources/imgs/icon.png?asset'

const sceneTableRef = ref('')
const charactorTableRef = ref('')
const textValue = ref('')
const message = useMessage()
const showTable = ref(false)
const startLoading = ref(false)
// TODO:(wsw) 临时处理
// const parseTextLoading = ref(true)
const parseTextLoading = ref(false)
// 操作按钮栏状态
const actionbarStatus = {
  PARSE: 'PARSE',
  READY_TO_GENERATE: 'READY_TO_GENERATE',
  READY_TO_OUTPUT_VIDEO: 'READY_TO_OUTPUT_VIDEO'
}
const actionbarCurrentStatus = ref(actionbarStatus.PARSE)
const charactorsTableData = ref([])
const setencesTableData = ref([])
const getsetencesTableData = () => {
  console.log('wswTest: 获取表格数据', setencesTableData.value)
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
    console.log('wswTest: 接收到新的信息', info)
    startLoading.value = false
    showTable.value = true
    actionbarCurrentStatus.value = actionbarStatus.READY_TO_GENERATE
    const { type, sIndex = 1, text = '', tags = [], image = '', name = '' } = info || {}
    const isIn = setencesTableData.value.findIndex((info) => info.id === sIndex)
    console.log('wswTest: 接受到的更新信息是', isIn, info)
    // 对表中已经存在的数据进行更新
    if (isIn >= 0) {
      if (type === 'charactor') {
        charactorsTableData.value.splice(isIn, 0, {
          ...charactorsTableData.value[isIn],
          name,
          tags,
          image
        })
      } else {
        setencesTableData.value.splice(isIn, 0, {
          ...setencesTableData.value[isIn],
          text: text,
          tags: tags,
          image: image,
          duration: 1,
          move: '向上'
        })
      }
      return
    }
    // 向表中添加新数据
    if (type === 'charactor') {
      charactorsTableData.value.push({ id: sIndex, name, tags, image })
    } else {
      setencesTableData.value.push({
        id: sIndex,
        text: text,
        tags: tags,
        image: image,
        duration: 1,
        move: '向上'
      })
    }
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
// 删除行相关
const removeCharactorRow = async (row) => {
  const $table = charactorTableRef.value
  if ($table) {
    const type = await VXETable.modal.confirm('您确定要删除该角色?')
    if (type === 'confirm') {
      $table.remove(row)
    }
  }
}
const removeSentenceRow = async (row) => {
  const $table = sceneTableRef.value
  if ($table) {
    const type = await VXETable.modal.confirm('您确定要删除该镜头?')
    if (type === 'confirm') {
      $table.remove(row)
    }
  }
}
// 重绘行相关
const redrawCharactorRow = async (row) => {
  window.ipcRenderer.send('start-draw', {
    prompt: row.tags.join(','),
    sIndex: row.id,
    type: 'charactor'
  })
}
const redrawSentenceRow = async (row) => {
  window.ipcRenderer.send('start-draw', {
    prompt: row.tags.join(','),
    sIndex: row.id,
    relatedCharactor: row?.relatedCharactor || ''
  })
}

// 开始解析文本
const startProcess = () => {
  startLoading.value = true
  parseTextLoading.value = true
  window.ipcRenderer.send('texttovideo-process-start', textValue.value)
}
// 开始批量生图
const startGenerate = () => {
  // TODO:(wsw) 临时，只走流程
  const _tmp = setencesTableData.value[0]
  window.ipcRenderer.send('start-draw', {
    prompt: _tmp.tags.join(','),
    sIndex: _tmp.id
    // relatedCharactor:
  })
  // TODO:(wsw) 最后导出图
  // TODO:(wsw) 逻辑上是不对的，但是就是要手动生成两个图，然后拼接视频
  actionbarCurrentStatus.value = actionbarStatus.READY_TO_OUTPUT_VIDEO
}
const exportVideo = () => {
  const setencesTableData = getsetencesTableData()
  window.ipcRenderer.send('concat-video', JSON.stringify(setencesTableData))
}
</script>

<template>
  <n-space :style="{ margin: '20px' }">
    <!-- 文案解析前，操作按钮 -->
    <div v-if="actionbarCurrentStatus === actionbarStatus.PARSE">
      <n-button type="primary" :loading="startLoading" @click="startProcess">{{
        startLoading ? '转换中' : '开始转换'
      }}</n-button>
    </div>
    <!-- 调整完提示词，生图阶段操作按钮 -->
    <div v-if="actionbarCurrentStatus === actionbarStatus.READY_TO_GENERATE">
      <n-button type="primary" @click="startGenerate">开始绘图和配音</n-button>
    </div>
    <!-- 整体处理完，操作按钮 -->
    <div v-if="actionbarCurrentStatus === actionbarStatus.READY_TO_OUTPUT_VIDEO">
      <n-button type="primary" @click="exportVideo">导出视频</n-button>
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
      :row-config="{ height: 200 }"
      :style="{ margin: '20px' }"
      :data="charactorsTableData"
    >
      <vxe-column type="name" title="角色名" align="center" width="200"></vxe-column>
      <vxe-column field="tags" title="绘图提示词" align="center">
        <template #default="{ row }">
          <n-dynamic-tags
            v-model:value="row.tags"
            :tag-style="{ maxWidth: '120px', 'white-space': 'nowrap', 'text-overflow': 'ellipsis' }"
            :edit-config="{ trigger: 'click', mode: 'cell' }"
          />
        </template>
      </vxe-column>
      <vxe-column field="image" width="200" title="效果图" align="center">
        <template #default="{ row }">
          <!-- // TODO:(wsw) 临时注释掉画图 -->
          <!-- <n-spin :show="!row.image" :style="{ 'text-align': 'center' }"> -->
          <n-image
            :src="row.image ? `${row.image}?t=${new Date().getTime()}` : icon"
            height="150"
            :fallback-src="icon"
            show-toolbar="false"
            lazy
          />
          <!-- </n-spin> -->
        </template>
      </vxe-column>
      <vxe-column field="action" vxe-column width="120" title="操作" align="center">
        <template #default="{ row }">
          <n-button
            :style="{ 'margin-bottom': '8px' }"
            type="primary"
            @click="removeCharactorRow(row)"
            >删除角色</n-button
          >
          <n-button type="primary" @click="redrawCharactorRow(row)">重新生成</n-button>
        </template>
      </vxe-column>
    </vxe-table>
    <!-- 场景/句子表 -->
    <vxe-table
      ref="sceneTableRef"
      header-align="center"
      show-overflow
      :row-config="{ height: 200 }"
      :style="{ margin: '20px' }"
      :data="setencesTableData"
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
          <!-- // TODO:(wsw) 临时注释掉画图 -->
          <!-- <n-spin :show="!row.image" :style="{ 'text-align': 'center' }"> -->
          <n-image
            :src="row.image ? `${row.image}?t=${new Date().getTime()}` : icon"
            height="150"
            :fallback-src="icon"
            show-toolbar="false"
            lazy
          />
          <!-- </n-spin> -->
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
          <n-button
            :style="{ 'margin-bottom': '8px' }"
            type="primary"
            @click="removeSentenceRow(row)"
            >删除</n-button
          >
          <n-button type="primary" @click="redrawSentenceRow(row)">重绘</n-button>
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
</style>
