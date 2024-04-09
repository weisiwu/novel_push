import './assets/main.css'
import { createApp } from 'vue'
// import naive from 'naive-ui'
// import VXETable from 'vxe-table'
// import 'vxe-table/lib/style.css'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import App from './DistributePlatforms.vue'

const app = createApp(App)
// app.use(naive)
// app.use(VXETable)
app.use(ElementPlus)
app.mount('#app')
