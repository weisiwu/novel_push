<template>
  <el-form-item label="【WIP】话题">
    <el-radio-group v-model="form.bilibili_open_elec">
      <el-radio value="0">不开启</el-radio>
      <el-radio value="1">开启</el-radio>
    </el-radio-group>
  </el-form-item>
  <el-form-item label="【WIP】视频类型">
    <el-radio-group v-model="form.bilibili_open_elec">
      <el-radio value="0">原创</el-radio>
      <el-radio value="1">转载</el-radio>
    </el-radio-group>
  </el-form-item>
  <el-form-item label="【WIP】参与活动">
    <el-radio-group v-model="form.bilibili_open_elec">
      <el-radio value="0">原创</el-radio>
      <el-radio value="1">转载</el-radio>
    </el-radio-group>
  </el-form-item>
  <el-form-item label="【WIP】谁可以看">
    <el-radio-group v-model="form.bilibili_open_elec">
      <el-radio value="0">公开</el-radio>
      <el-radio value="1">粉丝可见</el-radio>
      <el-radio value="1">仅我可见</el-radio>
    </el-radio-group>
  </el-form-item>
  <el-form-item label="【WIP】定时发布">
    <el-radio-group v-model="form.bilibili_open_elec">
      <el-radio value="0">立即发布</el-radio>
      <el-radio value="1">定时发布</el-radio>
      <el-radio value="1">仅我可见</el-radio>
    </el-radio-group>
  </el-form-item>
  <el-form-item label="【WIP】允许他人下载">
    <el-radio-group v-model="form.bilibili_open_elec">
      <el-radio value="0">允许</el-radio>
      <el-radio value="1">不允许</el-radio>
    </el-radio-group>
  </el-form-item>
</template>

<script setup></script>

<style scoped></style>
