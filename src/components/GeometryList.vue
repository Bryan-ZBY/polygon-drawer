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
  <div class="geometry-section" v-if="geometries.length > 0">
    <div class="section-header">
      <span class="section-title">图形列表</span>
      <span class="badge">{{ geometries.length }}</span>
    </div>
    
    <div class="geometry-list">
      <div 
        v-for="geometry in geometries" 
        :key="geometry.id"
        class="geometry-card"
        :class="{ 
          selected: selectedId === geometry.id,
          hidden: !geometry.visible 
        }"
        @click="emit('select', geometry.id)"
      >
        <div class="card-glow" :style="{ backgroundColor: geometry.visible ? geometry.color : 'transparent' }"></div>
        
        <div class="card-content">
          <div class="type-icon" :style="{ color: geometry.color, opacity: geometry.visible ? 1 : 0.3 }">
            {{ getGeometryIcon(geometry.type) }}
          </div>
          
          <div class="card-info">
            <span class="card-name">{{ geometry.name }}</span>
            <span class="card-meta">{{ getPointCount(geometry) }} 个点 · {{ geometry.type }}</span>
          </div>
          
          <div class="card-actions">
            <button 
              class="action-btn"
              :class="{ inactive: !geometry.visible }"
              @click.stop="emit('toggleVisibility', geometry)"
              :title="geometry.visible ? '隐藏' : '显示'"
            >
              <svg v-if="geometry.visible" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
              <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                <line x1="1" y1="1" x2="23" y2="23"></line>
              </svg>
            </button>
            <button 
              class="action-btn"
              @click.stop="emit('startRename', geometry)"
              title="重命名"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
            <button 
              class="action-btn delete"
              @click.stop="emit('delete', geometry.id)"
              title="删除"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.geometry-section {
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.section-title {
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.badge {
  padding: 4px 10px;
  background: rgba(0, 245, 255, 0.15);
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  color: #00f5ff;
}

.geometry-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.geometry-card {
  position: relative;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s ease;
}

.geometry-card:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.1);
  transform: translateX(4px);
}

.geometry-card.selected {
  background: rgba(0, 245, 255, 0.08);
  border-color: rgba(0, 245, 255, 0.3);
}

.geometry-card.hidden {
  opacity: 0.5;
}

.card-glow {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  opacity: 0.6;
  transition: opacity 0.3s ease;
}

.geometry-card:hover .card-glow {
  opacity: 1;
}

.card-content {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
}

.type-icon {
  font-size: 16px;
  width: 24px;
  text-align: center;
  flex-shrink: 0;
  text-shadow: 0 0 10px currentColor;
}

.card-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.card-name {
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-meta {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
}

.card-actions {
  display: flex;
  gap: 4px;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: transparent;
  border: none;
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.9);
}

.action-btn.inactive {
  color: rgba(255, 255, 255, 0.2);
}

.action-btn.delete:hover {
  background: rgba(255, 107, 107, 0.2);
  color: #ff6b6b;
}
</style>
