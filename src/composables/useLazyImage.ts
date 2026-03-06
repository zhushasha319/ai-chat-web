import { ref, onUnmounted } from "vue";

/**
 * 图片懒加载 composable
 *
 * 使用 IntersectionObserver API 实现：
 * - 当图片进入视口时才开始加载
 * - 支持自定义 rootMargin 提前加载
 * - 自动清理 observer 防止内存泄漏
 */
export function useLazyImage(options: IntersectionObserverInit = {}) {
  // 存储所有被观察的元素及其回调
  const observedElements = new Map<Element, () => void>();

  // 创建 IntersectionObserver 实例
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const callback = observedElements.get(entry.target);
          if (callback) {
            callback();
            // 触发后停止观察该元素
            observer.unobserve(entry.target);
            observedElements.delete(entry.target);
          }
        }
      });
    },
    {
      rootMargin: "100px", // 提前 100px 开始加载
      threshold: 0,
      ...options,
    },
  );

  /**
   * 观察一个元素
   * @param element 要观察的 DOM 元素
   * @param onIntersect 元素进入视口时的回调
   */
  function observe(element: Element, onIntersect: () => void) {
    if (observedElements.has(element)) {
      return;
    }
    observedElements.set(element, onIntersect);
    observer.observe(element);
  }

  /**
   * 停止观察一个元素
   */
  function unobserve(element: Element) {
    observer.unobserve(element);
    observedElements.delete(element);
  }

  /**
   * 销毁 observer
   */
  function destroy() {
    observer.disconnect();
    observedElements.clear();
  }

  // 组件卸载时自动清理
  onUnmounted(() => {
    destroy();
  });

  return {
    observe,
    unobserve,
    destroy,
  };
}

/**
 * 创建单个图片的懒加载状态
 */
export function useLazyImageState() {
  const isLoaded = ref(false);
  const isError = ref(false);
  const isLoading = ref(false);

  function startLoading() {
    isLoading.value = true;
    isError.value = false;
  }

  function onLoad() {
    isLoading.value = false;
    isLoaded.value = true;
  }

  function onError() {
    isLoading.value = false;
    isError.value = true;
  }

  return {
    isLoaded,
    isError,
    isLoading,
    startLoading,
    onLoad,
    onError,
  };
}
