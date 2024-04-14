<script setup>
import { ref } from 'vue'
import Header from './components/DistributeHeader.vue'
import Main from './components/DistributeMain.vue'
import Footer from './components/DistributeFooter.vue'
</script>

<template>
  <div class="common-layout">
    <el-container>
      <el-container>
        <!-- <el-header><Header /></el-header> -->
        <el-main><Main /></el-main>
        <!-- <el-footer><Footer /></el-footer> -->
      </el-container>
    </el-container>
  </div>
</template>

<style scoped>
.common-layout {
  width: 100vw;
}
</style>
