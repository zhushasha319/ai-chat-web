// 简单 SSE 测试脚本：直接请求本地后端，打印逐行 data
// 说明：之前使用 getReader() 适用于 WHATWG ReadableStream（原生 fetch / undici）。
// 由于这里使用 node-fetch 返回的是 Node.js Readable（没有 getReader），改为 for await...of 读取。

import fetch from 'node-fetch'

async function main() {
  console.log('启动 SSE 测试...')
  const res = await fetch('http://localhost:3001/api/chat/stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream'
    },
    body: JSON.stringify({
      model: 'qwen-turbo',
      messages: [
        { role: 'user', content: '用一句话介绍一下上海' }
      ]
    })
  })

  if (!res.ok || !res.body) {
    console.error('HTTP error', res.status)
    try { console.log(await res.text()) } catch {}
    return
  }

  // node-fetch 的 res.body 是一个 Node.js Readable，可直接异步迭代
  let buffer = ''
  for await (const chunk of res.body) {
    buffer += chunk.toString('utf8')
    let idx
    while ((idx = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, idx).trim()
      buffer = buffer.slice(idx + 1)
      if (!line.startsWith('data:')) continue
      const payload = line.slice(5).trim()
      console.log('LINE>', payload.substring(0, 150))
      if (payload === '[DONE]') {
        console.log('收到 [DONE]，结束。')
        return
      }
    }
  }
  console.log('流结束（未显式收到 [DONE]）')
}

main().catch(e => console.error('脚本异常:', e))
