import { onScopeDispose, nextTick } from 'vue'

type OnChunk = (text: string) => void
type OnError = (err: Error) => void
type OnFinish = () => void

export function useSSE() {
  let controller: AbortController | null = null

  async function start(
    url: string,
    payload: any,
    onChunk: OnChunk,
    opts?: { onError?: OnError; onFinish?: OnFinish; headers?: Record<string, string>; debug?: boolean }
  ) {
    // 中止上一个正在进行的请求
    if (controller) {
      stop()
    }
    
    // 为当前请求创建一个新的 AbortController
    controller = new AbortController()
    const currentController = controller

    let res: Response
    try {
      opts?.debug && console.debug('[SSE] POST', url, payload)
      res = await fetch(url, {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json', ...(opts?.headers || {}) },
        signal: currentController.signal,
      })
    } catch (e: any) {
      if (currentController.signal.aborted) {
        return
      }
      // 如果是相对路径且失败，尝试直接连后端 3001 端口（排查代理）
      if (url.startsWith('/api/')) {
        const fallback = `http://localhost:3001${url}`
        try {
          opts?.debug && console.warn('[SSE] fallback POST', fallback)
          res = await fetch(fallback, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { 'Content-Type': 'application/json', ...(opts?.headers || {}) },
            signal: currentController.signal,
          })
        } catch (e2: any) {
          opts?.onError?.(new Error(e2?.message || 'Network error'))
          throw e2
        }
      } else {
        opts?.onError?.(new Error(e?.message || 'Network error'))
        throw e
      }
    }

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      const err = new Error(`HTTP ${res.status}: ${text}`)
      opts?.debug && console.error('[SSE] HTTP error', err)
      opts?.onError?.(err)
      throw err
    }
    if (!res.body) {
      const err = new Error('No stream body')
      opts?.debug && console.error('[SSE] No body')
      opts?.onError?.(err)
      throw err
    }

    // SSE 数据处理
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let doneFlag = false
    
    try {
      while (true) {
        if (currentController.signal.aborted) {
          break
        }

        const { value, done } = await reader.read()
        if (done) {
          break
        }

        const chunk = decoder.decode(value, { stream: true })
        if (!chunk) continue
        
        buffer += chunk.replace(/\r/g, '')

        // 处理 SSE 行
        let idx: number
        while ((idx = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, idx).trim()
          buffer = buffer.slice(idx + 1)

          if (!line || line.startsWith(':') || line.startsWith('event:')) {
            continue
          }

          if (line.startsWith('data:')) {
            const payloadStr = line.slice(5).trim()
            
            if (payloadStr === '[DONE]') {
              opts?.debug && console.debug('[SSE] DONE')
              doneFlag = true
              break
            }

            if (payloadStr === '0') {
              continue
            }

            try {
              const data = JSON.parse(payloadStr)
              const content = data?.choices?.[0]?.delta?.content
              if (content) {
                opts?.debug && console.debug('[SSE] chunk:', content.slice(0, 40))
                onChunk(content)
              }
            } catch (err) {
              opts?.debug && console.warn('[SSE] JSON parse fail line=', payloadStr.slice(0,120))
            }
          }
        }
        if (doneFlag) {
          break
        }
      }
    } catch (err: any) {
      if (!currentController.signal.aborted) {
        opts?.debug && console.error('[SSE] exception', err)
        opts?.onError?.(err)
      }
    } finally {
      if (opts?.onFinish) {
        opts.onFinish()
      }
      await nextTick()
    }
  }

  function stop() {
    if (controller) {
      controller.abort()
      controller = null
    }
  }

  onScopeDispose(() => stop())
  return { start, stop }
}
