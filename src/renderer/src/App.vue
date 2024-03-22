<script setup>
import { h, ref } from 'vue'
import { NIcon, NEllipsis } from 'naive-ui'
import {
  BugOutline,
  DownloadOutline,
  ImagesOutline,
  RocketOutline,
  NotificationsOutline,
  SettingsOutline,
  MedkitOutline,
  CaretDownOutline
} from '@vicons/ionicons5'
import FromVideo from './components/FromVideo.vue'
import FromText from './components/FromText.vue'
import Tools from './components/Tools.vue'
import Feedback from './components/Feedback.vue'
import SystemConfig from './components/SystemConfig.vue'
import AppLogo from '../public/logos/logo_16.svg?asset'

const pageNames = {
  from_video: 'from_video',
  from_text: 'from_text',
  tools: 'tools',
  feedback: 'feedback'
}
function renderIcon(icon) {
  return () => h(NIcon, { class: 'sidebar_icon' }, { default: () => h(icon) })
}
function renderLabel(text) {
  return h(NEllipsis, { class: 'sidebar_text' }, text)
}
const renderMenuLabel = (option) => {
  return option.label
}
const expandIcon = () => {
  return h(NIcon, null, { default: () => h(CaretDownOutline) })
}
const menuOptions = [
  {
    label: renderLabel('二次创作'),
    key: pageNames.from_video,
    icon: renderIcon(RocketOutline)
  },
  {
    label: renderLabel('文生视频'),
    key: pageNames.from_text,
    icon: renderIcon(RocketOutline)
  },
  {
    label: renderLabel('工具箱'),
    key: pageNames.tools,
    icon: renderIcon(MedkitOutline),
    children: [
      {
        label: '视频下载',
        icon: renderIcon(DownloadOutline),
        key: 'video_download'
      },
      {
        label: '视频封面制作',
        icon: renderIcon(ImagesOutline),
        key: 'video_cover'
      }
    ]
  },
  {
    label: renderLabel('使用说明'),
    key: pageNames.feedback,
    icon: renderIcon(BugOutline)
  }
]

const collapsed = ref(false)
const showSystemConfig = ref(false)
const selectMenu = ref('from_video')
const loadingStyle = {
  loading: {
    height: '12px'
  }
}

const jumpUpdate = () => {
  window.openExternal('https://www.yuque.com/weisiwu/xs8rvm/enodzflk3zxi11m7')
}
const toggleConfig = (event) => {
  if (event.value !== undefined) {
    showSystemConfig.value = event.value
    return
  }
  showSystemConfig.value = !showSystemConfig.value
}
</script>

<template>
  <n-space vertical :style="{ width: '100%', height: '100vh' }">
    <n-loading-bar-provider :loading-bar-style="loadingStyle">
      <n-message-provider>
        <n-layout has-sider class="layout" :style="{ width: '100%', height: '100vh' }">
          <n-layout-sider
            bordered
            class="sidebar"
            collapse-mode="width"
            content-style="padding: 24px;"
            :collapsed-width="10"
            :width="240"
            :collapsed="collapsed"
            show-trigger
            @collapse="collapsed = true"
            @expand="collapsed = false"
          >
            <div v-if="!collapsed" class="sidebar_title">
              <img :src="AppLogo" />
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
          <n-layout class="content" :style="{ minWidth: '900px', width: '100%' }">
            <div class="statusbar">
              <div class="blank"></div>
              <div class="config topbar_icon" @click="toggleConfig">
                <n-icon size="24" color="#2080f0" :component="SettingsOutline" />
                <n-gradient-text
                  style="font-size: 16px; cursor: pointer; font-weight: bold"
                  type="info"
                >
                  软件设置
                </n-gradient-text>
              </div>
              <div class="update topbar_icon" @click="jumpUpdate">
                <n-icon size="24" color="#2080f0" :component="NotificationsOutline" />
                <n-gradient-text
                  style="font-size: 16px; cursor: pointer; font-weight: bold"
                  type="info"
                >
                  更新说明
                </n-gradient-text>
              </div>
            </div>
            <FromVideo v-if="selectMenu === pageNames.from_video" />
            <FromText v-if="selectMenu === pageNames.from_text" />
            <Tools v-if="selectMenu === pageNames.tools" />
            <Feedback v-if="selectMenu === pageNames.feedback" />
            <SystemConfig v-if="showSystemConfig" :toggle-show="toggleConfig" />
            <div style="margin-bottom: 80px"></div>
          </n-layout>
        </n-layout>
      </n-message-provider>
    </n-loading-bar-provider>
  </n-space>
</template>

<style>
.layout {
  display: flex;
  max-width: 1920px;
  max-height: 1080px;
  width: 100%;
  height: 100%;
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
    position: absolute;
    left: 64px;
    top: 44px;
    width: 110px;
    height: 110px;
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

.n-icon {
  svg {
    color: #fff;
  }
}
.statusbar {
  display: flex;
  flex-direction: row;
  width: 100%;
  height: 50px;
  line-height: 50px;
  .blank {
    display: flex;
    flex-grow: 1;
    flex-shrink: 1;
  }
  .topbar_icon {
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
/* 未选中tab */
.n-menu-item-content:hover .n-menu-item-content__icon .sidebar_icon svg {
  color: #333;
}
.n-menu-item-content .n-menu-item-content-header .sidebar_text span {
  color: #fff;
}
.n-menu-item-content:hover .n-menu-item-content-header .sidebar_text span {
  color: #333;
}
/* 选中tab */
.n-menu-item-content--selected {
  background-color: #2d47d2;
}
.n-menu-item-content--selected:hover .n-menu-item-content__icon .sidebar_icon svg {
  color: #fff;
}
.n-menu
  .n-menu-item-content:not(.n-menu-item-content--disabled).n-menu-item-content--selected:hover
  .n-menu-item-content-header,
.n-menu-item-content--selected:hover .n-menu-item-content-header .sidebar_text span {
  color: #fff;
}

/* 子目录样式定义 */
.n-submenu-children {
  .n-menu-item {
    .n-menu-item-content .n-menu-item-content-header {
      color: #fff;
    }
  }
}
</style>
