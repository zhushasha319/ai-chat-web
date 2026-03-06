import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

// 加载环境变量
dotenv.config()

const app = express()
const PORT = 3001

// 千问 API 配置 - 默认从环境变量读取，可被每次请求头 Authorization: Bearer xxx 覆盖
const ENV_QWEN_API_KEY = process.env.QWEN_API_KEY || ''
const QWEN_API_URL = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation'


// 中间件
app.use(cors())
app.use(express.json())

// 千问 API 流式聊天
app.post('/api/chat/stream', async (req, res) => {
  console.log('🆕 收到聊天流请求 /api/chat/stream')
  const { messages, model = 'qwen-turbo' } = req.body
  // 允许客户端通过 Authorization 传入临时 key
  const authHeader = req.headers['authorization'] || ''
  const match = authHeader.match(/Bearer (.+)/i)
  const requestKey = match ? match[1].trim() : ''
  const effectiveKey = requestKey || ENV_QWEN_API_KEY
  if (!effectiveKey) {
    res.status(400).json({ error: '缺少千问 API Key', detail: '请在 .env 设置 QWEN_API_KEY 或前端设置中填写 API Key' })
    return
  }

  // 正确的 SSE 响应头（很关键）
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no') // Nginx 反向代理下避免缓冲
  // 立即把响应头刷给客户端
  // @ts-ignore
  res.flushHeaders && res.flushHeaders()
  // 先发一个注释 + 心跳，确保浏览器尽快进入事件模式
  res.write(': connected\n')
  res.write('event: ping\n')
  res.write('data: 0\n\n')
  // @ts-ignore
  res.flush && res.flush()

  try {
    console.log('➡️ 准备向千问上游发起请求 model=', model)
    const qwenPayload = {
      model,
      input: { messages: messages.map(m => ({ role: m.role, content: m.content })) },
      parameters: { result_format: 'message', incremental_output: true }
    }

    const upstream = await fetch(QWEN_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${effectiveKey}`,
        'Content-Type': 'application/json',
        'X-DashScope-SSE': 'enable',
        'Accept': 'text/event-stream'
      },
      body: JSON.stringify(qwenPayload)
    })
    console.log('⬅️ 上游响应状态:', upstream.status, upstream.statusText)

    if (!upstream.ok || !upstream.body) {
      const errorBody = await upstream.text().catch(() => '无法读取上游错误响应体')
      console.error('❌ 上游 API 请求失败:', errorBody)
      const errorData = { error: `上游API错误 ${upstream.status}`, detail: errorBody }
      res.write(`data: ${JSON.stringify(errorData)}\n\n`)
      res.write('data: [DONE]\n\n')
      return res.end()
    }

    console.log('✅ 上游连接成功，开始转发数据流...')
    const reader = upstream.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let totalDeltas = 0
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      let idx
      while ((idx = buffer.indexOf('\n')) >= 0) {
        let rawLine = buffer.slice(0, idx)
        buffer = buffer.slice(idx + 1)
        let line = rawLine.trim()
        if (!line) continue
        if (line.startsWith('data:')) {
          const payload = line.slice(5).trim()
          if (payload === '[DONE]') {
            res.write('data: [DONE]\n\n')
            // @ts-ignore
            res.flush && res.flush()
            return res.end()
          }
          try {
            const json = JSON.parse(payload)
            const delta = json?.output?.choices?.[0]?.message?.content ?? ''
            if (delta) {
              totalDeltas++
              const oaiLike = { choices: [{ delta: { content: delta } }] }
              console.log('📤 发送数据块:', delta.substring(0, 20) + '...')
              res.write(`data: ${JSON.stringify(oaiLike)}\n\n`)
              // @ts-ignore
              res.flush && res.flush()
            }
          } catch (e) {
            console.log('❌ JSON 解析失败（行驱动）片段:', payload.slice(0,120))
          }
        }
      }
    }

    // 保险：流结束
    console.log('✅ 上游流结束，汇总 delta 次数:', totalDeltas)
    res.write('data: [DONE]\n\n')
    // @ts-ignore
    res.flush && res.flush()
    res.end()
  } catch (err) {
    console.error('❌ 服务器异常 (主 try) :', err)
    res.write(`data: ${JSON.stringify({ error: 'server', detail: err?.message })}\n\n`)
    res.write('data: [DONE]\n\n')
    res.end()
  }
})

// 简单调试流：不依赖上游，验证前端解析
app.all('/api/debug/stream', (req, res) => {
  console.log('🧪 调试流启动 /api/debug/stream')
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  // @ts-ignore
  res.flushHeaders && res.flushHeaders()
  const chunks = ['调试',' 流式',' 输出',' 正常',' ✔\n']
  let i = 0
  // 立即发送首块
  const first = { choices: [{ delta: { content: chunks[i++] } }] }
  res.write(`data: ${JSON.stringify(first)}\n\n`)
  // @ts-ignore
  res.flush && res.flush()
  console.log('🧪 调试流首块已发送')
  const timer = setInterval(() => {
    if (i < chunks.length) {
      const oaiLike = { choices: [{ delta: { content: chunks[i] } }] }
      res.write(`data: ${JSON.stringify(oaiLike)}\n\n`)
      // @ts-ignore
      res.flush && res.flush()
      console.log('🧪 调试流发送块:', chunks[i])
      i++
    } else {
      clearInterval(timer)
      res.write('data: [DONE]\n\n')
      res.end()
      console.log('🧪 调试流结束')
    }
  }, 600)
})


// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() })
})

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 聊天 API 服务器运行在 http://localhost:${PORT}`)
  console.log(`📡 聊天接口: POST http://localhost:${PORT}/api/chat/stream`)
  console.log(`❤️  健康检查: GET http://localhost:${PORT}/api/health`)
})

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n👋 服务器关闭中...')
  process.exit(0)
})