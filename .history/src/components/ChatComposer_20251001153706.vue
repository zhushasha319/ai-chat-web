<template>
  <div class="composer-root">
    <!-- 居中外壳（ChatGPT 的大圆角卡片） -->
    <div class="composer-shell" :class="{ 'is-streaming': streaming }">
      <!-- 工具栏（可选：附件、截屏、清空等） -->
      <!-- <div class="toolbar">
        <el-tooltip content="新对话" placement="top">
          <el-button text @click="$emit('new-chat')" :icon="Plus"/>
        </el-tooltip>
        <el-tooltip content="上传文件" placement="top">
          <el-button text @click="$emit('upload')" :icon="Paperclip"/>
        </el-tooltip>
      </div> -->

      <!-- 文本域（自动增高、圆角） -->
      <el-input
        v-model="text"
        type="textarea"
        :autosize="{ minRows: 1, maxRows: 8 }"
        :maxlength="4000"
        placeholder="发送消息…"
        class="composer-textarea"
        @keydown.enter.exact.prevent="onEnter"
        @keydown.shift.enter.exact.prevent="onShiftEnter"
      />

      <!-- 右下角操作按钮（和 ChatGPT 一样悬浮在卡片右下） -->
      <div class="actions">
        <el-button
          v-if="streaming"
          type="warning"
          :icon="CircleClose"
          size="small"
          @click="emitStop"
          >停止</el-button
        >
        <el-button
          v-else
          type="primary"
          size="small"
          :disabled="!canSend"
          @click="emitSend"
          >发送</el-button>
      </div>
    </div>

    <!-- 提示行（居中、浅灰） -->
    <div class="tips">Enter 发送 · Shift+Enter 换行</div>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted } from "vue";
import {
  CircleClose,
  Promotion,
  Plus,
  Paperclip,
  Delete,
} from "@element-plus/icons-vue";

const emit = defineEmits<{
  (e: "send", payload: string): void;
  (e: "stop"): void;
  (e: "new-chat"): void;
  (e: "upload"): void;
}>();

const text = ref("");
const streaming = defineModel<boolean>("streaming", { default: false });

const canSend = computed(() => text.value.trim().length > 0);

function emitSend() {
  if (!canSend.value) return;
  emit("send", text.value);
  text.value = "";
}

function emitStop() {
  emit("stop");
}

function onEnter() {
  // 纯 Enter 直接发送
  console.log("send");
  emitSend();
}

function onShiftEnter() {
  // Shift+Enter 换行
  text.value += "\n";
}

onMounted(() => {
  console.log('[Composer] mounted');
});
</script>

<style scoped>
/* 整个输入区固定在底部，内容居中 */
.composer-root {
  position: sticky; /* 滚动时吸底；外层 main 用 overflow-y-auto */
  bottom: 0;
  z-index: 10;
  padding: 16px 12px 20px;
  background: linear-gradient(
    to top,
    var(--el-bg-color) 60%,
    rgba(0, 0, 0, 0) 100%
  );
}

/* 居中卡片外壳，仿 ChatGPT：大圆角 + 阴影 + 边框 */
.composer-shell {
  position: relative;
  max-width: 820px; /* 视觉合适的宽度 */
  margin: 0 auto;
  border-radius: 20px;
  padding: 12px;
  background: var(--el-fill-color-blank);
  border: 1px solid var(--el-border-color);
  box-shadow: 0 6px 22px rgba(0, 0, 0, 0.06);
  transition: box-shadow 0.2s ease, border-color 0.2s ease;
}
.composer-shell:focus-within {
  border-color: var(--el-color-primary);
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.08);
}

/* 顶部轻工具栏 */
.toolbar {
  display: flex;

  color: var(--el-text-color-secondary);
}

/* 文本域样式：去掉默认边框，做成无边输入区 */
:deep(.composer-textarea .el-textarea__inner) {
  background: transparent;
  border: none;
  box-shadow: none;
  padding: 6px 8px 0 8px;
  resize: none;
  font-size: 14px;
  line-height: 1.6;
  color: var(--el-text-color-primary);
}
:deep(.composer-textarea .el-input__count) {
  right: 8px;
  bottom: -24px; /* 放到卡片外面一点点 */
}

/* 右下角按钮悬浮（ChatGPT 风格） */
.actions {
  position: absolute;
  right: 10px;
  bottom: 10px;
  display: flex;
  gap: 8px;
}

/* 底部提示文案 */
.tips {
  text-align: center;
  margin-top: 8px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

/* 流式进行中可选态（降低透明度、不可交互等） */
.is-streaming :deep(.el-textarea__inner) {
  caret-color: transparent;
}
@media (max-width: 768px) {
  .composer-shell {
    max-width: 100%;
  }
}
</style>
