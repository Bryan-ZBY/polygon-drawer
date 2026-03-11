<script setup lang="ts">
import type { Geometry, PolygonGroup, Polygon } from '@/types'
import { GeometryType } from '@/types'

interface Props {
  geometries: Geometry[]
  selectedId: string | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  select: [id: string]
  selectGroupPolygon: [groupId: string, polygonId: string]
  toggleVisibility: [geometry: Geometry]
  toggleGroupCollapse: [groupId: string]
  startRename: [geometry: Geometry]
  delete: [id: string]
  moveUp: [id: string]
  moveDown: [id: string]
  moveToTop: [id: string]
  moveToBottom: [id: string]
}>()

const getGeometryIcon = (type: GeometryType | 'group') => {
  switch (type) {
    case GeometryType.POLYGON:
      return '⬡'
    case GeometryType.LINE:
      return '╱'
    case GeometryType.CIRCLE:
      return '○'
    case GeometryType.RECTANGLE:
      return '▭'
    case 'group':
      return '▦'
    default:
      return '◆'
  }
}

const getPointCount = (geometry: Geometry) => {
  switch (geometry.type) {
    case GeometryType.POLYGON:
      return (geometry as Polygon).points?.length || 0
    case 'group':
      return (geometry as PolygonGroup).polygons?.length || 0
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

const isGroup = (geometry: Geometry): geometry is PolygonGroup => {
  return geometry.type === 'group'
}

const isPolygonInGroupSelected = (group: PolygonGroup) => {
  return group.polygons.some(p => p.id === props.selectedId)
}
</script>

<template>
  <div class="geometry-list">
    <template v-for="geometry in geometries" :key="geometry.id">
      <!-- 多边形组 -->
      <template v-if="isGroup(geometry)">
        <div
          class="geometry-card group-card"
          :class="{ 
            selected: selectedId === geometry.id || (geometry.collapsed && isPolygonInGroupSelected(geometry)), 
            hidden: !geometry.visible,
            collapsed: geometry.collapsed
          }"
          @click="emit('select', geometry.id)"
        >
          <div class="card-content">
            <div class="type-icon group-icon" :style="{ color: geometry.color, opacity: geometry.visible ? 1 : 0.3 }">
              {{ getGeometryIcon('group') }}
            </div>
            
            <span class="card-name">{{ geometry.name }} ({{ geometry.polygons.length }})</span>
            
            <div class="card-actions">
              <!-- 图层控制按钮组 -->
              <div class="layer-controls">
                <button 
                  class="action-btn"
                  @click.stop="emit('moveUp', geometry.id)"
                  title="上移"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="18 15 12 9 6 15"></polyline>
                  </svg>
                </button>
                <button 
                  class="action-btn"
                  @click.stop="emit('moveDown', geometry.id)"
                  title="下移"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </button>
              </div>
              <!-- 折叠/展开按钮 -->
              <button 
                class="action-btn"
                @click.stop="emit('toggleGroupCollapse', geometry.id)"
                :title="geometry.collapsed ? '展开' : '折叠'"
              >
                <svg v-if="geometry.collapsed" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
                <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="18 15 12 9 6 15"></polyline>
                </svg>
              </button>
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
        
        <!-- 组内的多边形（展开时显示） -->
        <div v-if="!geometry.collapsed" class="group-polygons">
          <div
            v-for="polygon in geometry.polygons"
            :key="polygon.id"
            class="geometry-card polygon-in-group"
            :class="{ selected: selectedId === polygon.id, hidden: !polygon.visible }"
            @click.stop="emit('selectGroupPolygon', geometry.id, polygon.id)"
          >
            <div class="card-content">
              <div class="type-icon" :style="{ color: polygon.color, opacity: polygon.visible ? 1 : 0.3 }">
                {{ getGeometryIcon(GeometryType.POLYGON) }}
              </div>
              
              <span class="card-name">{{ polygon.name }}</span>
              
              <div class="card-actions">
                <button 
                  class="action-btn"
                  :class="{ inactive: !polygon.visible }"
                  @click.stop="polygon.visible = !polygon.visible"
                  :title="polygon.visible ? '隐藏' : '显示'"
                >
                  <svg v-if="polygon.visible" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                  <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </template>
      
      <!-- 普通几何图形 -->
      <div
        v-else
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
            <!-- 图层控制按钮组 -->
            <div class="layer-controls">
              <button 
                class="action-btn"
                @click.stop="emit('moveUp', geometry.id)"
                title="上移"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="18 15 12 9 6 15"></polyline>
                </svg>
              </button>
              <button 
                class="action-btn"
                @click.stop="emit('moveDown', geometry.id)"
                title="下移"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
            </div>
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
    </template>
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

/* 组卡片样式 */
.group-card {
  border-color: rgba(255, 170, 0, 0.3);
}

.group-card:hover {
  border-color: rgba(255, 170, 0, 0.5);
}

.group-card.selected {
  background: linear-gradient(135deg, rgba(255, 170, 0, 0.12) 0%, rgba(255, 170, 0, 0.05) 100%);
  border-color: rgba(255, 170, 0, 0.6);
  box-shadow: 0 0 20px rgba(255, 170, 0, 0.15), 0 4px 12px rgba(0, 0, 0, 0.3);
}

/* 组内的多边形 */
.group-polygons {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-left: 16px;
  padding-left: 12px;
  border-left: 2px solid rgba(255, 170, 0, 0.2);
}

.polygon-in-group {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%);
  border-color: rgba(255, 255, 255, 0.05);
}

.polygon-in-group:hover {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.02) 100%);
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

.group-icon {
  background: rgba(255, 170, 0, 0.15);
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

/* 图层控制按钮组 */
.layer-controls {
  display: flex;
  gap: 2px;
  margin-right: 4px;
  padding-right: 4px;
  border-right: 1px solid rgba(255, 255, 255, 0.1);
}

.layer-controls .action-btn {
  width: 22px;
  height: 22px;
}
</style>
