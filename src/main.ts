import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import i18n from './i18n'

// 本地自托管字体（替代 Google Fonts 远程加载，仅引入 latin 子集以减小体积）
import '@fontsource/inter/latin-400.css'
import '@fontsource/inter/latin-500.css'
import '@fontsource/inter/latin-600.css'
import '@fontsource/inter/latin-700.css'
import '@fontsource/jetbrains-mono/latin-400.css'
import '@fontsource/jetbrains-mono/latin-500.css'
import '@fontsource/jetbrains-mono/latin-600.css'

import './styles/main.css'

const app = createApp(App)
app.use(router)
app.use(i18n)
app.mount('#app')
