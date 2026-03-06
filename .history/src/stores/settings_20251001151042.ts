import { defineStore } from 'pinia'

/**
 * 全局可配置设置：
 * - apiBase: 后端服务基础路径（前端将拼接成 `${apiBase}/chat/stream`）。
 *   默认 /api 以便通过本地 devServer 代理；若你本地直接启 3001 端口，可改成 http://localhost:3001/api
 * - model: 千问模型名称，示例：qwen-turbo, qwen-plus, qwen-max 等
 * - systemPrompt: 会作为对话第一条 system 消息插入（如果当前对话还没有 system 消息）
 * - apiKey: 用户填写的临时密钥；若留空则后端使用 .env 中 QWEN_API_KEY
 */
export const useSettings = defineStore('settings', {
	state: () => ({
		apiBase: '/api',
		model: 'qwen-turbo',
		systemPrompt: 'You are a helpful assistant.',
		apiKey: '', // 仅存储在本地，不会上传
	}),
	persist: true, // 持久化到 localStorage
})