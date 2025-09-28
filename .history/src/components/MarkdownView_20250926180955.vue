<template>
<div class="prose prose-sm dark:prose-invert max-w-none" v-html="html" />
</template>
<script lang="ts" setup>
import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'
import 'highlight.js/styles/github-dark.css'
import { computed } from 'vue'


const props = defineProps<{ source: string }>()


const md: MarkdownIt = new MarkdownIt({
html: false,// 不启用 HTML 标签
linkify: true,
highlight(code, lang) {
if (lang && hljs.getLanguage(lang)) {
return `<pre><code class="hljs">${hljs.highlight(code, { language: lang }).value}</code></pre>`
}
return `<pre><code class="hljs">${md.utils.escapeHtml(code)}</code></pre>`
},
})


const html = computed(() => md.render(props.source || ''))
</script>
<style scoped>
.prose pre { position: relative; }
</style>