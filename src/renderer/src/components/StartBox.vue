<script setup>
import LoginBox from './LoginBox.vue'
import RegisterBox from './RegisterBox.vue'
import ChargeBox from './ChargeBox.vue'
</script>

<template>
  <div class="box">
    <div class="overlay"></div>
    <n-card class="half" size="medium" style="background-color: transparent">
      <div class="left_img_bk"></div>
    </n-card>
    <n-card class="half" style="align-self: center; left: -30px" size="medium">
      <n-tabs type="line" justify-content="center" placement="bottom" class="tab" animated>
        <n-tab-pane class="tab_item" name="login" tab="登录">
          <div class="pannel">
            <LoginBox />
          </div>
        </n-tab-pane>
        <n-tab-pane class="tab_item" name="register" tab="注册">
          <div class="pannel">
            <RegisterBox />
          </div>
        </n-tab-pane>
        <n-tab-pane class="tab_item" name="charge" tab="充值">
          <div class="pannel">
            <ChargeBox />
          </div>
        </n-tab-pane>
      </n-tabs>
    </n-card>
  </div>
</template>

<style scoped>
.box {
  position: relative;
  display: flex;
  width: 900px;
  flex-grow: 1;
  flex-direction: row;
  background-image: url(../assets/images/start_bk.png);
  background-position: 0px -20px;
  background-size: cover;
  background-repeat: no-repeat;
}
.overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(255, 255, 255, 0.6);
}
.half {
  display: flex;
  flex-shrink: 0;
  flex-grow: 0;
  width: 50%;
  height: 100%;
  flex-direction: column;
}
.left_img {
  max-width: 100%;
  height: auto;
  display: block;
}
.left_img_bk {
  max-width: 100%;
  width: 100%;
  height: 420px;
  display: block;
  background-image: url(../assets/images/login_left.png);
  background-position: -10px 55px;
  background-size: contain;
  background-repeat: no-repeat;
}
.tab {
  margin: 0px auto;
}
.tab_item {
  display: block;
  width: 100%;
  height: 280px;
  text-align: center;
  cursor: pointer;
}
.pannel {
  margin: 0 auto;
  text-align: center;
}
</style>
