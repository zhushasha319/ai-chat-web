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
// 会话增量运行时索引重建（Map）所需
import { useConversations } from '@/stores/conversations'

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
// 在 pinia 注入后，重建会话与消息的运行时 Map 索引（刷新后首次进入时）
// 若还没有任何会话（全新首次使用），等待 ensureFirst() 再建立即可；hydrateRuntime 内部会做空判断
const conv = useConversations()
conv.hydrateRuntime()
app.use(router)
app.mount('#app')