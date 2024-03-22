<script setup>
import { ref, defineProps } from 'vue'

const props = defineProps({ tool: String })
const model = ref({
  title: '视频标题',
  titleSize: 24, // 字体大小
  titleFont: '', // 字体
  titleColor: '#000', // 字体颜色
  indexText: '第三集',
  indexTextSize: 24, // 字体大小
  indexTextFont: '', // 字体
  indexTextColor: '#000', // 字体颜色
  borderSize: 1,
  borderStartColor: '#000',
  borderEndColor: '#000',
  borderColorAngle: 0
})
const tabs = {
  video_download: 'video_download',
  video_cover: 'video_cover'
}
</script>

<template>
  <n-layout v-if="props.tool === tabs.video_download" :style="{ width: '100%' }">
    <n-h3 style="text-align: center"> B站/抖音视频下载 </n-h3>
    <n-divider />
    <n-input-group :style="{ margin: '0px 20%', width: '60%' }">
      <n-input size="large" placeholder="请将APP里复制的视频链接粘贴到这里" />
      <n-button size="large" :style="{ width: '120px' }" type="info"> 下载 </n-button>
    </n-input-group>
  </n-layout>
  <n-layout v-if="props.tool === tabs.video_cover">
    <n-h2 style="font-weight: bold; text-align: center"> 视频封面制作 </n-h2>
    <n-divider />
    <n-blockquote style="text-align: left">
      1、请选择你希望的视频封面模板<br />
      2、选择背景图<br />
      3、设置标题，选择合适字体、颜色、大小<br />
      4、设置第N集，选择合适字体、颜色、大小<br />
      5、选择封面边框，以及颜色过渡<br />
    </n-blockquote>
    <n-flex>
      <n-layout style="width: 45%">
        <n-h4 style="font-weight: bold; text-align: center">封面模板 </n-h4>
        <n-carousel
          effect="card"
          prev-slide-style="transform: translateX(-180%) translateZ(-800px);"
          next-slide-style="transform: translateX(80%) translateZ(-800px);"
          style="height: 400px"
          :show-dots="false"
        >
          <n-carousel-item :style="{ width: '300px' }">
            <img class="carousel-img" src="../../public/demos/video_cover_1.jpeg"
          /></n-carousel-item>
          <n-carousel-item :style="{ width: '300px' }"
            ><img class="carousel-img" src="../../public/demos/video_cover_2.jpeg" />
          </n-carousel-item>
          <n-carousel-item :style="{ width: '300px' }"
            ><img class="carousel-img" src="../../public/demos/video_cover_3.jpeg" />
          </n-carousel-item>
          <n-carousel-item :style="{ width: '300px' }"
            ><img class="carousel-img" src="../../public/demos/video_cover_4.jpeg" />
          </n-carousel-item>
          <n-carousel-item :style="{ width: '300px' }"
            ><img class="carousel-img" src="../../public/demos/video_cover_5.jpeg" />
          </n-carousel-item>
          <n-carousel-item :style="{ width: '300px' }"
            ><img class="carousel-img" src="../../public/demos/video_cover_6.jpeg" />
          </n-carousel-item>
          <n-carousel-item :style="{ width: '300px' }">
            <img class="carousel-img" src="../../public/demos/video_cover_7.jpeg"
          /></n-carousel-item>
          <n-carousel-item :style="{ width: '300px' }"
            ><img class="carousel-img" src="../../public/demos/video_cover_8.jpeg" />
          </n-carousel-item>
        </n-carousel>
      </n-layout>
      <n-layout style="width: 45%">
        <n-h4 style="font-weight: bold; text-align: center">预览 </n-h4>
        <n-layout style="text-align: center">
          <img class="carousel-img" src="../../public/demos/video_cover_1.jpeg" />
        </n-layout>
      </n-layout>
    </n-flex>
    <n-flex style="width: 100%">
      <n-form
        ref="formRef"
        :model="model"
        label-placement="left"
        :label-width="120"
        :disabled="updateDisabled"
        :style="{ width: '100%' }"
      >
        <n-flex
          style="
            width: 100%;
            justify-content: center;
            align-items: center;
            justify-content: flex-start;
            margin: 50px 0px 0px 150px;
          "
        >
          <n-h3 style="font-weight: bold">视频标题</n-h3>
          <n-form-item label="标题文案" path="title">
            <n-input v-model:value="model.title" style="width: 120px" />
          </n-form-item>
          <n-form-item label="选择字体" path="titleFont">
            <n-select
              v-model:value="model.titleFont"
              style="width: 120px"
              :options="generalOptions"
            />
          </n-form-item>
          <n-form-item label="选择大小" path="titleSize">
            <n-input-number
              v-model:value="model.titleSize"
              style="width: 120px"
              :min="12"
              :max="36"
            />
          </n-form-item>
          <n-form-item label="选择颜色" path="titleColor">
            <n-color-picker v-model:value="model.titleColor" style="width: 120px" />
          </n-form-item>
        </n-flex>
        <n-flex
          style="width: 100%; align-items: center; justify-content: flex-start; margin-left: 150px"
        >
          <n-h3 style="font-weight: bold">视频集数</n-h3>
          <n-form-item label="集数文案" path="indexText">
            <n-input v-model:value="model.indexText" style="width: 120px" />
          </n-form-item>
          <n-form-item label="选择字体" path="indexTextFont">
            <n-select
              v-model:value="model.indexTextFont"
              style="width: 120px"
              :options="generalOptions"
            />
          </n-form-item>
          <n-form-item label="选择大小" path="indexTextSize">
            <n-input-number
              v-model:value="model.indexTextSize"
              style="width: 120px"
              :min="12"
              :max="36"
            />
          </n-form-item>
          <n-form-item label="选择颜色" path="indexTextColor">
            <n-color-picker v-model:value="model.indexTextColor" style="width: 120px" />
          </n-form-item>
        </n-flex>
        <n-flex
          style="width: 100%; align-items: center; justify-content: flex-start; margin-left: 150px"
        >
          <n-h3 style="font-weight: bold">视频边框</n-h3>
          <n-form-item label="选择边框尺寸" path="borderSize">
            <n-input-number
              v-model:value="model.borderSize"
              style="width: 120px"
              :min="0"
              :max="10"
            />
          </n-form-item>
          <n-form-item label="选择起始颜色" path="borderStartColor">
            <n-color-picker v-model:value="model.borderStartColor" style="width: 120px" />
          </n-form-item>
          <n-form-item label="选择终止颜色" path="borderEndColor">
            <n-color-picker v-model:value="model.borderEndColor" style="width: 120px" />
          </n-form-item>
          <n-form-item label="选择角度" path="borderColorAngle">
            <n-input-number
              v-model:value="model.borderColorAngle"
              style="width: 120px"
              :min="-180"
              :max="180"
            />
          </n-form-item>
        </n-flex>
      </n-form>
      <n-flex style="justify-content: center; width: 100%">
        <n-button style="align-self: center" type="primary">一键导出</n-button>
      </n-flex>
    </n-flex>
  </n-layout>
</template>

<style>
/* 抖音封面宽高比0.75 */
.carousel-img {
  margin: 0 auto;
  width: 300px;
  height: 400px;
  object-fit: cover;
}
</style>
