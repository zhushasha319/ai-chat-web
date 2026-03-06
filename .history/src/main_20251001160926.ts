import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import router from './router/index.ts'
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'
import App from './App.vue'

// 核心样式，请确保按此顺序导入
import 'element-plus/dist/index.css' // Element Plus 基础样式
import 'element-plus/theme-chalk/dark/css-vars.css' // Element Plus 暗色主题变量
import './assets/tailwind.css' // Tailwind CSS
import './style.css' // 全局自定义样式

// Element Plus 组件
import ElementPlus from 'element-plus'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

const app = createApp(App)

// 注册 Element Plus
app.use(ElementPlus)

// 注册所有图标组件
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.use(pinia)
app.use(router)
app.mount('#app')