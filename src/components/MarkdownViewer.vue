<script setup lang="ts">
import { ref, onMounted } from 'vue'

interface Props {
  content: string
}

const props = defineProps<Props>()

// 简单的 Markdown 解析器
const parseMarkdown = (md: string): string => {
  let html = md
    // 代码块
    .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
    // 行内代码
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // 标题
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    // 粗体
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // 斜体
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // 删除线
    .replace(/~~(.*?)~~/g, '<del>$1</del>')
    // 引用
    .replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>')
    // 无序列表
    .replace(/^\s*[-*+] (.*$)/gim, '<li>$1</li>')
    // 有序列表
    .replace(/^\s*\d+\. (.*$)/gim, '<li>$1</li>')
    // 链接
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
    // 图片
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2" />')
    // 水平线
    .replace(/^---$/gim, '<hr />')
    // 表格
    .replace(/\|(.+)\|/g, (match, content) => {
      const cells = content.split('|').map((cell: string) => `<td>${cell.trim()}</td>`).join('')
      return `<tr>${cells}</tr>`
    })
    // 段落
    .replace(/\n\n/g, '</p><p>')
    // 换行
    .replace(/\n/g, '<br />')

  // 包装列表
  html = html.replace(/(<li>.*<\/li>)/g, '<ul>$1</ul>')
  
  // 包装段落
  if (!html.startsWith('<')) {
    html = '<p>' + html + '</p>'
  }

  return html
}

const parsedContent = ref('')

onMounted(() => {
  parsedContent.value = parseMarkdown(props.content)
})
</script>

<template>
  <div class="markdown-viewer" v-html="parsedContent"></div>
</template>

<style scoped>
.markdown-viewer {
  font-size: 14px;
  line-height: 1.8;
  color: rgba(255, 255, 255, 0.9);
}

.markdown-viewer :deep(h1) {
  font-size: 28px;
  font-weight: 700;
  color: #fff;
  margin: 0 0 20px 0;
  padding-bottom: 12px;
  border-bottom: 2px solid rgba(0, 245, 255, 0.3);
}

.markdown-viewer :deep(h2) {
  font-size: 22px;
  font-weight: 600;
  color: #00f5ff;
  margin: 30px 0 16px 0;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(0, 245, 255, 0.2);
}

.markdown-viewer :deep(h3) {
  font-size: 18px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.95);
  margin: 24px 0 12px 0;
}

.markdown-viewer :deep(p) {
  margin: 12px 0;
}

.markdown-viewer :deep(strong) {
  color: #00f5ff;
  font-weight: 600;
}

.markdown-viewer :deep(em) {
  color: rgba(255, 255, 255, 0.8);
  font-style: italic;
}

.markdown-viewer :deep(code) {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 13px;
  background: rgba(0, 0, 0, 0.4);
  padding: 2px 6px;
  border-radius: 4px;
  color: #00ff88;
  border: 1px solid rgba(0, 255, 136, 0.2);
}

.markdown-viewer :deep(pre) {
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 16px;
  margin: 16px 0;
  overflow-x: auto;
}

.markdown-viewer :deep(pre code) {
  background: transparent;
  border: none;
  padding: 0;
  color: rgba(255, 255, 255, 0.9);
}

.markdown-viewer :deep(ul), .markdown-viewer :deep(ol) {
  margin: 12px 0;
  padding-left: 24px;
}

.markdown-viewer :deep(li) {
  margin: 6px 0;
  color: rgba(255, 255, 255, 0.85);
}

.markdown-viewer :deep(li::marker) {
  color: #00f5ff;
}

.markdown-viewer :deep(blockquote) {
  border-left: 4px solid rgba(0, 245, 255, 0.4);
  padding: 12px 16px;
  margin: 16px 0;
  background: rgba(0, 245, 255, 0.05);
  border-radius: 0 8px 8px 0;
  color: rgba(255, 255, 255, 0.8);
}

.markdown-viewer :deep(a) {
  color: #00f5ff;
  text-decoration: none;
  border-bottom: 1px solid rgba(0, 245, 255, 0.3);
  transition: all 0.2s ease;
}

.markdown-viewer :deep(a:hover) {
  border-bottom-color: #00f5ff;
  text-shadow: 0 0 8px rgba(0, 245, 255, 0.5);
}

.markdown-viewer :deep(hr) {
  border: none;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  margin: 24px 0;
}

.markdown-viewer :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 16px 0;
  font-size: 13px;
}

.markdown-viewer :deep(th), .markdown-viewer :deep(td) {
  padding: 10px 12px;
  text-align: left;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.markdown-viewer :deep(th) {
  background: rgba(0, 245, 255, 0.1);
  color: #00f5ff;
  font-weight: 600;
}

.markdown-viewer :deep(tr:nth-child(even)) {
  background: rgba(255, 255, 255, 0.02);
}

.markdown-viewer :deep(tr:hover) {
  background: rgba(255, 255, 255, 0.05);
}

.markdown-viewer :deep(del) {
  color: rgba(255, 255, 255, 0.4);
  text-decoration: line-through;
}

/* 徽章样式 */
.markdown-viewer :deep(img[src*="shields.io"]) {
  margin: 0 4px;
}

/* 居中内容 */
.markdown-viewer :deep(div[align="center"]) {
  text-align: center;
  margin: 20px 0;
}
</style>
