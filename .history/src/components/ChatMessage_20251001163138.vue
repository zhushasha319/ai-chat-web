<template>
  <div class="row" :class="rowClass">
    <!-- 助手头像（仅 assistant 显示） -->
    <div class="avatar" v-if="msg.role==='assistant'">
      <el-icon><Avatar /></el-icon>
    </div>
    <div class="avatar" v-else />

    <!-- 内容块 -->
    <div class="bubble-wrap">
      <div class="bubble">
        <!-- 文本 / 图片 分支 -->
        <div v-if="msg.type !== 'image'" class="content">
          <MarkdownView v-if="msg.role==='assistant'" :source="msg.content" />
          <div v-else class="user-text">{{ msg.content }}</div>
        </div>
        <div v-else class="image-wrapper">
          <div class="image-skeleton" v-if="!imgLoaded && !imgError"></div>
          <img
            ref="imgRef"
            :data-src="msg.imageUrl"
            :alt="msg.content || 'image'"
            class="chat-image"
            @load="onImgLoad"
            @error="onImgError"
          />
          <div v-if="imgError" class="image-error">
            <el-icon><WarningFilled/></el-icon>
            <span>图片加载失败</span>
          </div>
        </div>

        <!-- streaming 提示（小圆点/转圈） -->
        <div v-if="msg.meta?.streaming && msg.type !== 'image'" class="streaming">
          <el-icon class="spin"><Loading/></el-icon>
          <span>正在生成…</span>
        </div>

        <!-- 错误提示 -->
        <div v-if="msg.meta?.error" class="error">
          <el-icon><WarningFilled/></el-icon>
          <span>{{ msg.meta.error }}</span>
        </div>

        <!-- 工具栏：hover 时显示，且非 streaming -->
        <div class="tools" v-if="msg.role==='assistant' && !msg.meta?.streaming && msg.type !== 'image'">
          <el-button text size="small" :icon="DocumentCopy" class="tool-btn" @click="copyMessage">复制</el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import type { Message } from '@/types/chat'
import MarkdownView from './MarkdownView.vue'
import { ElMessage } from 'element-plus'
import { DocumentCopy, Loading, WarningFilled } from '@element-plus/icons-vue'

const props = defineProps<{ msg: Message }>()
const rowClass = computed(() => props.msg.role === 'user' ? 'row-user' : 'row-assistant')

async function copyMessage() {
  try {
    await navigator.clipboard.writeText(props.msg.content || '')
    ElMessage.success('已复制到剪贴板')
  } catch {
    ElMessage.error('复制失败')
  }
}

// 图片懒加载逻辑
const imgRef = ref<HTMLImageElement | null>(null)
const imgLoaded = ref(false)
const imgError = ref(false)
let observer: IntersectionObserver | null = null

function loadRealImage() {
  const el = imgRef.value
  if (!el || imgLoaded.value || imgError.value) return
  const real = el.getAttribute('data-src')
  if (!real) return
  el.src = real
}

function onImgLoad() {
  imgLoaded.value = true
  imgRef.value?.classList.add('is-loaded')
}

function onImgError() {
  imgError.value = true
}

onMounted(() => {
  if (props.msg.type !== 'image') return
  const el = imgRef.value
  if (!el) return
  if (!('IntersectionObserver' in window)) {
    loadRealImage()
    return
  }
  observer = new IntersectionObserver((entries) => {
    entries.forEach(en => {
      if (en.isIntersecting) {
        loadRealImage()
        observer && observer.unobserve(en.target)
      }
    })
  }, { root: null, rootMargin: '120px 0px', threshold: 0.01 })
  observer.observe(el)
})

onBeforeUnmount(() => {
  observer?.disconnect()
  observer = null
})
</script>

<style scoped>
/* 整行容器：限制总宽，左右留白；和 ChatGPT 一样居中 */
.row {
  display: grid;
  grid-template-columns: 20px 1fr; /* 头像列 + 内容列 */
  gap: 12px;
  max-width: 820px;
  margin: 0 auto;
  padding: 14px 16px;
}

/* 行背景（可选：轻微条纹感，接近 ChatGPT） */
.row-assistant { background: rgba(0,0,0,0.02); }
.row-user      { background: transparent; }

/* 头像 */
.avatar { display: flex; align-items: flex-start; }
.avatar-box {
  width: 28px; height: 28px; border-radius: 6px;
  background: var(--el-fill-color);
  border: 1px solid var(--el-border-color);
}

/* 内容外层，控制对齐与宽度 */
.bubble-wrap { display: flex; }
.row-user .bubble-wrap { justify-content: flex-end; }

/* 泡泡主体（两套视觉） */
.bubble {
  position: relative;
  max-width: 75%;
  min-width: 24px;
  padding: 12px 14px;
  border-radius: 14px;
}

/* 助手块：白底+细边框+轻阴影（更像卡片） */
.row-assistant .bubble {
  background: var(--el-fill-color-blank);
  border: 1px solid var(--el-border-color);
  box-shadow: 0 2px 10px rgba(0,0,0,0.04);
}

/* 用户块：蓝底白字，圆角更大 */
.row-user .bubble {
  background: #2f6ae0;
  color: #fff;
  border-radius: 18px;
}

/* 文本/Markdown */
.content { line-height: 1.7; font-size: 15px; color: var(--el-text-color-primary); }
.row-user .content, .row-user .user-text { color: #fff; }

/* Markdown 细节（继承色、紧凑间距、卡片代码块） */
.content :deep(.prose) { max-width: none; color: inherit; font-size: inherit; }
.content :deep(.prose p) { margin: 0.75em 0; }
.content :deep(.prose p:first-child){ margin-top: 0; }
.content :deep(.prose p:last-child){ margin-bottom: 0; }
.content :deep(pre) {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 12px;
  overflow-x: auto;
  margin: 0.9em 0;
}
.row-user .content :deep(pre) {
  /* 用户蓝底里代码块也可可读：弱化背景 */
  background: rgba(255,255,255,0.12);
  border-color: rgba(255,255,255,0.2);
}

/* streaming 提示 */
.streaming {
  display: inline-flex; align-items: center; gap: 6px;
  margin-top: 8px; color: var(--el-text-color-secondary); font-size: 13px;
}
.spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* 错误提示 */
.error {
  margin-top: 8px; padding: 8px 12px; border-radius: 8px;
  background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; font-size: 13px;
}

/* 工具栏：hover 显示（ChatGPT 风格） */
.tools {
  position: absolute; left: 5px; bottom: 5px;
  display: flex; gap: 6px; opacity: 0; pointer-events: none;
  transition: opacity .15s ease;
}
.row:hover .tools { opacity: 1; pointer-events: auto; }
.tool-btn { --el-button-text-color:#6b7280; --el-button-hover-bg-color:#f3f4f6; border-radius: 6px; }

/* 图片消息 */
.image-wrapper { position: relative; max-width: 70%; }
.row-user .image-wrapper { justify-content: flex-end; }
.chat-image { display:block; max-width:100%; border-radius:10px; background:#f3f3f3; opacity:0; transition:opacity .3s ease; }
.chat-image.is-loaded { opacity:1; }
.image-skeleton { position:absolute; inset:0; border-radius:10px; background:linear-gradient(110deg,#eee 8%,#f5f5f5 18%,#eee 33%); background-size:200% 100%; animation:shimmer 1.1s linear infinite; }
@keyframes shimmer { to { background-position-x:-200%; } }
.image-error { position:absolute; inset:0; display:flex; flex-direction:column; justify-content:center; align-items:center; gap:6px; font-size:12px; color:#dc2626; background:#fff; border:1px solid #fecaca; border-radius:10px; }

/* 小屏优化 */
@media (max-width: 768px) {
  .row { padding: 12px 12px; }
  .bubble { max-width: 90%; }
}
</style>

