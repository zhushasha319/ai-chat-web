<template>
  <div class="max-w-2xl mx-auto p-6 space-y-6">
    <h1 class="text-xl font-semibold">设置</h1>
    <div class="space-y-2">
      <label class="block text-sm">API Base</label>
      <input
        v-model="s.apiBase"
        class="w-full rounded border px-3 py-2 bg-transparent"
      />
    </div>
    <div class="space-y-2">
      <label class="block text-sm">模型</label>
      <input
        v-model="s.model"
        class="w-full rounded border px-3 py-2 bg-transparent"
      />
    </div>
    <div class="space-y-2">
      <label class="block text-sm">系统提示词</label>
      <textarea
        v-model="s.systemPrompt"
        rows="4"
        class="w-full rounded border px-3 py-2 bg-transparent"
      />
    </div>
  </div>
</template>
<script lang="ts" setup>
import { useSettings } from "@/stores/settings";
const s = useSettings();
</script>
