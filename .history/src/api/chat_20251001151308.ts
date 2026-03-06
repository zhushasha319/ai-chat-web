import { useSettings } from '@/stores/settings'

/**
 * 说明：此前这里调用的是 `/chat/completions`（OpenAI 风格），现在项目已统一改用后端
 * `/api/chat/stream` (SSE)。如果后续需要非流式补全，可在这里新增一个普通接口。
 * 目前该文件仅保留一个辅助函数，供未来扩展或避免其它地方误引用旧路径。
 */

export interface ChatRequest {
	model: string
	messages: { role: 'system' | 'user' | 'assistant'; content: string }[]
}

/**
 * 预留的非流式调用（当前后端未实现对应 JSON 一次性返回，仅示例）。
 * 若需要，请在 server.js 中新增 /api/chat (非 stream) 路由。
 */
export async function completeOnce(req: ChatRequest) {
	const setting = useSettings()
	const base = setting.apiBase.replace(/\/$/, '')
	const url = `${base}/chat/stream` // 暂时仍指向流接口，仅做占位
	const res = await fetch(url, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: setting.apiKey ? `Bearer ${setting.apiKey}` : '',
		},
		body: JSON.stringify({ ...req }),
	})
	return res
}

// 建议：真实使用流请直接在组件中使用 useSSE + settings