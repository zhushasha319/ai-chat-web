<template>
  <DynamicScroller
    class="virtual-chat-scroller"
    :items="items"
    :min-item-size="80"
    key-field="id"
    v-bind="scrollerProps"
    ref="scrollerRef"
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
import { ref, watch, nextTick, onMounted, onUnmounted } from "vue";
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

function scrollToBottom(behavior: ScrollBehavior = "auto") {
  const el = scrollerRef.value?.$el?.querySelector(".virtual-chat-scroller");
  if (!el) return;
  // 直接滚到底
  el.scrollTop = el.scrollHeight;
}

let userScrolling = false;

/**
 * 滚动事件处理（节流优化）
 *
 * 使用 throttle 的原因：
 * 1. scroll 事件触发频率极高（可达 60+ 次/秒）
 * 2. 每次触发都要计算 scrollHeight/scrollTop/clientHeight
 * 3. 节流到 100ms 可减少 90% 的计算量，同时保持流畅的用户体验
 *
 * 配置说明：
 * - leading: true - 第一次滚动立即响应，提供即时反馈
 * - trailing: true - 最后一次滚动也会执行，确保最终状态正确
 */
const onScroll = throttle(
  (e: Event) => {
    const el = e.target as HTMLElement;
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
    const near = dist < 120;
    emits("user-scroll", near);
    userScrolling = !near;
  },
  100,
  { leading: true, trailing: true },
);

// 组件挂载时绑定滚动事件
onMounted(() => {
  const el = scrollerRef.value?.$el;
  if (el) {
    el.addEventListener("scroll", onScroll, { passive: true });
  }
});

// 组件卸载时清理事件监听和节流函数
onUnmounted(() => {
  const el = scrollerRef.value?.$el;
  if (el) {
    el.removeEventListener("scroll", onScroll);
  }
  // 取消节流函数的待执行调用
  onScroll.cancel();
});

watch(
  () => props.items.length,
  async () => {
    if (!props.autoStick) return;
    await nextTick();
    scrollToBottom("auto");
  },
);
</script>

<style scoped>
.virtual-chat-scroller {
  height: 100%;
  overflow: auto;
  padding: 0;
}
</style>
