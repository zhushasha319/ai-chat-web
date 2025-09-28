import { createRouter, createWebHistory } from 'vue-router'
import { useConversations } from '@/stores/conversations'

const routes = [
  { path: '/', redirect: '/chat' },
  { 
    path: '/chat', 
    redirect: () => {
      const conversations = useConversations()
      conversations.ensureFirst()
      return `/chat/${conversations.currentId}`
    }
  },
  { path: '/chat/:id', component: () => import('@/pages/ChatRoom.vue') },
  { path: '/settings', component: () => import('@/pages/Settings.vue') },
]

export default createRouter({
  history: createWebHistory(),
  routes,
})
