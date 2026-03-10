<script setup lang="ts">
import { ref, computed } from 'vue'

interface Props {
  position: { x: number; y: number }
  title: string
  badge?: number
  collapsed?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  badge: 0,
  collapsed: false
})

const emit = defineEmits<{
  'update:position': [pos: { x: number; y: number }]
  'update:collapsed': [collapsed: boolean]
}>()

// 拖拽状态
const isDragging = ref(false)
const dragOffset = ref({ x: 0, y: 0 })

// 计算面板样式
const panelStyle = computed(() => ({
  left: `${props.position.x}px`,
  top: `${props.position.y}px`
}))

// 开始拖拽
const startDrag = (e: MouseEvent) => {
  // 只有点击标题栏才拖拽
  if ((e.target as HTMLElement).closest('.panel-header')) {
    isDragging.value = true
    dragOffset.value = {
      x: e.clientX - props.position.x,
      y: e.clientY - props.position.y
    }
    e.preventDefault()
  }
}

// 拖拽中
const onDrag = (e: MouseEvent) => {
  if (!isDragging.value) return
  
  const newX = e.clientX - dragOffset.value.x
  const newY = e.clientY - dragOffset.value.y
  
  // 限制在视口内
  const maxX = window.innerWidth - 100
  const maxY = window.innerHeight - 50
  
  emit('update:position', {
    x: Math.max(0, Math.min(newX, maxX)),
    y: Math.max(0, Math.min(newY, maxY))
  })
}

// 结束拖拽
const endDrag = () => {
  isDragging.value = false
}

// 切换折叠状态
const toggleCollapse = () => {
  emit('update:collapsed', !props.collapsed)
}
</script>

<template>
  <div
    class="draggable-panel"
    :style="panelStyle"
    :class="{ dragging: isDragging, collapsed: collapsed }"
    @mousedown="startDrag"
  >
    <!-- 标题栏 -->
    <div class="panel-header">
      <div class="header-left">
        <span class="drag-handle">⋮⋮</span>
        <span class="panel-title">{{ title }}</span>
        <span v-if="badge > 0" class="panel-badge">{{ badge }}</span>
      </div>
      <button class="collapse-btn" @click.stop="toggleCollapse">
        <svg v-if="collapsed" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
        <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="18 15 12 9 6 15"></polyline>
        </svg>
      </button>
    </div>
    
    <!-- 内容区域 -->
    <div v-show="!collapsed" class="panel-content">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.draggable-panel {
  position: absolute;
  z-index: 100;
  background: rgba(20, 20, 30, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  box-shadow:
    0 25px 50px -12px rgba(0, 0, 0, 0.5),
    0 0 0 1px rgba(255, 255, 255, 0.05) inset;
  transition: box-shadow 0.3s ease;
  user-select: none;
}

.draggable-panel.dragging {
  box-shadow:
    0 35px 60px -15px rgba(0, 0, 0, 0.6),
    0 0 0 1px rgba(0, 245, 255, 0.2) inset;
  cursor: grabbing;
}

.draggable-panel.collapsed {
  width: auto !important;
  min-width: 200px;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  cursor: grab;
  transition: background 0.2s ease;
}

.draggable-panel.dragging .panel-header {
  cursor: grabbing;
}

.panel-header:hover {
  background: rgba(255, 255, 255, 0.03);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.drag-handle {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.3);
  letter-spacing: 2px;
  cursor: grab;
}

.panel-title {
  font-size: 16px;
  font-weight: 700;
  background: linear-gradient(135deg, #fff 0%, #a0a0b0 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.panel-badge {
  padding: 3px 10px;
  background: rgba(0, 245, 255, 0.15);
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  color: #00f5ff;
}

.collapse-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  transition: all 0.2s ease;
}

.collapse-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.9);
}

.panel-content {
  padding: 20px;
  max-height: calc(100vh - 150px);
  overflow-y: auto;
}

.panel-content::-webkit-scrollbar {
  width: 6px;
}

.panel-content::-webkit-scrollbar-track {
  background: transparent;
}

.panel-content::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}
</style>
