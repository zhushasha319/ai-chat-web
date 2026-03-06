<template>
  <div class="settings-page">
    <el-card shadow="none" class="settings-card" :body-style="{ padding: '10px' }">
      <div class="card-header">
        <h1>设置</h1>
        <p class="subtitle">在这里配置后端地址、模型信息以及默认系统提示词。</p>
      </div>
      <el-form label-position="top" class="settings-form">
        <el-form-item label="API Base">
          <el-input
            v-model="apiBaseLocal"
            placeholder="例如：https://api.example.com"
            clearable
          />
          <p class="form-help" v-if="apiBaseDirty && !apiBaseFlushed">
            正在延迟保存…
          </p>
        </el-form-item>

        <el-form-item label="模型">
          <el-input
            v-model="s.model"
            placeholder="例如：gpt-4o-mini"
            clearable
          />
        </el-form-item>

        <el-form-item label="API Key">
          <el-input
            v-model="s.apiKey"
            type="password"
            show-password
            placeholder="请输入您的 API Key"
            autocomplete="off"
          />
          <p class="form-help">仅保存在浏览器本地，不会上传到服务器。</p>
        </el-form-item>

        <el-form-item label="系统提示词">
          <el-input
            v-model="systemPromptLocal"
            type="textarea"
            :autosize="{ minRows: 2, maxRows: 4 }"
            placeholder="为对话设置一个默认的角色或行为指令"
          />
          <p class="form-help" v-if="systemPromptDirty && !systemPromptFlushed">正在延迟保存…</p>
          <p class="form-help">
            系统提示词会作为对话的第一条指令，引导模型在整个对话中的语气和行为，例如：
            “你是一名专业的金融分析师。”
          </p>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>
<script lang="ts" setup>
import { useSettings } from "@/stores/settings";
import { ref, watch } from 'vue';

const s = useSettings();

// 简易通用防抖函数（可提取到 composables）
function useDebounce<T>(delay: number, cb: (v: T) => void) {
  let timer: number | null = null;
  const trigger = (v: T) => {
    if (timer) window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      cb(v);
      timer = null;
    }, delay);
  };
  return trigger;
}

// 本地临时输入值（避免每键入一次就写 store / localStorage）
const apiBaseLocal = ref(s.apiBase);
const apiBaseDirty = ref(false);
const apiBaseFlushed = ref(true);
const systemPromptLocal = ref(s.systemPrompt);
const systemPromptDirty = ref(false);
const systemPromptFlushed = ref(true);

const flushApiBase = (val: string) => {
  s.apiBase = val.trim() || '/api';
  apiBaseFlushed.value = true;
};
const flushSystemPrompt = (val: string) => {
  s.systemPrompt = val; // 保留原样，留给 onSend 注入时再 trim
  systemPromptFlushed.value = true;
};

const debouncedApiBase = useDebounce<string>(400, flushApiBase);
const debouncedSystemPrompt = useDebounce<string>(500, flushSystemPrompt);

watch(apiBaseLocal, (v) => {
  apiBaseDirty.value = true;
  apiBaseFlushed.value = false;
  debouncedApiBase(v);
});

watch(systemPromptLocal, (v) => {
  systemPromptDirty.value = true;
  systemPromptFlushed.value = false;
  debouncedSystemPrompt(v);
});

// 当 store 外部（例如重置）被修改时同步回本地输入
watch(() => s.apiBase, (v) => {
  if (v !== apiBaseLocal.value) apiBaseLocal.value = v;
});
watch(() => s.systemPrompt, (v) => {
  if (v !== systemPromptLocal.value) systemPromptLocal.value = v;
});

</script>

<style scoped>
.settings-page {
  display: flex;
  justify-content: center;
  padding: 0;
}

.settings-card {
  width: 100%;
  box-shadow: none;
}

.card-header h1 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.subtitle {
  margin: 2px 0 8px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.2;
}

.settings-form {
  display: grid;
  gap: 8px;
}

.settings-form :deep(.el-form-item) {
  margin-bottom: 0;
}

.settings-form :deep(.el-form-item__label) {
  padding-bottom: 4px;
  line-height: 1.2;
}

.form-help {
  margin: 2px 0 0;
  font-size: 10px;
  line-height: 1.2;
  color: var(--el-text-color-secondary);
}
</style>
