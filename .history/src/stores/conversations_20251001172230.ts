import { defineStore } from "pinia";
import type { Conversation, Message } from "@/types/chat";

/**
 * 会话管理优化（增量骨架）：
 * 1. 仍使用原来的 items 数组做持久化（顺序 + 可序列化）
 * 2. 额外引入 runtime Map 缓存（不持久化）用于 O(1) 查找会话 + 消息
 * 3. 提供 appendChunkMessage / finishStreamMessage 接口做流式增量更新
 * 4. 兼容旧的 addMessage / patchMessage，不破坏现有调用
 *
 * 说明：目前消息量较小，此结构是为未来扩展（虚拟列表 / 懒加载 / 大上下文）预留；
 * 如不需要可忽略 runtime 部分。
 */

//确保有一个对话 创建新对话 修改对话名字 删除对话 添加消息 更新消息内容（流式更新，错误标记）
const uid = () => crypto.randomUUID(); // fallback for older browsers

export const useConversations = defineStore("conversations", {
  state: () => ({
    items: [] as Conversation[],
    currentId: "" as string,
    _convMap: new Map<string, Conversation>(),
    _msgMap: new Map<string, Map<string, Message>>(),
    _streamBuffers: new Map<string, { pending: string; raf: number | null }>(), // key = messageId
  }),
  getters: {
    current(state) {
      return state.items.find((c) => c.id === state.currentId) || null;
    },
  },
  actions: {
    // --------- 内部工具 ---------
    _indexConversation(conv: Conversation) {
      this._convMap.set(conv.id, conv);
      if (!this._msgMap.has(conv.id)) {
        const map = new Map<string, Message>();
        conv.messages.forEach((m) => map.set(m.id, m));
        this._msgMap.set(conv.id, map);
      }
    },
    _rebuildIndex() {
      this._convMap.clear();
      this._msgMap.clear();
      this.items.forEach((c) => this._indexConversation(c));
    },
    ensureFirst() {
      if (!this.items.length) {
        const id = uid();
        this.items.push({
          id,
          title: "New Chat",
          messages: [],
          updatedAt: Date.now(),
        });
        this.currentId = id;
        this._rebuildIndex();
      }
    },
    createChat(title = "New Chat") {
      const id = uid();
      this.items.unshift({ id, title, messages: [], updatedAt: Date.now() });
      this.currentId = id;
      this._rebuildIndex();
    },
    renameChat(id: string, title: string) {
      const c = this.items.find((i) => i.id === id);
      if (c) {
        c.title = title;
        c.updatedAt = Date.now();
      }
    },
    removeChat(id: string) {
      this.items = this.items.filter((i) => i.id !== id);
      if (this.currentId === id) this.currentId = this.items[0]?.id || "";
      this._rebuildIndex();
    },
    addMessage(msg: Message) {
      const c = this.current;
      if (!c) return;
      c.messages.push(msg);
      c.updatedAt = Date.now();
      // 索引同步
      let map = this._msgMap.get(c.id);
      if (!map) {
        map = new Map();
        this._msgMap.set(c.id, map);
      }
      map.set(msg.id, msg);
    },
    patchMessage(id: string, patch: Partial<Message>) {
      const c = this.current;
      if (!c) return;
      const m = c.messages.find((m) => m.id === id);
      if (m) Object.assign(m, patch);
      c.updatedAt = Date.now();
    }, //ai回复可能出错

    /**
     * 流式：追加增量文本（不立即 patch 整个对象；依赖 rAF 合并）
     * @param convId 会话ID（默认当前会话）
     * @param messageId 消息ID（必须存在，或先 addMessage 占位）
     * @param chunk 增量文本
     */
    appendChunkMessage(messageId: string, chunk: string, convId?: string) {
      const c = convId ? this._convMap.get(convId) : this.current;
      if (!c || !chunk) return;
      let map = this._msgMap.get(c.id);
      if (!map) {
        const newMap = new Map<string, Message>();
        c.messages.forEach((m) => newMap.set(m.id, m));
        this._msgMap.set(c.id, newMap);
        map = newMap;
      }
      const msg = map!.get(messageId);
      if (!msg) return;
      let buf = this._streamBuffers.get(messageId);
      if (!buf) {
        buf = { pending: "", raf: null };
        this._streamBuffers.set(messageId, buf);
      }
      buf.pending += chunk;
      if (buf.raf == null) {
        buf.raf = requestAnimationFrame(() => {
          const b = this._streamBuffers.get(messageId);
          if (!b) return;
          if (b.pending) {
            msg.content += b.pending; // 原地追加，保留引用
            b.pending = "";
          }
          b.raf = null;
        });
      }
    },
    /**
     * 结束流：确保最后 pending 刷新，并标记 streaming 停止
     */
    finishStreamMessage(messageId: string, convId?: string) {
      const c = convId ? this._convMap.get(convId) : this.current;
      if (!c) return;
      const map = this._msgMap.get(c.id);
      const msg = map?.get(messageId);
      if (!msg) return;
      const buf = this._streamBuffers.get(messageId);
      if (buf) {
        if (buf.raf) cancelAnimationFrame(buf.raf);
        if (buf.pending) {
          msg.content += buf.pending;
        }
        this._streamBuffers.delete(messageId);
      }
      msg.meta = { ...(msg.meta || {}), streaming: false };
      c.updatedAt = Date.now();
    },
    /**
     * 如果切换了 currentId，确保 Map 索引可用
     */
    hydrateRuntime() {
      // 当直接从 localStorage 恢复时，Map 是空的，需要重建
      if (!this._convMap.size && this.items.length) this._rebuildIndex();
    },
  },
  persist: true, // 持久化到 localStorage
});
