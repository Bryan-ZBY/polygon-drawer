<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import type { Geometry, Polygon, ViewState } from '@/types'
import { GeometryType, generateId, getNextColor } from '@/types'
import { 
  clearCanvas, 
  drawGrid, 
  drawGeometry 
} from '@/utils/canvasRenderer'
import { generateNonOverlappingPolygon } from '@/utils/geometryGenerator'
import InputPanel from '@/components/InputPanel.vue'
import GeometryList from '@/components/GeometryList.vue'

// 状态
const geometries = ref<Geometry[]>([])
const selectedId = ref<string | null>(null)
const errorMsg = ref('')
const canvasRef = ref<HTMLCanvasElement | null>(null)

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
      drawGeometry(
        ctx, 
        geometry, 
        viewState.value, 
        canvas.width, 
        canvas.height, 
        selectedId.value === geometry.id
      )
    }
  })
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

  // 获取现有的多边形
  const existingPolygons = geometries.value.filter(
    g => g.type === GeometryType.POLYGON
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

// 鼠标按下
const handleMouseDown = (e: MouseEvent) => {
  if (e.button === 0) {
    isDragging.value = true
    lastMousePos.value = { x: e.clientX, y: e.clientY }
  }
}

// 鼠标移动
const handleMouseMove = (e: MouseEvent) => {
  if (!isDragging.value) return

  const deltaX = e.clientX - lastMousePos.value.x
  const deltaY = e.clientY - lastMousePos.value.y

  viewState.value.offsetX += deltaX
  viewState.value.offsetY += deltaY

  lastMousePos.value = { x: e.clientX, y: e.clientY }

  drawAll()
}

// 鼠标释放
const handleMouseUp = () => {
  isDragging.value = false
}

onMounted(() => {
  resizeCanvas()
  window.addEventListener('resize', resizeCanvas)

  const canvas = canvasRef.value
  if (canvas) {
    canvas.addEventListener('wheel', handleWheel, { passive: false })
    canvas.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', resizeCanvas)
  window.removeEventListener('mousemove', handleMouseMove)
  window.removeEventListener('mouseup', handleMouseUp)
})
</script>

<template>
  <div class="container">
    <!-- 输入面板 -->
    <InputPanel
      :geometries-count="geometries.length"
      :view-scale="viewState.scale"
      @add="addGeometry"
      @error="errorMsg = $event"
      @clear="clearError"
      @reset-view="resetView"
      @clear-all="clearAll"
      @generate-random="generateRandomTestPolygon"
    />

    <!-- 图形列表 -->
    <div class="list-container">
      <GeometryList
        :geometries="geometries"
        :selected-id="selectedId"
        @select="selectGeometry"
        @toggle-visibility="toggleVisibility"
        @start-rename="startRename"
        @delete="deleteGeometry"
      />

      <!-- 重命名输入框 -->
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
    </div>

    <!-- 画布 -->
    <canvas
      ref="canvasRef"
      class="dark-canvas"
      :class="{ dragging: isDragging }"
    />

    <!-- 操作提示 -->
    <div class="floating-hint">
      <div class="hint-content">
        <span class="key">滚轮</span>
        <span>缩放</span>
        <span class="divider">|</span>
        <span class="key">拖拽</span>
        <span>移动</span>
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

.list-container {
  position: absolute;
  top: 20px;
  left: 380px;
  z-index: 100;
  width: 320px;
  max-height: calc(100vh - 40px);
  background: rgba(20, 20, 30, 0.75);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 20px;
  overflow-y: auto;
  box-shadow:
    0 25px 50px -12px rgba(0, 0, 0, 0.5),
    0 0 0 1px rgba(255, 255, 255, 0.05) inset;
}

.list-container::-webkit-scrollbar {
  width: 6px;
}

.list-container::-webkit-scrollbar-track {
  background: transparent;
}

.list-container::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
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

.btn-primary {
  flex: 1;
  padding: 10px;
  background: linear-gradient(135deg, #00f5ff 0%, #00c8ff 100%);
  border: none;
  border-radius: 8px;
  color: #000;
  font-weight: 600;
  cursor: pointer;
}

.btn-secondary {
  flex: 1;
  padding: 10px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: #fff;
  cursor: pointer;
}

.dark-canvas {
  display: block;
  width: 100vw;
  height: 100vh;
  background: #000;
  cursor: grab;
}

.dark-canvas.dragging {
  cursor: grabbing;
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
