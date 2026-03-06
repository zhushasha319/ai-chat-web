<template>
  <DynamicScroller
    class="virtual-chat-scroller"
    :items="items"
    :min-item-size="80"
    key-field="id"
    ref="scrollerRef"
    @scroll.passive="onScroll"
  >
    <template #default="{ item, index, active }">
      <DynamicScrollerItem
        :item="item"
        :index="index"
        :active="active"
        :size-dependencies="[item.content, item.meta?.streaming]"
        :data-id="item.id"
      >
        <ChatMessage :msg="item" />
      </DynamicScrollerItem>
    </template>
  </DynamicScroller>
</template>

<script lang="ts" setup>
import { ref, watch, nextTick, onUnmounted, computed } from "vue";
import { DynamicScroller, DynamicScrollerItem } from "vue-virtual-scroller";
import "vue-virtual-scroller/dist/vue-virtual-scroller.css";
import ChatMessage from "@/components/ChatMessage.vue";
import type { Message } from "@/types/chat";
import { throttle } from "lodash-es";

const props = defineProps<{
  items: Message[];
  autoStick: boolean;
}>();

const emits = defineEmits<{
  (e: "user-scroll", nearBottom: boolean): void;
}>();

const scrollerRef = ref<any>(null);

// 获取滚动容器元素
function getScrollElement(): HTMLElement | null {
  return scrollerRef.value?.$el as HTMLElement | null;
}

// 判断是否接近底部
function isNearBottom(threshold = 120): boolean {
  const el = getScrollElement();
  if (!el) return true;
  const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
  return dist <= threshold;
}

/**
 * 滚动到底部
 * @param behavior - 滚动行为：'smooth' 平滑滚动，'auto' 立即滚动
 */
function scrollToBottom(behavior: ScrollBehavior = "auto") {
  const el = getScrollElement();
  if (!el) return;
  el.scrollTo({
    top: el.scrollHeight,
    behavior,
  });
}

// 用于流式输出时的 rAF 滚动
let rafId = 0;

/**
 * 流式输出时调用，使用 rAF 合并滚动请求
 * 仿 ChatGPT：内容增加时自动保持在底部
 */
function maybeAutoScroll() {
  if (!props.autoStick) return;
  cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(() => {
    scrollToBottom("auto");
  });
}

/**
 * 滚动事件处理（节流优化）
 * 检测用户是否手动滚动离开底部
 */
const onScroll = throttle(
  () => {
    const near = isNearBottom();
    emits("user-scroll", near);
  },
  100,
  { leading: true, trailing: true },
);

// 监听消息数量变化 - 新消息时滚动到底部
watch(
  () => props.items.length,
  async () => {
    if (!props.autoStick) return;
    await nextTick();
    scrollToBottom("smooth");
  },
);

// 监听最后一条消息的内容变化（流式输出）
const lastMessage = computed(() => {
  const len = props.items.length;
  return len > 0 ? props.items[len - 1] : null;
});

watch(
  () => lastMessage.value?.content,
  () => {
    // 流式输出时，内容变化触发滚动
    if (lastMessage.value?.meta?.streaming) {
      maybeAutoScroll();
    }
  },
);

// 清理
onUnmounted(() => {
  onScroll.cancel();
  cancelAnimationFrame(rafId);
});

// 暴露方法给父组件
defineExpose({
  scrollToBottom,
  isNearBottom,
  maybeAutoScroll,
});
</script>

<style scoped>
.virtual-chat-scroller {
  height: 100%;
  overflow: auto;
  padding: 0;
  /* 优化滚动性能 */
  will-change: scroll-position;
  -webkit-overflow-scrolling: touch;
}
</style>
