import { defineStore } from 'pinia'


export const useSettings = defineStore('settings', {
  state: () => ({
	theme: 'system' as 'light' | 'dark' | 'system',
	apiBase: '/api',
	model: 'gpt-4o-mini',
	systemPrompt: 'You are a helpful assistant.',
	apiKey: '', // 仅存储在本地的 API Key，不会上传
  }),
  persist: true, // 持久化到 localStorage
})