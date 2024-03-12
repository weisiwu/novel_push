<template>
  <n-drawer
    v-model:show="active"
    :width="500"
    placement="right"
    :trap-focus="false"
    :block-scroll="false"
    @update:show="toggle"
  >
    <n-drawer-content title="软件设置"> 系统设置内容 </n-drawer-content>
  </n-drawer>
</template>

<script setup>
import { ref } from 'vue'
import { defineProps } from 'vue'

const props = defineProps({
  toggleShow: Function
})

const active = ref(true)
const toggle = () => {
  props.toggleShow(active.value)
  active.value = !active.value
}
</script>
