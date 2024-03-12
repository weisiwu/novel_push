<script setup>
import { h, ref } from 'vue'
import { NButton, NImage, useLoadingBar } from 'naive-ui'
import SelectVideo from './SelectVideo.vue'
import config from '../../src/BaoganAiConfig.json'

const imgSize = 250
const loadingBar = useLoadingBar()

const createColumns = ({}) => {
  return [
    { title: '镜头', align: 'center', key: 'index', minWidth: 40 },
    { title: '字幕', align: 'center', key: 'text', minWidth: 200 },
    {
      title: '原图',
      align: 'center',
      key: 'ori_img',
      minWidth: imgSize,
      render(row) {
        return h(NImage, { src: row?.ori_img || '', width: imgSize, class: 'ori_img' }, null)
      }
    },
    {
      title: '二创图',
      align: 'center',
      key: 'new_img',
      minWidth: imgSize,
      render(row) {
        return h(
          NImage,
          {
            src: row?.new_img || '',
            width: imgSize,
            style: `display: ${row?.new_img ? 'block' : 'none'}`,
            height: row?.height,
            class: 'new_img'
          },
          null
        )
      }
    },
    {
      title: '操作',
      align: 'center',
      key: 'actions',
      minWidth: 120,
      render(row) {
        return h('p', { style: 'display: flex;flex-direction: column', 'align-items': 'center' }, [
          h(
            NButton,
            {
              strong: true,
              tertiary: true,
              size: 'small',
              type: 'info',
              style: { width: '80px', margin: '0 auto' },
              onClick: () => {}
            },
            '重绘'
          ),
          h(
            NButton,
            {
              strong: true,
              tertiary: true,
              size: 'small',
              type: 'info',
              style: { width: '80px', margin: '8px auto 0px' },
              onClick: () => {}
            },
            '设置'
          )
        ])
      }
    }
  ]
}

const tableData = ref([])
const currentRef = ref(false)
const oriSize = ref([0, 0])
const newImgSize = ref([0, 0])
const durations = ref([])
const taskInProgress = ref([])
const taskList = Promise.resolve()

// 接受帧图片尺寸
window.ipcRenderer.receive('get-frame-size', (frameSize) => {
  oriSize.value = [frameSize.width || 0, frameSize.height || 0]
  const ratio = oriSize.value[1] ? oriSize.value[0] / oriSize.value[1] : 1
  newImgSize.value = [config.HDImageWidth, config.HDImageWidth / ratio]
})

// 更新表单数据 - 每切割出一个镜头，就新增一条更新任务
window.ipcRenderer.receive('update-video-frame', (data) => {
  currentRef.value = true
  const { totalData = [], totalTimes } = data || {}
  durations.value = totalTimes
  // 获取视频尺寸，仅在第一次获取
  if (!oriSize?.value?.[0]) {
    if (totalData?.[0]) {
      console.log('wswTest: getImageSize ===>', totalData[0])
      const _img = new Image()
      _img.src = totalData[0]
      _img.onload = () => {
        oriSize.value = [_img.width, _img.height]
      }
    }
  }

  totalData.reduce((sum, item, index) => {
    return sum.then(() => {
      if (taskInProgress.value.includes(item)) {
        return Promise.resolve()
      }
      tableData.value.push({
        index: index + 1,
        text: '',
        ori_img: item,
        height: (oriSize.value[1] / oriSize.value[0]) * imgSize
      })
      taskInProgress.value.push(item)
      window.ipcRenderer.send('image-to-image', {
        init_images: item,
        size: { width: newImgSize.value[0], height: newImgSize.value[1] },
        index
      })
      return Promise.resolve()
    })
  }, taskList)
})

// 接受图生图结果
window.ipcRenderer.receive('image-to-image-complete', (rawData) => {
  // 处理后返回的图片
  const { index, newImg, videoFramesPath } = rawData || {}

  if (!newImg) {
    return null
  }
  tableData.value = tableData.value.map((row, i) => {
    if (index !== i) return row
    return {
      ...row,
      new_img: newImg,
      // new_img: `data:image/jpeg;base64,${newImg}`,
      height: (oriSize.value[1] / oriSize.value[0]) * imgSize
    }
  })
})

// 接受视频合并结束
window.ipcRenderer.receive('concat-video-complete', (result) => {
  if (result) {
    window.openPath(result.save_path)
  }
})
</script>

<template>
  <SelectVideo v-if="!currentRef" />
  <div v-if="currentRef" class="details">
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
  height: auto;
  text-align: center;
}
</style>
