import './assets/index.css'

import { createApp } from 'vue'
import App from './StartApp.vue'
import naive from 'naive-ui'
import VXETable from 'vxe-table'
import 'vxe-table/lib/style.css'

const app = createApp(App)
app.use(naive)
app.use(VXETable)
app.mount('#app')
