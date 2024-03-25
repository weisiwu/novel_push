<script setup>
import { h, ref, defineProps } from 'vue'
import { NButton, NImage, useMessage, NSpin } from 'naive-ui'
import SelectVideo from './SelectVideo.vue'
import defaultImg from '../../public/imgs/icon.png?assets'

const imgSize = 120
const message = useMessage()
const tableData = ref([])
const showFinishBtn = ref(false)
const processPercentage = ref(0)
const currentRef = ref(false)
const props = defineProps({ updateIsProcessVideo: Function, isProcessVideo: Boolean })
const bodyWidth = document.body.clientWidth - 240

const createColumns = () => {
  return [
    { title: '镜头', align: 'center', key: 'index', width: 60 },
    {
      title: '素材图',
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
      width: imgSize,
      render(row) {
        const height = row?.height / (row?.width / imgSize || 1)
        const new_img = row?.sd_imgtoimg_error ? '' : row?.new_img || row?.new_img?.[0]
        return h('div', { class: 'new_img_ctn', style: `width: 160px;` }, [
          h(
            NImage,
            {
              lazy: true,
              src: new_img ? `${new_img}?t=${Date.now()}` : row?.ori_img || '',
              'fallback-src': defaultImg,
              width: imgSize,
              style: `opacity:${row?.new_img_mask_opacity || 1};width: ${imgSize}px;`,
              height: height,
              class: 'new_img'
            },
            null
          ),
          h(
            NSpin,
            {
              type: 'dashboard',
              size: 'large',
              style: `position:absolute;justify-content:center;align-items:center;top:-15px;left:30px;height:100px;width:100px;display:${row?.finish ? 'none' : 'flex'}`
            },
            null
          )
        ])
      }
    },
    {
      title: '操作',
      align: 'center',
      key: 'actions',
      minWidth: 120,
      render(row) {
        const new_img = row?.new_img || row?.new_img?.[0]
        return h('p', { style: 'display: flex;flex-direction: column', 'align-items': 'center' }, [
          h(
            NButton,
            {
              disabled: props.isProcessVideo,
              strong: true,
              tertiary: true,
              size: 'small',
              type: 'info',
              style: { width: '80px', margin: '0 auto' },
              onClick: () => reDrawImage(new_img)
            },
            '重绘'
          )
        ])
      }
    }
  ]
}
// 重选视频
const chooseVideo = () => {
  props.updateIsProcessVideo(false)
  tableData.value = []
  currentRef.value = false
  processPercentage.value = 0
  window.ipcRenderer.send('stop-process')
}
// 导出视频
const concatVideo = () => {
  window.ipcRenderer.send('concat-video')
}
// 重绘
const reDrawImage = (new_img) => {
  window.ipcRenderer.send('start-redraw', new_img)
}

if (window.ipcRenderer) {
  window.ipcRenderer.receive('update-process', (params) => {
    props.updateIsProcessVideo(true)
    let isExsist = false
    const {
      type,
      code,
      width,
      height,
      file_name,
      index: output_index,
      img_path,
      output_file = [],
      video_path
    } = params || {}

    // 如果sd接口不可用，给与用户提示
    if (type === 'check_sd_available') {
      message.error('进行图像转换的stable diffusion接口不可用')
      chooseVideo()
      return
    }

    // 将保存产出视频目录设置为默认
    if (type === 'set_output_path_default') {
      message.info(`未发现预设保存结果目录，使用默认值 ${params?.default_path || ''}`)
    }

    if (video_path && type === 'video_imgs_ready') {
      // 已就绪，可以合成视频
      showFinishBtn.value = true
      return
    }

    const _tableData = tableData.value.map((item) => {
      // 存在名称相同的图片，则是更新为对该图片的追加改动
      if (item.value == file_name.replace('_new', '')) {
        isExsist = true
        if (type === 'extract_picture') {
          return {
            ...item,
            width,
            height,
            ori_img: img_path,
            new_img: img_path,
            new_img_mask_opacity: 0.2,
            finish: false
          }
        } else if (type === 'sd_imgtoimg') {
          // 更新生成视频进度
          processPercentage.value = Number((output_index / tableData.value.length) * 100).toFixed(2)
          if (processPercentage.value >= 100) {
            showFinishBtn.value = true
          }
          return {
            ...item,
            width,
            height,
            new_img: output_file,
            new_img_mask_opacity: 1,
            finish: true,
            sd_imgtoimg_error: code === 0
          }
        }
      }
      return item
    })
    // 如果并非已经存在的图片
    if (!isExsist) {
      _tableData.push({
        index: _tableData.length + 1,
        text: '',
        value: file_name,
        new_img: '',
        width,
        height,
        ori_img: img_path,
        new_img_mask_opacity: 0.2,
        finish: false
      })
    }
    tableData.value = _tableData

    if (!currentRef.value) {
      currentRef.value = tableData.value.length || 0
    }
  })

  window.ipcRenderer.receive('finish-process', (params) => {
    const { outputPath, outputFile } = params || {}
    console.log('wswTest:生成视频成功,视频结果路径 ', outputFile)
    message.info('生成视频成功!')
    processPercentage.value = 0
    window.openPath(outputFile)
    props.updateIsProcessVideo(false)
    tableData.value = []
    currentRef.value = false
    showFinishBtn.value = false
  })

  window.ipcRenderer.receive('finish-redraw', (params) => {
    message.info('重绘成功!')
  })
}
</script>

<template>
  <n-progress
    v-if="processPercentage < 100"
    type="line"
    :style="{
      position: 'fixed',
      top: '40px',
      'z-index': 999,
      width: `${bodyWidth}px`
    }"
    :percentage="processPercentage"
    :indicator-placement="'inside'"
    processing
  />
  <SelectVideo v-if="!currentRef" />
  <div v-if="currentRef" class="details">
    <n-flex :style="{ margin: '20px 0px 0px 20px' }">
      <n-button type="primary" @click="chooseVideo">重选视频</n-button>
      <n-button v-if="showFinishBtn" type="primary" @click="concatVideo">导出视频</n-button>
    </n-flex>
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
.new_img_ctn {
  position: relative;
}
.n-carousel {
  width: 140%;
}
.n-carousel.n-carousel--bottom .n-carousel__arrow-group {
  position: absolute;
  left: 6px;
  border: 0px;
  background: transparent;
  height: 26px;
  top: 20px;
  justify-content: space-between;
}
.n-carousel .n-carousel__arrow svg {
  width: 2em;
  height: 2em;
  color: black;
}
.n-carousel.n-carousel--show-arrow.n-carousel--bottom .n-carousel__dots {
  display: none;
}
.n-progress.n-progress--line {
  width: auto;
}
</style>
