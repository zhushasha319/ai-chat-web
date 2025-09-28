// useAutoScroll.ts
import { ref, nextTick } from 'vue'

export function useAutoScroll() {
  const scrollRef = ref<any>(null)    // <el-scrollbar> 实例
  const autoStick = ref(true)         // 是否自动吸底（用户上滑则为 false）
  let raf = 0//requestAnimationFrame ID// 用于取消动画

  function getWrap() {
    // Element Plus 暴露的滚动容器
    return scrollRef.value?.wrapRef as HTMLElement | null
  }

  function isNearBottom(threshold = 120) {
    const el = getWrap()
    if (!el) return true
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight
    return dist <= threshold
  }
  //el.scrollHeight
// 整个内容区域的总高度（包含已经滚过去的部分 + 可见部分 + 还没看到的部分）。

// el.scrollTop
// 已经滚动的高度，也就是「当前视口顶部距离整个内容顶部」的像素值。

// el.clientHeight
// 当前容器可见区域的高度。

  async function scrollToBottom(opts: ScrollToOptions = { behavior: 'smooth' }) {
    const el = getWrap()
    if (!el) return
    await nextTick()
    el.scrollTo({ top: el.scrollHeight, ...opts })// 滚动到最底部
  }

  // 当有新块流式追加时调用（节流到 rAF）
  function maybeAutoScroll() {
    if (!autoStick.value) return
    cancelAnimationFrame(raf)
    raf = requestAnimationFrame(() => scrollToBottom({ behavior: 'auto' }))
  }

  // 监听用户手动滚动，离底超出阈值就关闭“吸底”
  function onUserScroll() {
    autoStick.value = isNearBottom()
  }

  return { scrollRef, autoStick, scrollToBottom, maybeAutoScroll, onUserScroll, isNearBottom }
}
