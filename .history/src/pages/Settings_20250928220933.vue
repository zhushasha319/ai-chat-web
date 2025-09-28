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
            v-model="s.apiBase"
            placeholder="例如：https://api.example.com"
            clearable
          />
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
            v-model="s.systemPrompt"
            type="textarea"
            :autosize="{ minRows: 3, maxRows: 6 }"
            placeholder="为对话设置一个默认的角色或行为指令"
          />
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

const s = useSettings();
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
  gap: 10px;
}

.form-help {
  margin: 4px 0 0;
  font-size: 11px;
  color: var(--el-text-color-secondary);
}
</style>
