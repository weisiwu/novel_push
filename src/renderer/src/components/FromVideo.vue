<script lang="ts">
import { h, ref, defineComponent } from 'vue'
import { NIcon, NEllipsis, NButton, NTag, NImage } from 'naive-ui'
import { RocketOutline, MedkitOutline, SettingsOutline, CaretDownOutline } from '@vicons/ionicons5'
import SelectVideo from './SelectVideo.vue'

function renderIcon(icon) {
  return () => h(NIcon, { class: 'sidebar_icon' }, { default: () => h(icon) })
}

function renderLabel(text) {
  return h(NEllipsis, { class: 'sidebar_text' }, text)
}

const menuOptions = [
  {
    label: renderLabel('二次创作'),
    key: 'from_video',
    icon: renderIcon(RocketOutline)
  },
  {
    label: renderLabel('工具箱'),
    key: 'tools',
    icon: renderIcon(MedkitOutline)
  },
  {
    label: renderLabel('系统设置'),
    key: 'system_config',
    icon: renderIcon(SettingsOutline)
  }
]

const createColumns = ({}) => {
  return [
    { title: '镜头', align: 'center', key: 'index' },
    { title: '文稿', align: 'center', key: 'text' },
    {
      title: '描述词',
      align: 'center',
      key: 'tags',
      render(row) {
        const { tags } = row || {}

        return h(
          'p',
          null,
          tags?.map((tag) => {
            return h(
              NTag,
              { type: 'info', style: { 'margin-right': '8px', cursor: 'pointor' } },
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
      render(row) {
        return h(NImage, { src: row?.ori_img || '', width: 120, class: 'ori_img' }, null)
      }
    },
    {
      title: '二创图',
      align: 'center',
      key: 'new_img',
      render(row) {
        return h(NImage, { src: row?.new_img || '', width: 120, class: 'new_img' }, null)
      }
    },
    { title: '画面过渡', align: 'center', key: 'trans' },
    {
      title: '操作',
      align: 'center',
      key: 'actions',
      render(row) {
        return h(
          NButton,
          {
            strong: true,
            tertiary: true,
            size: 'small',
            onClick: () => {}
          },
          [
            h(
              NButton,
              {
                strong: true,
                tertiary: true,
                size: 'small',
                type: 'info',
                style: { 'margin-right': '8px' },
                onClick: () => {}
              },
              '重绘'
            ),
            h(
              NButton,
              {
                strong: true,
                tertiary: true,
                type: 'info',
                size: 'small',
                onClick: () => {}
              },
              '反推'
            )
          ]
        )
      }
    }
  ]
}

const tableData = ref([])

export default defineComponent({
  components: {
    SelectVideo
  },
  setup() {
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
          console.log('wswTest:返穗关键词最终结果 ', imageTaggers)
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
    const prev = () => {
      if (currentRef.value === 0) currentRef.value = null
      else if (currentRef.value === null) currentRef.value = 4
      else currentRef.value--
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

    return {
      collapsed: ref(false),
      currentStatus: ref('process'),
      current: currentRef,
      next,
      prev,
      videoSplit,
      menuOptions,
      renderMenuLabel(option) {
        return option.label
      },
      expandIcon() {
        return h(NIcon, null, { default: () => h(CaretDownOutline) })
      },
      tableData,
      columns: createColumns({}),
      pagination: false
    }
  }
})
</script>

<template>
  <div class="actionbar">
    <n-steps :current="current" :status="currentStatus">
      <n-step title="载入视频" />
      <n-step title="分析视频" />
      <n-step title="反推Tag" />
      <n-step title="绘图" />
      <n-step title="高清重绘" />
      <n-step title="导出视频" />
    </n-steps>
  </div>
  <SelectVideo v-if="current === 1" :next="videoSplit" />
  <div v-if="current !== 1" class="details">
    <n-data-table
      style="margin-top: 50px"
      :columns="columns"
      :data="tableData"
      :pagination="pagination"
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
