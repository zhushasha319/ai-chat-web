<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { useLazyImageState } from "@/composables/useLazyImage";

/**
 * 懒加载图片组件
 *
 * 特性：
 * - 图片进入视口时才加载
 * - 显示加载占位符
 * - 加载失败显示错误状态
 * - 支持渐入动画效果
 */

const props = withDefaults(
  defineProps<{
    src: string;
    alt?: string;
    placeholderSrc?: string; // 占位图片
    errorSrc?: string; // 错误时显示的图片
  }>(),
  {
    alt: "",
    placeholderSrc: "",
    errorSrc: "",
  },
);

const emit = defineEmits<{
  load: [];
  error: [error: Event];
}>();

const containerRef = ref<HTMLDivElement>();
const realSrc = ref("");
const { isLoaded, isError, isLoading, startLoading, onLoad, onError } =
  useLazyImageState();

let observer: IntersectionObserver | null = null;

function handleLoad() {
  onLoad();
  emit("load");
}

function handleError(e: Event) {
  onError();
  emit("error", e);
}

function loadImage() {
  startLoading();
  realSrc.value = props.src;
}

onMounted(() => {
  if (!containerRef.value) return;

  // 创建 IntersectionObserver
  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !isLoaded.value && !isLoading.value) {
          loadImage();
          observer?.disconnect();
        }
      });
    },
    {
      rootMargin: "100px", // 提前 100px 开始加载
      threshold: 0,
    },
  );

  observer.observe(containerRef.value);
});

onUnmounted(() => {
  observer?.disconnect();
});
</script>

<template>
  <div ref="containerRef" class="lazy-image-container">
    <!-- 占位符 -->
    <div v-if="!isLoaded && !isError" class="lazy-image-placeholder">
      <img
        v-if="placeholderSrc"
        :src="placeholderSrc"
        :alt="alt"
        class="placeholder-img"
      />
      <div v-else class="placeholder-skeleton">
        <svg
          class="placeholder-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21,15 16,10 5,21" />
        </svg>
      </div>
      <!-- 加载中指示器 -->
      <div v-if="isLoading" class="loading-spinner" />
    </div>

    <!-- 实际图片 -->
    <img
      v-if="realSrc && !isError"
      :src="realSrc"
      :alt="alt"
      class="lazy-image"
      :class="{ 'is-loaded': isLoaded }"
      @load="handleLoad"
      @error="handleError"
    />

    <!-- 错误状态 -->
    <div v-if="isError" class="lazy-image-error">
      <img v-if="errorSrc" :src="errorSrc" :alt="alt" class="error-img" />
      <div v-else class="error-placeholder">
        <svg
          class="error-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="15" y1="9" x2="9" y2="15" />
          <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
        <span>加载失败</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.lazy-image-container {
  position: relative;
  width: 100%;
  min-height: 100px;
  overflow: hidden;
  border-radius: 8px;
  background-color: var(--el-fill-color-lighter, #f5f7fa);
}

.lazy-image-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.placeholder-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: blur(10px);
}

.placeholder-skeleton {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background-color: var(--el-fill-color-light, #ebeef5);
}

.placeholder-icon {
  width: 48px;
  height: 48px;
  color: var(--el-text-color-placeholder, #a8abb2);
  stroke-width: 1.5;
}

.loading-spinner {
  position: absolute;
  width: 32px;
  height: 32px;
  border: 3px solid var(--el-border-color-lighter, #e4e7ed);
  border-top-color: var(--el-color-primary, #409eff);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.lazy-image {
  width: 100%;
  height: auto;
  display: block;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.lazy-image.is-loaded {
  opacity: 1;
}

.lazy-image-error {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 100px;
  padding: 20px;
}

.error-img {
  max-width: 100%;
  height: auto;
}

.error-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: var(--el-text-color-placeholder, #a8abb2);
}

.error-icon {
  width: 32px;
  height: 32px;
  stroke-width: 1.5;
}

.error-placeholder span {
  font-size: 12px;
}
</style>
