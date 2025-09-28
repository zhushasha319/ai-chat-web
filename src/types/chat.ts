export type Role = 'user' | 'assistant' | 'system'

// message from user or assistant or system
export interface Message {
id: string
role: Role
content: string
createdAt: number
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