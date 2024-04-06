<script setup></script>

<template>
  <div style="width: 100%"></div>
  <p class="title">联系我们</p>
  <p class="subtitle">AI助力，提升效率</p>
  <n-flex direction="column" style="margin-top: 32px" justify="center">
    <n-qr-code
      padding="0"
      value="https://www.naiveui.com/"
      color="#409eff"
      background-color="#F5F5F5"
    />
    <p style="display: block; width: 100%; color: #999; margin-top: 12px">扫描二维码加群~</p>
  </n-flex>
</template>

<style scoped>
.title {
  color: #0c0d0f;
  font-size: 26px;
  text-align: center;
  font-weight: bold;
  margin-bottom: 8px;
}
.subtitle {
  color: #808080;
  font-size: 16px;
  text-align: center;
  margin-bottom: 8px;
}
.account {
  width: 300px;
  margin: 32px 20px 12px 20px;
}
.password {
  width: 300px;
  margin: 0px 20px 24px 20px;
}
.btn {
  width: 300px;
  height: 43px;
  color: #fff;
}
.btn:hover {
  color: #fff;
}
.btn-bk {
  background-image: url(../../public/imgs/btn_bk.png);
  background-size: cover;
}
</style>
