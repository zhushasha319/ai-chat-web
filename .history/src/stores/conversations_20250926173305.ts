import { defineStore } from 'pinia'
import type { Conversation, Message } from '@/types/chat'

//确保有一个对话 创建新对话 修改对话名字 删除对话 添加消息 更新消息内容（流式更新，错误标记）
const uid = () => crypto.randomUUID()// fallback for older browsers

export const useConversations = defineStore('conversations', {
state: () => ({
items: [] as Conversation[],
currentId: '' as string,
}),
getters: {
current(state) {
return state.items.find(c => c.id === state.currentId) || null
},
},
actions: {
ensureFirst() {
if (!this.items.length) {
const id = uid()
this.items.push({ id, title: 'New Chat', messages: [], updatedAt: Date.now() })
this.currentId = id
}
},
createChat(title = 'New Chat') {
const id = uid()
this.items.unshift({ id, title, messages: [], updatedAt: Date.now() })
this.currentId = id
},
renameChat(id: string, title: string) {
const c = this.items.find(i => i.id === id)
if (c) { c.title = title; c.updatedAt = Date.now() }
},
removeChat(id: string) {
this.items = this.items.filter(i => i.id !== id)
if (this.currentId === id) this.currentId = this.items[0]?.id || ''
},
addMessage(msg: Message) {
const c = this.current
if (!c) return
c.messages.push(msg)
c.updatedAt = Date.now()
},
patchMessage(id: string, patch: Partial<Message>) {
const c = this.current
if (!c) return
const m = c.messages.find(m => m.id === id)
if (m) Object.assign(m, patch)
c.updatedAt = Date.now()
},//ai回复可能出错
},
persist: true, // 持久化到 localStorage
})