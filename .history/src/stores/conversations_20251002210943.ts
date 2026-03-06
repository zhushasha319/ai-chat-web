const uid = () => crypto.randomUUID();
import { defineStore } from "pinia";
import type { Conversation, Message } from "@/types/chat";

// ...existing code...

export const useConversations = defineStore("conversations", {
  state: () => ({
    items: [] as Conversation[],
    currentId: "" as string,
    // runtime: 不持久化；刷新后需重新构建
    _convMap: new Map<string, Conversation>(),
    _msgMap: new Map<string, Map<string, Message>>(),
    _streamBuffers: new Map<string, { pending: string; raf: number | null }>(),
  }),
  getters: {
    current(state) {
      return state.items.find(c => c.id === state.currentId) || null;
    },
  },
  actions: {
    // 确保 runtime 结构为 Map（避免持久化还原后变成普通对象）
    _ensureRuntimeMaps() {
      if (!(this._convMap instanceof Map)) this._convMap = new Map<string, Conversation>();
      if (!(this._msgMap instanceof Map)) this._msgMap = new Map<string, Map<string, Message>>();
      if (!(this._streamBuffers instanceof Map))
        this._streamBuffers = new Map<string, { pending: string; raf: number | null }>();
    },

    _indexConversation(conv: Conversation) {
      this._ensureRuntimeMaps();
      this._convMap.set(conv.id, conv);
      if (!this._msgMap.has(conv.id)) {
        const map = new Map<string, Message>();
        conv.messages.forEach(m => map.set(m.id, m));
        this._msgMap.set(conv.id, map);
      }
    },

    _rebuildIndex() {
      this._ensureRuntimeMaps();
      this._convMap.clear();
      this._msgMap.clear();
      this.items.forEach(c => this._indexConversation(c));
    },

    ensureFirst() {
      if (!this.items.length) {
        const id = crypto.randomUUID();
        this.items.push({ id, title: "New Chat", messages: [], updatedAt: Date.now() });
        this.currentId = id;
        this._rebuildIndex();
      }
    },

    createChat(title = "New Chat") {
      const id = crypto.randomUUID();
      this.items.unshift({ id, title, messages: [], updatedAt: Date.now() });
      this.currentId = id;
      this._rebuildIndex();
    },

    renameChat(id: string, title: string) {
      const c = this.items.find(i => i.id === id);
      if (c) {
        c.title = title;
        c.updatedAt = Date.now();
      }
    },

    removeChat(id: string) {
      this.items = this.items.filter(i => i.id !== id);
      if (this.currentId === id) this.currentId = this.items[0]?.id || "";
      this._rebuildIndex();
    },

    addMessage(msg: Message) {
      const c = this.current;
      if (!c) return;
      c.messages.push(msg);
      c.updatedAt = Date.now();
      this._ensureRuntimeMaps();
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
      const m = c.messages.find(m => m.id === id);
      if (m) Object.assign(m, patch);
      c.updatedAt = Date.now();
    },

    appendChunkMessage(messageId: string, chunk: string, convId?: string) {
      if (!chunk) return;
      this._ensureRuntimeMaps();
      const c = convId ? this._convMap.get(convId) : this.current;
      if (!c) return;

      let map = this._msgMap.get(c.id);
      if (!map) {
        map = new Map<string, Message>();
        c.messages.forEach(m => map!.set(m.id, m));
        this._msgMap.set(c.id, map);
      }
      const msg = map.get(messageId);
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
              msg.content += b.pending;
              b.pending = "";
            }
            b.raf = null;
        });
      }
    },

    finishStreamMessage(messageId: string, convId?: string) {
      this._ensureRuntimeMaps();
      const c = convId ? this._convMap.get(convId) : this.current;
      if (!c) return;
      const map = this._msgMap.get(c.id);
      const msg = map?.get(messageId);
      if (!msg) return;

      const buf = this._streamBuffers.get(messageId);
      if (buf) {
        if (buf.raf) cancelAnimationFrame(buf.raf);
        if (buf.pending) msg.content += buf.pending;
        this._streamBuffers.delete(messageId);
      }
      msg.meta = { ...(msg.meta || {}), streaming: false };
      c.updatedAt = Date.now();
    },

    hydrateRuntime() {
      this._ensureRuntimeMaps();
      if (!this._convMap.size && this.items.length) this._rebuildIndex();
    },
  },
  persist: {
    // 只持久化核心数据，排除 runtime Map
    paths: ["items", "currentId"],
  },
});