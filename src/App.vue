<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { Geometry, Polygon, ViewState, Point } from '@/types'
import { generateId, getNextColor } from '@/types'
import { 
  clearCanvas, 
  drawGrid, 
  drawGeometry,
  detectHover
} from '@/utils/canvasRenderer'
import { generateNonOverlappingPolygon } from '@/utils/geometryGenerator'
import DraggablePanel from '@/components/DraggablePanel.vue'
import GeometryList from '@/components/GeometryList.vue'

// 状态
const geometries = ref<Geometry[]>([])
const selectedId = ref<string | null>(null)
const hoveredId = ref<string | null>(null)
const errorMsg = ref('')
const canvasRef = ref<HTMLCanvasElement | null>(null)

// 鼠标位置
const mousePos = ref({ x: 0, y: 0 })
const hoveredVertex = ref<{ geometryId: string; vertexIndex: number; point: Point } | null>(null)

// 最后经过的顶点（保持高亮）
const lastHoveredVertex = ref<{ geometryId: string; vertexIndex: number; point: Point } | null>(null)

// 计算鼠标在世界坐标系中的位置
const mouseWorldPos = computed(() => {
  const canvas = canvasRef.value
  if (!canvas) return { x: 0, y: 0 }
  
  const centerX = canvas.width / 2
  const centerY = canvas.height / 2
  
  return {
    x: (mousePos.value.x - centerX - viewState.value.offsetX) / viewState.value.scale,
    y: (mousePos.value.y - centerY - viewState.value.offsetY) / viewState.value.scale
  }
})

// 视图状态
const viewState = ref<ViewState>({
  scale: 1,
  offsetX: 0,
  offsetY: 0
})

// 拖拽状态
const isDragging = ref(false)
const lastMousePos = ref({ x: 0, y: 0 })

// 重命名状态
const editingNameId = ref<string | null>(null)
const editingName = ref('')

// 面板折叠状态
const isListCollapsed = ref(false)

// 输入面板位置
const inputPanelPos = ref({ x: 20, y: 20 })

// 图形列表位置
const listPanelPos = ref({ x: 380, y: 20 })

// 绘制所有图形
const drawAll = () => {
  const canvas = canvasRef.value
  if (!canvas) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  // 清空画布
  clearCanvas(ctx, canvas.width, canvas.height)

  // 绘制网格
  drawGrid(ctx, canvas.width, canvas.height, viewState.value)

  // 绘制所有可见图形
  geometries.value.forEach(geometry => {
    if (geometry.visible) {
      const isHovered = hoveredId.value === geometry.id
      const isSelected = selectedId.value === geometry.id
      // 传递当前悬停顶点或最后经过的顶点
      const activeVertex = hoveredVertex.value || lastHoveredVertex.value
      drawGeometry(ctx, geometry, viewState.value, canvas.width, canvas.height, isHovered, isSelected, activeVertex)
    }
  })
}

// 处理鼠标移动
const handleMouseMove = (e: MouseEvent) => {
  const canvas = canvasRef.value
  if (!canvas) return

  // 获取鼠标在画布上的位置
  const rect = canvas.getBoundingClientRect()
  mousePos.value = {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  }

  // 检测悬停
  const result = detectHover(
    mousePos.value.x,
    mousePos.value.y,
    geometries.value,
    viewState.value,
    canvas.width,
    canvas.height
  )

  // 更新悬停状态
  if (result.hoveredGeometryId !== hoveredId.value) {
    hoveredId.value = result.hoveredGeometryId
    drawAll()
  }

  // 更新当前悬停顶点
  hoveredVertex.value = result.hoveredVertex
  
  // 如果有新的悬停顶点，更新最后经过的顶点
  if (result.hoveredVertex) {
    lastHoveredVertex.value = result.hoveredVertex
    drawAll()
  }

  // 处理拖拽
  if (isDragging.value) {
    const deltaX = e.clientX - lastMousePos.value.x
    const deltaY = e.clientY - lastMousePos.value.y

    viewState.value.offsetX += deltaX
    viewState.value.offsetY += deltaY

    lastMousePos.value = { x: e.clientX, y: e.clientY }

    drawAll()
  }
}

// 处理鼠标按下
const handleMouseDown = (e: MouseEvent) => {
  if (e.button === 0) {
    // 如果点击在顶点上，不启动拖拽
    if (hoveredVertex.value) {
      return
    }
    
    isDragging.value = true
    lastMousePos.value = { x: e.clientX, y: e.clientY }
    
    // 点击时选中多边形
    if (hoveredId.value) {
      selectedId.value = hoveredId.value
      drawAll()
    }
  }
}

// 处理鼠标释放
const handleMouseUp = () => {
  isDragging.value = false
}

// 添加图形
const addGeometry = (partialGeometry: Omit<Geometry, 'id' | 'name' | 'color'>) => {
  errorMsg.value = ''

  const newGeometry: Geometry = {
    ...partialGeometry,
    id: generateId(),
    name: `多边形 ${geometries.value.length + 1}`,
    color: getNextColor()
  } as Geometry

  geometries.value.push(newGeometry)
  selectedId.value = newGeometry.id
  drawAll()
}

// 生成随机测试多边形
const generateRandomTestPolygon = () => {
  errorMsg.value = ''

  const existingPolygons = geometries.value.filter(
    g => g.type === 'polygon'
  ) as Polygon[]

  const newPolygon = generateNonOverlappingPolygon(existingPolygons)

  if (newPolygon) {
    addGeometry(newPolygon)
  } else {
    errorMsg.value = '无法生成不重叠的多边形，请尝试重置视图或清空画布'
  }
}

// 删除图形
const deleteGeometry = (id: string) => {
  const index = geometries.value.findIndex(g => g.id === id)
  if (index > -1) {
    geometries.value.splice(index, 1)
    if (selectedId.value === id) {
      selectedId.value = null
    }
    if (hoveredId.value === id) {
      hoveredId.value = null
    }
    drawAll()
  }
}

// 切换可见性
const toggleVisibility = (geometry: Geometry) => {
  geometry.visible = !geometry.visible
  drawAll()
}

// 选择图形
const selectGeometry = (id: string) => {
  selectedId.value = id
  drawAll()
}

// 开始重命名
const startRename = (geometry: Geometry) => {
  editingNameId.value = geometry.id
  editingName.value = geometry.name
}

// 确认重命名
const confirmRename = () => {
  if (editingNameId.value) {
    const geometry = geometries.value.find(g => g.id === editingNameId.value)
    if (geometry && editingName.value.trim()) {
      geometry.name = editingName.value.trim()
    }
    editingNameId.value = null
    editingName.value = ''
  }
}

// 取消重命名
const cancelRename = () => {
  editingNameId.value = null
  editingName.value = ''
}

// 重置视图
const resetView = () => {
  viewState.value = { scale: 1, offsetX: 0, offsetY: 0 }
  drawAll()
}

// 清空所有
const clearAll = () => {
  if (confirm('确定要清空所有图形吗？')) {
    geometries.value = []
    selectedId.value = null
    hoveredId.value = null
    hoveredVertex.value = null
    drawAll()
  }
}

// 清空错误
const clearError = () => {
  errorMsg.value = ''
}

// 设置画布大小
const resizeCanvas = () => {
  const canvas = canvasRef.value
  if (!canvas) return

  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
  drawAll()
}

// 滚轮缩放
const handleWheel = (e: WheelEvent) => {
  e.preventDefault()

  const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1
  const newScale = viewState.value.scale * scaleFactor

  if (newScale < 0.1 || newScale > 10) return

  viewState.value.scale = newScale
  drawAll()
}

// 面板拖拽相关
const isPanelDragging = ref(false)
const panelDragOffset = ref({ x: 0, y: 0 })
const draggedPanel = ref<'input' | 'list' | null>(null)

// 开始面板拖拽
const startPanelDrag = (e: MouseEvent, panel: 'input' | 'list') => {
  isPanelDragging.value = true
  draggedPanel.value = panel
  panelDragOffset.value = {
    x: e.clientX - (panel === 'input' ? inputPanelPos.value.x : listPanelPos.value.x),
    y: e.clientY - (panel === 'input' ? inputPanelPos.value.y : listPanelPos.value.y)
  }
}

// 处理面板拖拽
const handlePanelDrag = (e: MouseEvent) => {
  if (!isPanelDragging.value || !draggedPanel.value) return
  
  const newX = e.clientX - panelDragOffset.value.x
  const newY = e.clientY - panelDragOffset.value.y
  
  // 限制在视口内
  const maxX = window.innerWidth - 100
  const maxY = window.innerHeight - 50
  
  const pos = {
    x: Math.max(0, Math.min(newX, maxX)),
    y: Math.max(0, Math.min(newY, maxY))
  }
  
  if (draggedPanel.value === 'input') {
    inputPanelPos.value = pos
  } else {
    listPanelPos.value = pos
  }
}

// 结束面板拖拽
const endPanelDrag = () => {
  isPanelDragging.value = false
  draggedPanel.value = null
}

onMounted(() => {
  resizeCanvas()
  window.addEventListener('resize', resizeCanvas)

  const canvas = canvasRef.value
  if (canvas) {
    canvas.addEventListener('wheel', handleWheel, { passive: false })
    canvas.addEventListener('mousemove', handleMouseMove)
    canvas.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mouseup', handleMouseUp)
  }
  
  // 全局拖拽监听
  window.addEventListener('mousemove', handlePanelDrag)
  window.addEventListener('mouseup', endPanelDrag)
})

onUnmounted(() => {
  window.removeEventListener('resize', resizeCanvas)
  window.removeEventListener('mouseup', handleMouseUp)
  window.removeEventListener('mousemove', handlePanelDrag)
  window.removeEventListener('mouseup', endPanelDrag)
})
</script>

<template>
  <div class="container">
    <!-- 可拖拽输入面板 -->
    <DraggablePanel
      v-model:position="inputPanelPos"
      title="Polygon Studio"
      class="input-panel"
    >
      <template #default>
        <div class="input-section">
          <label class="input-label">
            <span class="label-icon">📐</span>
            输入点集 (JSON)
          </label>
          <textarea
            v-model="errorMsg"
            placeholder='[{"x": 100, "y": 100}, {"x": 200, "y": 100}, {"x": 150, "y": 200}]'
            rows="6"
            class="glass-input"
            readonly
          ></textarea>
          <p v-if="errorMsg" class="error-msg">
            <span class="error-icon">⚠</span>
            {{ errorMsg }}
          </p>
          <div class="input-actions">
            <button class="btn-glow btn-primary" @click="addGeometry">
              <span class="btn-icon">+</span>
              添加多边形
            </button>
            <button class="btn-glass" @click="clearError">
              清空
            </button>
            <button class="btn-test" @click="generateRandomTestPolygon" title="生成随机测试多边形">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
              </svg>
              测试
            </button>
          </div>
        </div>
        
        <div class="panel-footer" v-if="geometries.length > 0">
          <button class="btn-glass" @click="resetView">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
              <path d="M3 3v5h5"></path>
            </svg>
            重置视图
          </button>
          <button class="btn-danger" @click="clearAll">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
            清空
          </button>
        </div>
        
        <div class="zoom-indicator" v-if="geometries.length > 0">
          <span class="zoom-value">{{ (viewState.scale * 100).toFixed(0) }}%</span>
        </div>
      </template>
    </DraggablePanel>

    <!-- 可拖拽图形列表 -->
    <DraggablePanel
      v-model:position="listPanelPos"
      title="图形列表"
      :badge="geometries.length"
      :collapsed="isListCollapsed"
      @update:collapsed="isListCollapsed = $event"
      class="list-panel"
    >
      <template #default>
        <GeometryList
          :geometries="geometries"
          :selected-id="selectedId"
          @select="selectGeometry"
          @toggle-visibility="toggleVisibility"
          @start-rename="startRename"
          @delete="deleteGeometry"
        />
      </template>
    </DraggablePanel>

    <!-- 重命名弹窗 -->
    <div v-if="editingNameId" class="rename-overlay" @click="cancelRename">
      <div class="rename-modal" @click.stop>
        <h4>重命名</h4>
        <input
          v-model="editingName"
          @keyup.enter="confirmRename"
          @keyup.esc="cancelRename"
          placeholder="输入新名称"
          autofocus
        />
        <div class="rename-actions">
          <button class="btn-primary" @click="confirmRename">确定</button>
          <button class="btn-secondary" @click="cancelRename">取消</button>
        </div>
      </div>
    </div>

    <!-- 画布 -->
    <canvas
      ref="canvasRef"
      class="dark-canvas"
      :class="{ dragging: isDragging }"
    />

    <!-- 右上角坐标提示 - 鼠标位置（一直显示） -->
    <div class="coordinate-tooltip mouse-tooltip">
      <div class="tooltip-content">
        <span class="tooltip-label">鼠标位置</span>
        <span class="tooltip-coords">
          X: {{ mouseWorldPos.x.toFixed(2) }}
        </span>
        <span class="tooltip-coords">
          Y: {{ mouseWorldPos.y.toFixed(2) }}
        </span>
      </div>
    </div>

    <!-- 顶点坐标提示（显示最后经过的顶点） -->
    <div v-if="lastHoveredVertex" class="coordinate-tooltip vertex-tooltip">
      <div class="tooltip-content">
        <span class="tooltip-label vertex-active">
          顶点 {{ lastHoveredVertex.vertexIndex + 1 }}
          <span v-if="hoveredVertex && hoveredVertex.geometryId === lastHoveredVertex.geometryId && hoveredVertex.vertexIndex === lastHoveredVertex.vertexIndex" class="active-indicator">●</span>
        </span>
        <span class="tooltip-coords">
          X: {{ lastHoveredVertex.point.x.toFixed(2) }}
        </span>
        <span class="tooltip-coords">
          Y: {{ lastHoveredVertex.point.y.toFixed(2) }}
        </span>
      </div>
    </div>

    <!-- 操作提示 -->
    <div class="floating-hint">
      <div class="hint-content">
        <span class="key">滚轮</span>
        <span>缩放</span>
        <span class="divider">|</span>
        <span class="key">拖拽</span>
        <span>移动</span>
        <span class="divider">|</span>
        <span class="key">悬停</span>
        <span>高亮</span>
      </div>
    </div>
  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}
</style>

<style scoped>
.container {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  background: #000;
}

.input-panel {
  width: 340px;
}

.list-panel {
  width: 320px;
}

.input-section {
  margin-bottom: 20px;
}

.input-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.label-icon {
  font-size: 14px;
}

.glass-input {
  width: 100%;
  padding: 14px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 12px;
  color: #00f5ff;
  resize: vertical;
  transition: all 0.3s ease;
  line-height: 1.6;
}

.glass-input::placeholder {
  color: rgba(255, 255, 255, 0.25);
}

.glass-input:focus {
  outline: none;
  border-color: rgba(0, 245, 255, 0.5);
  background: rgba(0, 0, 0, 0.4);
  box-shadow: 0 0 0 3px rgba(0, 245, 255, 0.1);
}

.error-msg {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 10px 0 0 0;
  font-size: 12px;
  color: #ff6b6b;
}

.error-icon {
  font-size: 14px;
}

.input-actions {
  display: flex;
  gap: 8px;
  margin-top: 14px;
}

.btn-glow {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px 20px;
  font-size: 13px;
  font-weight: 600;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
  overflow: hidden;
}

.btn-primary {
  flex: 1;
  background: linear-gradient(135deg, #00f5ff 0%, #00c8ff 100%);
  color: #000;
  box-shadow: 0 4px 20px rgba(0, 245, 255, 0.3);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(0, 245, 255, 0.4);
}

.btn-glass {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px 18px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  font-size: 13px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-glass:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
}

.btn-test {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px 14px;
  background: rgba(255, 0, 255, 0.1);
  border: 1px solid rgba(255, 0, 255, 0.3);
  border-radius: 10px;
  font-size: 13px;
  font-weight: 500;
  color: #ff00ff;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-test:hover {
  background: rgba(255, 0, 255, 0.2);
  border-color: rgba(255, 0, 255, 0.5);
  box-shadow: 0 0 20px rgba(255, 0, 255, 0.3);
}

.btn-danger {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 16px;
  background: rgba(255, 107, 107, 0.1);
  border: 1px solid rgba(255, 107, 107, 0.3);
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  color: #ff6b6b;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-danger:hover {
  background: rgba(255, 107, 107, 0.2);
  border-color: rgba(255, 107, 107, 0.5);
}

.panel-footer {
  display: flex;
  gap: 10px;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.zoom-indicator {
  margin-top: 16px;
  text-align: center;
}

.zoom-value {
  display: inline-block;
  padding: 6px 16px;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  color: #00f5ff;
  font-family: 'JetBrains Mono', monospace;
}

.rename-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.rename-modal {
  background: rgba(30, 30, 40, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 24px;
  min-width: 280px;
}

.rename-modal h4 {
  color: #fff;
  margin-bottom: 16px;
  font-size: 16px;
}

.rename-modal input {
  width: 100%;
  padding: 12px;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: #fff;
  font-size: 14px;
  margin-bottom: 16px;
}

.rename-modal input:focus {
  outline: none;
  border-color: #00f5ff;
}

.rename-actions {
  display: flex;
  gap: 10px;
}

.dark-canvas {
  display: block;
  width: 100vw;
  height: 100vh;
  background: #000;
  cursor: crosshair;
}

.dark-canvas.dragging {
  cursor: grabbing;
}

/* 右上角坐标提示 */
.coordinate-tooltip {
  position: absolute;
  right: 24px;
  z-index: 50;
}

.mouse-tooltip {
  top: 24px;
}

.vertex-tooltip {
  top: 130px;
}

.tooltip-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 16px;
  background: rgba(20, 20, 30, 0.9);
  backdrop-filter: blur(10px);
  border-radius: 10px;
  transition: all 0.3s ease;
  min-width: 140px;
}

.mouse-tooltip .tooltip-content {
  border: 1px solid rgba(0, 245, 255, 0.3);
  box-shadow: 0 0 20px rgba(0, 245, 255, 0.1);
}

.vertex-tooltip .tooltip-content {
  border: 1px solid rgba(255, 255, 0, 0.5);
  box-shadow: 0 0 30px rgba(255, 255, 0, 0.3);
}

.tooltip-label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
  text-transform: uppercase;
  letter-spacing: 1px;
  transition: color 0.3s ease;
}

.tooltip-label.vertex-active {
  color: #ffff00;
  font-weight: 600;
}

.tooltip-coords {
  font-size: 14px;
  font-weight: 600;
  font-family: 'JetBrains Mono', monospace;
  transition: color 0.3s ease;
}

.mouse-tooltip .tooltip-coords {
  color: #00f5ff;
}

.vertex-tooltip .tooltip-coords {
  color: #ffff00;
}

.active-indicator {
  color: #00ff00;
  font-size: 10px;
  margin-left: 6px;
  animation: pulse 1s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.floating-hint {
  position: absolute;
  bottom: 24px;
  right: 24px;
  z-index: 50;
}

.hint-content {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 20px;
  background: rgba(20, 20, 30, 0.8);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.6);
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
}

.key {
  padding: 4px 10px;
  background: rgba(0, 245, 255, 0.15);
  border: 1px solid rgba(0, 245, 255, 0.3);
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  color: #00f5ff;
  font-family: 'JetBrains Mono', monospace;
}

.divider {
  color: rgba(255, 255, 255, 0.2);
}
</style>
