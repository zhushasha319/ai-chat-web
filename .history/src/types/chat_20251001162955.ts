export type Role = 'user' | 'assistant' | 'system'

/**
 * Chat 消息模型
 * - 默认 text：按现有逻辑（SSE 增量写入 content）
 * - image：不参与 SSE 追加，显示占位 -> 进入视口懒加载真实图片
 *   - imageUrl: 实际图片地址
 *   - placeholderUrl: 可选占位（模糊缩略图/Base64）
 */
export interface Message {
	id: string
	role: Role
	/** 消息类型：不填或 'text' 表示普通文本；'image' 表示图片消息 */
	type?: 'text' | 'image'
	/** 文本内容；image 时用于 alt 描述或回退文案 */
	content: string
	createdAt: number
	/** 图片真实地址（仅 type==='image' 时使用） */
	imageUrl?: string
	/** 小图/模糊占位（可选） */
	placeholderUrl?: string
	meta?: { streaming?: boolean; error?: string | null }
}

// conversation with multiple messages
export interface Conversation {
id: string
title: string
systemPrompt?: string 
messages: Message[]
pinned?: boolean
updatedAt: number
}