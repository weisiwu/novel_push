<script lang="ts">
import { h, ref, defineComponent } from 'vue'
import { NIcon, NEllipsis, NButton, NTag, NImage } from 'naive-ui'
import {
  RocketOutline,
  NotificationsOutline,
  MedkitOutline,
  SettingsOutline,
  CaretDownOutline
} from '@vicons/ionicons5'
import FromVideo from './components/FromVideo.vue'
import Tools from './components/Tools.vue'
import SystemConfig from './components/SystemConfig.vue'

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
    FromVideo,
    Tools,
    SystemConfig,
    NotificationsOutline
  },
  setup() {
    const selectMenu = ref('from_video')
    const currentRef = ref(1)
    const next = () => {
      if (currentRef.value === null) currentRef.value = 1
      else if (currentRef.value >= 6) currentRef.value = null
      else currentRef.value++
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
      next()
    }

    return {
      collapsed: ref(false),
      currentStatus: ref('process'),
      current: currentRef,
      next,
      prev,
      videoSplit,
      menuOptions,
      selectMenu,
      renderMenuLabel(option) {
        return option.label
      },
      expandIcon() {
        return h(NIcon, null, { default: () => h(CaretDownOutline) })
      },
      jumpUpdate() {
        console.log('wswTest: ', '后续跳转')
      },
      NotificationsOutline,
      tableData,
      columns: createColumns({}),
      pagination: false
    }
  }
})
</script>

<template>
  <n-space vertical>
    <n-loading-bar-provider>
      <n-layout has-sider class="layout">
        <n-layout-sider
          bordered
          class="sidebar"
          collapse-mode="width"
          content-style="padding: 24px;"
          :collapsed-width="64"
          :width="240"
          :collapsed="collapsed"
          show-trigger
          @collapse="collapsed = true"
          @expand="collapsed = false"
        >
          <div class="sidebar_title">
            <img src="./assets/electron.svg" />
            <p v-if="!collapsed">AI推文</p>
          </div>
          <n-menu
            v-model:value="selectMenu"
            :collapsed="collapsed"
            :collapsed-width="64"
            :collapsed-icon-size="22"
            :options="menuOptions"
            :render-label="renderMenuLabel"
            :expand-icon="expandIcon"
          />
        </n-layout-sider>
        <n-layout class="content">
          <div class="statusbar">
            <div class="blank"></div>
            <div class="update" @click="jumpUpdate">
              <n-icon size="24" color="#2080f0" :component="NotificationsOutline" />
              <n-gradient-text
                style="font-size: 16px; cursor: pointer; font-weight: bold"
                type="info"
              >
                更新说明
              </n-gradient-text>
            </div>
          </div>
          <FromVideo v-if="selectMenu === 'from_video'" />
          <Tools v-if="selectMenu === 'tools'" />
          <SystemConfig v-if="selectMenu === 'system_config'" />
          <div style="margin-bottom: 200px"></div>
        </n-layout>
      </n-layout>
    </n-loading-bar-provider>
  </n-space>
</template>

<style>
.layout {
  display: flex;
  width: 1920px;
  height: 1080px;
}
.sidebar_title {
  display: flex;
  flex-direction: row;
  width: 100%;
  height: 50px;
  line-height: 50px;
  margin-top: 16px;
  align-items: center;
  justify-content: center;
  img {
    width: 40px;
    height: 40px;
  }
  p {
    color: #fff;
    font-weight: bold;
    font-size: 20px;
    cursor: pointer;
    margin-left: 14px;
  }
}
.sidebar {
  width: 240px;
  height: 100%;
  background-color: #0f1222;
}
.sidebar_icon {
  color: #fff;
}
.n-menu .n-menu-item-content:hover .n-menu-item-content__icon .sidebar_icon {
  color: #333;
}
.n-menu-item-content--selected {
  background-color: #2d47d2;
}
.n-menu .n-menu-item-content .n-menu-item-content-header .sidebar_text span {
  color: #fff;
}
.n-menu .n-menu-item-content:hover .n-menu-item-content-header .sidebar_text span {
  color: #333;
}
.statusbar {
  display: flex;
  flex-direction: row;
  width: 100%;
  height: 50px;
  line-height: 50px;
  .blank {
    flex-grow: 1;
  }
  .update {
    display: flex;
    flex-grow: 0;
    flex-direction: row;
    font-size: 16px;
    font-weight: bold;
    margin-right: 24px;
    i {
      align-self: center;
      margin-right: 8px;
    }
  }
}
</style>
