<script setup lang="ts">
import type { Geometry } from '@/types'
import { GeometryType } from '@/types'

interface Props {
  geometries: Geometry[]
  selectedId: string | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  select: [id: string]
  toggleVisibility: [geometry: Geometry]
  startRename: [geometry: Geometry]
  delete: [id: string]
}>()

const getGeometryIcon = (type: GeometryType) => {
  switch (type) {
    case GeometryType.POLYGON:
      return '⬡'
    case GeometryType.LINE:
      return '╱'
    case GeometryType.CIRCLE:
      return '○'
    case GeometryType.RECTANGLE:
      return '▭'
    default:
      return '◆'
  }
}

const getPointCount = (geometry: Geometry) => {
  switch (geometry.type) {
    case GeometryType.POLYGON:
      return (geometry as any).points?.length || 0
    case GeometryType.LINE:
      return 2
    case GeometryType.CIRCLE:
      return 1
    case GeometryType.RECTANGLE:
      return 4
    default:
      return 0
  }
}
</script>

<template>
  <div class="geometry-list">
    <div
      v-for="geometry in geometries"
      :key="geometry.id"
      class="geometry-card"
      :class="{ selected: selectedId === geometry.id, hidden: !geometry.visible }"
      @click="emit('select', geometry.id)"
    >

      <div class="card-content">
        <div class="type-icon" :style="{ color: geometry.color, opacity: geometry.visible ? 1 : 0.3 }">
          {{ getGeometryIcon(geometry.type) }}
        </div>
        
        <span class="card-name">{{ geometry.name }}</span>
        
        <div class="card-actions">
          <button 
            class="action-btn"
            :class="{ inactive: !geometry.visible }"
            @click.stop="emit('toggleVisibility', geometry)"
            :title="geometry.visible ? '隐藏' : '显示'"
          >
            <svg v-if="geometry.visible" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
            <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
              <line x1="1" y1="1" x2="23" y2="23"></line>
            </svg>
          </button>
          <button 
            class="action-btn delete"
            @click.stop="emit('delete', geometry.id)"
            title="删除"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.geometry-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 75vh;
  overflow-y: auto;
  padding-right: 4px;
}

/* 滚动条容器 */
.geometry-list::-webkit-scrollbar {
  width: 6px;
}

/* 滚动条轨道 */
.geometry-list::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 3px;
}

/* 滚动条滑块 */
.geometry-list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 3px;
  transition: background 0.2s ease;
}

/* 滚动条滑块悬停 */
.geometry-list::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.25);
}

/* 滚动条滑块拖动 */
.geometry-list::-webkit-scrollbar-thumb:active {
  background: rgba(0, 245, 255, 0.4);
}

.geometry-card {
  position: relative;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.geometry-card:hover {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.04) 100%);
  border-color: rgba(255, 255, 255, 0.15);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.geometry-card.selected {
  background: linear-gradient(135deg, rgba(0, 245, 255, 0.12) 0%, rgba(0, 245, 255, 0.05) 100%);
  border-color: rgba(0, 245, 255, 0.5);
  box-shadow: 0 0 20px rgba(0, 245, 255, 0.15), 0 4px 12px rgba(0, 0, 0, 0.3);
}

.geometry-card.hidden {
  opacity: 0.4;
}

.card-content {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
}

.type-icon {
  font-size: 14px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 6px;
  flex-shrink: 0;
  filter: drop-shadow(0 0 4px currentColor);
}

.card-name {
  flex: 1;
  font-size: 13px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.95);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  letter-spacing: 0.3px;
}

.card-actions {
  display: flex;
  gap: 4px;
  opacity: 0.6;
  transition: opacity 0.2s ease;
}

.geometry-card:hover .card-actions {
  opacity: 1;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 1);
  transform: scale(1.05);
}

.action-btn.inactive {
  color: rgba(255, 255, 255, 0.2);
}

.action-btn.delete {
  background: rgba(255, 107, 107, 0.05);
  border-color: rgba(255, 107, 107, 0.15);
  color: rgba(255, 107, 107, 0.7);
}

.action-btn.delete:hover {
  background: rgba(255, 107, 107, 0.2);
  border-color: rgba(255, 107, 107, 0.4);
  color: #ff6b6b;
}
</style>
