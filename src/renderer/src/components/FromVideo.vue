<script setup>
import { h, ref, defineProps } from 'vue'
import { NButton, NImage, useMessage, NSpin } from 'naive-ui'
import SelectVideo from './SelectVideo.vue'

const imgSize = 250
const message = useMessage()
const tableData = ref([])
const processPercentage = ref(0)
const currentRef = ref(false)
const props = defineProps({ updateIsProcessVideo: Function })

const createColumns = () => {
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
        const height = row?.height / (row?.width / imgSize || 1)
        console.log('wswTest: 是否展示进度条', row?.finish)
        return h('div', { class: 'new_img_ctn' }, [
          h(
            NImage,
            {
              src: row?.new_img ? `${row?.new_img}?t=${Date.now()}` : row?.ori_img || '',
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
              style: `position:absolute;justify-content:center;align-items:center;top:20px;left:192px;height:100px;width:100px;display:${row?.finish ? 'none' : 'flex'}`
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
      render() {
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
          )
          // h(
          //   NButton,
          //   {
          //     strong: true,
          //     tertiary: true,
          //     size: 'small',
          //     type: 'info',
          //     style: { width: '80px', margin: '8px auto 0px' },
          //     onClick: () => {}
          //   },
          //   '设置'
          // )
        ])
      }
    }
  ]
}

if (window.ipcRenderer) {
  window.ipcRenderer.receive('update-process', (params) => {
    console.log('wswTest: 数量是什么', tableData.value.length)
    props.updateIsProcessVideo(true)
    let isExsist = false
    const {
      type,
      width,
      height,
      file_name,
      index: output_index,
      img_path,
      new_img_path,
      is_skip,
      video_path
    } = params || {}

    console.log('wswTest: 接受到事件', type, params)
    // 如果sd接口不可用，给与用户提示
    if (type === 'check_sd_available') {
      message.error('进行图像转换的stable diffusion接口不可用')
      processPercentage.value = 100
      return
    }

    // 将保存产出视频目录设置为默认
    if (type === 'set_output_path_default') {
      message.info(`未发现预设保存结果目录，使用默认值 ${params?.default_path || ''}`)
    }

    if (video_path && type === 'concat_imgs_to_video') {
      message.info('生成视频成功!')
      processPercentage.value = 100
      // window.openPath(video_path)
      window.openPath(`${video_path}/output.mp4`)
      props.updateIsProcessVideo(false)
      tableData.value = []
      currentRef.value = false
      return
    }

    const _tableData = tableData.value.map((item) => {
      console.log('wswTest类型是什么', type, item.value, file_name)
      // 存在名称相同的图片，则是更新为对该图片的追加改动
      if (item.value == file_name.replace('_new', '')) {
        isExsist = true
        if (type === 'extract_picture' || (is_skip && type === 'rm_watermark')) {
          return {
            ...item,
            width,
            height,
            ori_img: img_path,
            new_img: img_path,
            new_img_mask_opacity: 0.2,
            percentage: Math.floor(Math.random() * 40),
            finish: false
          }
        } else if (type === 'rm_watermark') {
          return {
            ...item,
            width,
            height,
            new_img: new_img_path,
            new_img_mask_opacity: 0.7,
            percentage: Math.floor(Math.random() * 88),
            finish: false
          }
        } else if (type === 'sd_imgtoimg') {
          console.log('wswTest: 进度是多少output_index', output_index, tableData.value.length)
          processPercentage.value = Number((output_index / tableData.value.length) * 100).toFixed(2)
          return {
            ...item,
            width,
            height,
            new_img: new_img_path,
            new_img_mask_opacity: 1,
            percentage: 100,
            finish: true
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
        percentage: Math.floor(Math.random() * 15),
        finish: false
      })
    }
    tableData.value = _tableData

    if (!currentRef.value) {
      currentRef.value = tableData.value.length || 0
    }
  })
}
</script>

<template>
  <n-progress
    v-if="processPercentage < 100"
    type="line"
    :percentage="processPercentage"
    :indicator-placement="'inside'"
    processing
  />
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
.new_img_ctn {
  position: relative;
}
</style>
