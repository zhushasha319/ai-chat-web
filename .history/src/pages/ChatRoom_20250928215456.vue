<template>
  <el-container class="chat-container">
    <!-- 左侧对话列表 -->
    <el-aside width="260px" class="chat-sidebar">
      <div class="sidebar-header">
        <el-button
          type="plain"
          :icon="Edit"
          class="new-chat-btn"
          @click="conversations.createChat()"
        >
          New Chat
        </el-button>
        <el-button
        type="plain"
        :icon="Setting"
        class="new-chat-btn"
        @click="showSettings = true">
        打开设置
        </el-button>
          
        <!-- 主题切换按钮 -->
        <div class="theme-switch-container">
          <el-switch
            :model-value="isDark"
            inline-prompt
            :active-icon="Moon"
            :inactive-icon="Sunny"
            style="--el-switch-on-color: #2c2c2c; --el-switch-off-color: #f2f2f2;"
            @change="toggleDark()"
          />
          <span class="theme-label">{{ isDark ? '深色模式' : '浅色模式' }}</span>
        </div>
      </div>

      <el-scrollbar class="sidebar-content">
        <el-menu
          :default-active="conversations.currentId"
          class="conversation-menu"
        >
          <el-menu-item
            v-for="c in conversations.items"
            :key="c.id"
            :index="c.id"
            @click="go(c.id)"
            class="conversation-item"
          >
            <el-icon><ChatDotRound /></el-icon>
            <span class="conversation-title">{{ c.title }}</span>
          </el-menu-item>
        </el-menu>
      </el-scrollbar>
    </el-aside>

    <!-- 右侧聊天区域 -->
    <el-container direction="vertical" class="chat-main">
      
      <!-- 消息区域 -->
      <el-main class="chat-messages">
        <el-scrollbar ref="scrollRef" class="messages-scrollbar">
          <div class="messages-container">
            <ChatMessage
              v-for="m in current?.messages"
              :key="m.id"
              :msg="m"
              @retry="onRetry"
              @copy="onCopy"
              @delete="onDelete"
              @scroll="onUserScroll"
            />
          </div>
        </el-scrollbar>
      </el-main>

      <!-- 输入区域 -->
      <el-footer height="auto" class="chat-footer">
        <ChatComposer
          v-model:streaming="streaming"
          @send="onSend"
          @stop="onStop"
        />
      </el-footer>
    </el-container>
  </el-container>

  <!-- 设置弹窗 -->
  <el-dialog
    v-model="showSettings"
    title="设置"
    width="720px"
    :close-on-click-modal="false"
    :destroy-on-close="false"
  >
    <Settings />
  </el-dialog>
</template>
<script lang="ts" setup>
import { useRoute, useRouter } from "vue-router";
import { useConversations } from "@/stores/conversations";
import ChatMessage from "@/components/ChatMessage.vue";
import { useSSE } from "@/composables/useSSE";
import { ref, computed } from "vue";
import { ChatDotRound, Edit, Moon, Sunny, Setting } from "@element-plus/icons-vue";
import ChatComposer from "@/components/ChatComposer.vue";
import { useAutoScroll } from "@/composables/useAutoScroll";
import { isDark, toggleDark } from '@/composables/useTheme';
import Settings from "./Settings.vue";
const { scrollRef, scrollToBottom, onUserScroll } = useAutoScroll();

// 控制设置弹窗的显示与隐藏
const showSettings = ref(false);

const conversations = useConversations();
conversations.ensureFirst();
// 确保至少有一个对话

const route = useRoute();
const router = useRouter();
if (route.params.id && typeof route.params.id === "string")
  conversations.currentId = route.params.id;
else router.replace(`/chat/${conversations.currentId}`);
// 根据路由参数设置当前对话ID，若无则重定向到当前对话

const current = computed(() => conversations.current);
function go(id: string) {
  conversations.currentId = id;
  router.push(`/chat/${id}`);
}
// 切换对话并更新路由
const streaming = ref(false);
const { start, stop } = useSSE();

async function onSend(text: string) {
  if (!current.value) return;
  const uid = crypto.randomUUID();
  conversations.addMessage({
    id: uid + "u",
    role: "user",
    content: text,
    createdAt: Date.now(),
  });
  // 添加用户消息
  const aid = uid + "a";
  conversations.addMessage({
    id: aid,
    role: "assistant",
    content: "", //开始时为空
    createdAt: Date.now(),
    meta: { streaming: true },
  });
  streaming.value = true;
  // 添加助手占位消息，标记为流式生成中

  // 组装对话历史
  const messages = current.value.messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));
  await scrollToBottom({ behavior: "smooth" }); // 发送消息后平滑滚动到底部
  try {
    const apiUrl = '/api/chat/stream';
    const model = "qwen-turbo"
    await start(apiUrl, { model, messages }, (chunk) => {
      const currentMsg = current.value!.messages.find((m) => m.id === aid);
      if (currentMsg) {
        conversations.patchMessage(aid, {
          content: currentMsg.content + chunk,
        });
      }
    });
  } catch (e: any) {
    conversations.patchMessage(aid, {
      meta: { streaming: false, error: e.message || "Stream error" },
    });
  } finally {
    conversations.patchMessage(aid, { meta: { streaming: false } });
    streaming.value = false;
  }
}

function onStop() {
  stop();
  streaming.value = false;
}
function onRetry(id: string) {
  const msg = current.value?.messages.find((m) => m.id === id);
  if (msg && msg.role === "assistant" && current.value) {
    const messages = current.value.messages;
    if (messages.length >= 2) {
      const userMessage = messages[messages.length - 2];
      if (userMessage && userMessage.role === "user" && userMessage.content) {
        onSend(userMessage.content);
      }
    }
  }
}
function onCopy() {
  navigator.clipboard.writeText("");
}
function onDelete(id: string) {
  const c = current.value;
  if (!c) return;
  c.messages = c.messages.filter((m) => m.id !== id);
}
</script>

<style scoped>
.chat-container {
  height: 100vh;
  overflow: hidden;
  width: 100%;
  display: flex;
  justify-content: space-between;
}

.chat-sidebar {
  border-right: 1px solid var(--el-border-color);
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  padding: 16px;
  border-bottom: 1px solid var(--el-border-color-light);
}

.new-chat-btn {
  width: 100%;
  margin-bottom: 12px;
}

.theme-switch-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 8px;
  background: var(--el-bg-color-page);
  border-radius: 6px;
  border: 1px solid var(--el-border-color-light);
}

.theme-label {
  font-size: 11px;
  color: var(--el-text-color-secondary);
  text-align: center;
}

.sidebar-content {
  flex: 1;
  overflow: hidden;
}

.conversation-menu {
  border: none;
}

.conversation-item {
  margin: 4px 8px;
  border-radius: 8px;
}

.conversation-title {
  margin-left: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-main {
  flex: 1;
  height: 100vh;
  overflow: hidden;
}

.chat-header {
  border-bottom: 1px solid var(--el-border-color);
  display: flex;
  align-items: center;
  padding: 0 20px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.title-input {
  max-width: 300px;
}

.chat-messages {
  padding: 0;
  overflow: hidden;
  flex: 1;
}

.messages-scrollbar {
  height: 100%;
}

.messages-container {
  padding: 20px;
  min-height: 100%;
}

.chat-footer {
  border-top: 1px solid var(--el-border-color);
  padding: 0;
}

/* 暗色主题适配 */
.dark .chat-sidebar {
  background-color: var(--el-bg-color-page);
}

.dark .chat-header {
  background-color: var(--el-bg-color);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .chat-container {
    flex-direction: column;
  }

  .chat-sidebar {
    width: 100% !important;
    height: 200px;
  }

  .sidebar-content {
    height: 140px;
  }
}
</style>
