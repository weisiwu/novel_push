<script setup>
import { h, ref } from 'vue'
import { NButton, NTag, NImage, useLoadingBar } from 'naive-ui'
import SelectVideo from './SelectVideo.vue'

const loadingBar = useLoadingBar()

const createColumns = ({}) => {
  return [
    { title: '镜头', align: 'center', key: 'index', minWidth: 40 },
    { title: '文稿', align: 'center', key: 'text', minWidth: 150 },
    {
      title: '描述词',
      align: 'center',
      key: 'tags',
      minWidth: 150,
      render(row) {
        const { tags } = row || {}

        return h(
          'p',
          null,
          tags?.map((tag) => {
            return h(
              NTag,
              {
                type: 'info',
                style: { 'margin-right': '8px', cursor: 'pointor', 'margin-top': '8px' }
              },
              tag
            )
          })
        )
      }
    },
    {
      title: '原图',
      align: 'center',
      key: 'ori_img',
      minWidth: 150,
      render(row) {
        return h(NImage, { src: row?.ori_img || '', width: 120, class: 'ori_img' }, null)
      }
    },
    {
      title: '二创图',
      align: 'center',
      key: 'new_img',
      minWidth: 150,
      render(row) {
        return h(NImage, { src: row?.new_img || '', width: 150, class: 'new_img' }, null)
      }
    },
    { title: '画面过渡', align: 'center', key: 'trans', minWidth: 120 },
    {
      title: '操作',
      align: 'center',
      key: 'actions',
      minWidth: 120,
      render(row) {
        return h('p', { style: 'display: flex;flex-direction: column' }, [
          h(
            NButton,
            {
              strong: true,
              tertiary: true,
              type: 'info',
              size: 'small',
              style: { 'margin-bottom': '8px', width: '80px' },
              onClick: () => {}
            },
            '反推'
          ),
          h(
            NButton,
            {
              strong: true,
              tertiary: true,
              size: 'small',
              type: 'info',
              style: { width: '80px' },
              onClick: () => {}
            },
            '重绘'
          )
        ])
      }
    }
  ]
}

const tableData = ref([])

const currentRef = ref(1)
const next = (data) => {
  if (currentRef.value === null) currentRef.value = 1
  else if (currentRef.value >= 6) currentRef.value = null
  else currentRef.value++

  console.log('wswTest: 分析视频步骤传入的数据是', data)
  // 将要进行到第三部分: 反推tag
  if (currentRef.value === 2 && data?.length > 0) {
    // 开始loading效果
    // loadingBar.start()
    // 图片反推完成，给到结果
    window.ipcRenderer.send('image-tagger', data)
    window.ipcRenderer.receive('image-tagger-complete', (imageTaggers) => {
      tableData.value = tableData.value.map((row, index) => {
        return {
          ...row,
          tags: imageTaggers[index] || []
        }
      })
      // 结束loading效果(最少500ms)
      // loadingBar.finish()
      // next(result)
    })
  }
}
const videoSplit = (imgs) => {
  if (imgs?.length) {
    tableData.value = imgs.map((img, index) => {
      return {
        index: index + 1,
        text: '',
        tags: [],
        ori_img: img,
        trans: ''
      }
    })
  }
  next(imgs)
}
</script>

<template>
  <div class="actionbar">
    <n-steps :current="currentRef" :status="process">
      <n-step title="载入视频" />
      <n-step title="分析视频" />
      <n-step title="反推Tag" />
      <n-step title="绘图" />
      <n-step title="高清重绘" />
      <n-step title="导出视频" />
    </n-steps>
  </div>
  <SelectVideo v-if="currentRef === 1" :next="videoSplit" />
  <div v-if="currentRef !== 1" class="details">
    <n-data-table
      style="margin-top: 50px"
      :columns="createColumns({})"
      :data="tableData"
      :pagination="false"
      :bordered="false"
    />
  </div>
</template>

<style>
.actionbar {
  margin: 20px 50px 0px;
  justify-content: center;
  align-items: center;
}
.ori_img,
.new_img {
  width: 120px;
}
</style>
