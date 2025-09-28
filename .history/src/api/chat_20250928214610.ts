import { useSettings } from '@/stores/settings'


export interface ChatRequest {
model: string
messages: { role: 'system' | 'user' | 'assistant'; content: string }[]
stream?: boolean
}


export function streamChat(req: ChatRequest): Promise<Response> {
const setting = useSettings()
return fetch(`${setting.apiBase}/chat/completions`, {
method: 'POST',
headers: {
'Content-Type': 'application/json',
Authorization: setting.apiKey ? `Bearer ${setting.apiKey}` : '',
},
body: JSON.stringify({ ...req, stream: true }),
})
}