<script setup>
import { h, ref } from 'vue'
import { NButton, NProgress, NImage, useLoadingBar } from 'naive-ui'
import SelectVideo from './SelectVideo.vue'

const imgSize = 250
const loadingBar = useLoadingBar()

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
            NProgress,
            {
              type: 'dashboard',
              style: `position:absolute;top:20px;left:192px;height:100px;width:100px;display:${row?.finish ? 'none' : 'block'}`,
              'show-indicator': false,
              percentage: row?.percentage || 0,
              'gap-degree': 0
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

window.ipcRenderer.receive('update-process', (params) => {
  let isExsist = false
  const { type, width, height, file_name, img_path, new_img_path } = params || {}
  console.log('wswTest: 接受到的更新数据是', params)
  const _tableData = tableData.value.map((item) => {
    console.log('wswTest类型是什么', type, item.value, file_name)
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

window.ipcRenderer.receive('concat_imgs_to_video', (params) => {
  const { code, video_path } = params || {}
  console.log('wswTest: video_pathvideo_path', video_path)
  if (code === 1 && video_path) {
    window.openPath(video_path)
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
.new_img_ctn {
  position: relative;
}
</style>
