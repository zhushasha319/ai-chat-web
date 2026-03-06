<template>
  <el-container class="chat-container">
    <!-- 左侧对话列表 -->
    <el-aside width="180px" class="chat-sidebar">
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
          @click="showSettings = true"
        >
          打开设置
        </el-button>

        <!-- 主题切换按钮 -->
        <div class="theme-switch-container">
          <el-switch
            :model-value="isDark"
            inline-prompt
            :active-icon="Moon"
            :inactive-icon="Sunny"
            style="
              --el-switch-on-color: #2c2c2c;
              --el-switch-off-color: #f2f2f2;
            "
            @change="toggleDark()"
          />
          <span class="theme-label">{{
            isDark ? "深色模式" : "浅色模式"
          }}</span>
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
            <el-button
              type="danger"
              size="small"
              circle
              class="delete-btn"
              @click.stop="confirmDelete(c.id, c.title)"
              v-if="conversations.items.length > 1"
              :icon="Delete"
            >
            </el-button>
          </el-menu-item>
        </el-menu>
      </el-scrollbar>
    </el-aside>

    <!-- 右侧聊天区域 -->
    <el-container direction="vertical" class="chat-main">
      <!-- 消息区域 -->
      <el-main class="chat-messages">
        <VirtualChatList
          :items="current?.messages || []"
          :autoStick="autoStick"
          @user-scroll="
            (val) => {
              autoStick = val;
            }
          "
        />
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
    width="400px"
    :close-on-click-modal="false"
    :destroy-on-close="false"
    class="settings-dialog"
    align-center
    top="15vh"
  >
    <Settings />
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="showSettings = false">关闭</el-button>
      </span>
    </template>
  </el-dialog>
</template>
<script lang="ts" setup>
import { useRoute, useRouter } from "vue-router";
import { useConversations } from "@/stores/conversations";
import { useSSE } from "@/composables/useSSE";
import { ref, computed } from "vue";
import type { Message } from "@/types/chat";
import {
  ChatDotRound,
  Edit,
  Moon,
  Sunny,
  Setting,
  Delete,
} from "@element-plus/icons-vue";
import ChatComposer from "@/components/ChatComposer.vue";
import { useAutoScroll } from "@/composables/useAutoScroll";
import { isDark, toggleDark } from "@/composables/useTheme";
import Settings from "./Settings.vue";
import { useSettings } from "@/stores/settings";
import { ElMessageBox } from "element-plus";
const { scrollToBottom } = useAutoScroll();
import VirtualChatList from "@/components/VirtualChatList.vue";
// 控制设置弹窗的显示与隐藏
const showSettings = ref(false);

// 确认删除对话
const confirmDelete = (id: string, title: string) => {
  ElMessageBox.confirm(
    `确定要删除对话"${title}"吗？此操作不可恢复。`,
    "删除确认",
    {
      confirmButtonText: "删除",
      cancelButtonText: "取消",
      type: "warning",
    },
  )
    .then(() => {
      conversations.removeChat(id);
    })
    .catch(() => {
      // 用户取消删除
    });
};

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
const autoStick = ref(true);
const { start, stop } = useSSE();
const settings = useSettings();

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

  // 组装对话历史 & systemPrompt 注入
  let messages = current.value.messages.map((m: Message) => ({
    role: m.role as "system" | "user" | "assistant",
    content: m.content,
  }));
  if (
    !messages.some((m: { role: string }) => m.role === "system") &&
    settings.systemPrompt.trim()
  ) {
    messages = [
      { role: "system", content: settings.systemPrompt.trim() },
      ...messages,
    ];
  }
  await scrollToBottom({ behavior: "smooth" }); // 发送消息后平滑滚动到底部
  try {
    // 规范化 apiBase
    let base = (settings.apiBase || "/api").trim();
    if (!base.startsWith("http") && !base.startsWith("/")) {
      console.warn("[Chat] apiBase 不合法，回退为 /api ->", base);
      base = "/api";
    }
    base = base.replace(/\/$/, "");
    const apiUrl = `${base}/chat/stream`;
    const model = (settings.model || "qwen-turbo").trim();
    const payload = { model, messages };
    console.log("[Chat] 准备发起流请求", {
      apiUrl,
      model,
      withApiKey: !!settings.apiKey,
      messageCount: messages.length,
    });
    if (!messages.length) {
      throw new Error("消息为空，未发送");
    }
    // 包装 start 以便传自定义头（Authorization）
    await start(
      apiUrl,
      payload,
      // 使用 store.appendChunkMessage 做增量 + 内部 rAF 合并（Map 索引 O(1) 查找）
      (chunk: string) => {
        // 这里不直接操作 messages，避免重复 find / 触发不必要 diff
        conversations.appendChunkMessage(aid, chunk);
      },
      {
        headers: settings.apiKey
          ? { Authorization: `Bearer ${settings.apiKey}` }
          : undefined,
        debug: true,
        onError: (err) => {
          // 先确保把已积累的 pending 刷新
          conversations.finishStreamMessage(aid);
          const msgRef = current.value?.messages.find(
            (m: Message) => m.id === aid,
          );
          if (msgRef) {
            msgRef.content =
              (msgRef.content || "") + `\n\n[错误] ${err.message}`;
            msgRef.meta = {
              ...(msgRef.meta || {}),
              streaming: false,
              error: err.message,
            };
          }
          console.error("[Chat] 流错误", err);
        },
        onFinish: () => {
          // flush + 标记结束
          conversations.finishStreamMessage(aid);
          console.log("[Chat] 流完成");
        },
      },
    );
  } catch (e: any) {
    const currentMsg = current.value!.messages.find(
      (m: Message) => m.id === aid,
    );
    const msg = e?.message || "Stream error";
    console.error("[Chat] 发送流程捕获异常", e);
    conversations.patchMessage(aid, {
      content: (currentMsg?.content || "") + `\n\n[错误] ${msg}`,
      meta: { streaming: false, error: msg },
    });
  } finally {
    conversations.finishStreamMessage(aid);
    streaming.value = false;
    console.log("[Chat] onSend 结束");
  }
}

function onStop() {
  stop();
  streaming.value = false;
}

// 以下函数保留供未来使用
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _onRetry(id: string) {
  const msg = current.value?.messages.find((m: Message) => m.id === id);
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
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _onCopy() {
  navigator.clipboard.writeText("");
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _onDelete(id: string) {
  const c = current.value;
  if (!c) return;
  c.messages = c.messages.filter((m: Message) => m.id !== id);
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
  display: flex;
  flex-direction: column;
  gap: 8px;
  justify-content: center;
  align-items: center;
}

.new-chat-btn {
  margin: 0;
  width: 80%;
}
.theme-switch-container {
  display: flex;
  flex-direction: column;
  align-items: center;
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
  position: relative;
  padding-right: 35px !important; /* 为删除按钮预留空间 */
}

.conversation-title {
  margin-left: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.delete-btn {
  position: absolute;
  right: 5px;
  top: 50%;
  transform: translateY(-50%);
  opacity: 0;
  transition: opacity 0.2s ease;
  padding: 0;
  height: 22px;
  width: 22px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.delete-btn :deep(.el-icon) {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  margin: 0 !important;
}

.conversation-item:hover .delete-btn {
  opacity: 1;
}

.delete-btn:hover {
  background-color: var(--el-color-danger) !important;
}

.delete-btn:hover :deep(.el-icon) {
  color: #fff !important;
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

/* 设置弹窗样式 */
.settings-dialog :deep(.el-dialog) {
  margin-top: 0 !important;
}

.settings-dialog :deep(.el-dialog__header) {
  margin-right: 0;
  padding: 15px 15px 0;
}

.settings-dialog :deep(.el-dialog__body) {
  padding: 10px 15px;
  max-height: 65vh;
  overflow-y: auto;
}

.settings-dialog :deep(.el-dialog__footer) {
  padding: 0px 15px 15px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
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

  /* 在移动设备上调整弹窗宽度 */
  .settings-dialog :deep(.el-dialog) {
    width: 95% !important;
    margin: 0 auto !important;
    top: 10vh !important;
  }
}
</style>
