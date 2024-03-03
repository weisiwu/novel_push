import './assets/index.css'

import { createApp } from 'vue'
import App from './StartApp.vue'
import naive from 'naive-ui'

const app = createApp(App)
app.use(naive)
app.mount('#app')
