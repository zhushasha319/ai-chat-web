// useAutoScroll.ts
import { ref, nextTick, onUnmounted } from "vue";
import { throttle } from "lodash-es";

export function useAutoScroll() {
  const scrollRef = ref<any>(null); // <el-scrollbar> 实例
  const autoStick = ref(true); // 是否自动吸底（用户上滑则为 false）
  let raf = 0; // requestAnimationFrame ID，用于取消动画

  function getWrap() {
    // Element Plus 暴露的滚动容器
    return scrollRef.value?.wrapRef as HTMLElement | null;
  }

  function isNearBottom(threshold = 120) {
    const el = getWrap();
    if (!el) return true;
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
    return dist <= threshold;
  }
  // el.scrollHeight - 整个内容区域的总高度
  // el.scrollTop - 已经滚动的高度
  // el.clientHeight - 当前容器可见区域的高度

  async function scrollToBottom(
    opts: ScrollToOptions = { behavior: "smooth" },
  ) {
    const el = getWrap();
    if (!el) return;
    await nextTick();
    el.scrollTo({ top: el.scrollHeight, ...opts }); // 滚动到最底部
  }

  // 当有新块流式追加时调用（节流到 rAF）
  function maybeAutoScroll() {
    if (!autoStick.value) return;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => scrollToBottom({ behavior: "auto" }));
  }

  /**
   * 监听用户手动滚动，离底超出阈值就关闭"吸底"
   *
   * 使用 throttle 优化：
   * - scroll 事件触发频率很高（可达 60+ 次/秒）
   * - 只需周期性检测用户是否接近底部
   * - 100ms 间隔足够平衡性能与响应性
   */
  const onUserScroll = throttle(
    () => {
      autoStick.value = isNearBottom();
    },
    100,
    { leading: true, trailing: true },
  );

  // 清理节流函数和 rAF
  onUnmounted(() => {
    onUserScroll.cancel();
    cancelAnimationFrame(raf);
  });

  return {
    scrollRef,
    autoStick,
    scrollToBottom,
    maybeAutoScroll,
    onUserScroll,
    isNearBottom,
  };
}
