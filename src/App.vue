<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted, computed } from 'vue'

interface Point {
  x: number
  y: number
}

interface Polygon {
  id: string
  name: string
  points: Point[]
  color: string
  visible: boolean
}

const inputText = ref<string>('')
const canvasRef = ref<HTMLCanvasElement | null>(null)
const errorMsg = ref<string>('')

// 多边形列表
const polygons = ref<Polygon[]>([])
const selectedPolygonId = ref<string | null>(null)
const editingNameId = ref<string | null>(null)
const editingName = ref('')

// 视图状态
const viewState = ref({
  scale: 1,
  offsetX: 0,
  offsetY: 0
})

// 拖拽状态
const isDragging = ref(false)
const lastMousePos = ref({ x: 0, y: 0 })

// 颜色列表
const colors = [
  '#409EFF', '#67C23A', '#E6A23C', '#F56C6C', 
  '#909399', '#8E44AD', '#1ABC9C', '#3498DB',
  '#E74C3C', '#F39C12', '#2ECC71', '#9B59B6'
]

let colorIndex = 0

// 生成唯一ID
const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2)

// 获取下一个颜色
const getNextColor = () => {
  const color = colors[colorIndex % colors.length]
  colorIndex++
  return color
}

// 绘制所有多边形
const drawAllPolygons = () => {
  const canvas = canvasRef.value
  if (!canvas) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  // 清空画布
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // 绘制网格背景
  drawGrid(ctx, canvas.width, canvas.height)

  // 绘制所有可见的多边形
  polygons.value.forEach(polygon => {
    if (polygon.visible) {
      drawSinglePolygon(ctx, polygon)
    }
  })
}

// 绘制单个多边形
const drawSinglePolygon = (ctx: CanvasRenderingContext2D, polygon: Polygon) => {
  const points = polygon.points
  if (points.length < 3) return

  // 计算边界框
  let minX = Infinity, maxX = -Infinity
  let minY = Infinity, maxY = -Infinity
  points.forEach(p => {
    minX = Math.min(minX, p.x)
    maxX = Math.max(maxX, p.x)
    minY = Math.min(minY, p.y)
    maxY = Math.max(maxY, p.y)
  })

  const width = maxX - minX
  const height = maxY - minY

  // 计算基础缩放比例
  const canvas = canvasRef.value!
  const padding = 50
  const baseScaleX = (canvas.width - padding * 2) / (width || 1)
  const baseScaleY = (canvas.height - padding * 2) / (height || 1)
  const baseScale = Math.min(baseScaleX, baseScaleY)

  // 计算居中偏移
  const centerOffsetX = (canvas.width - width * baseScale) / 2 - minX * baseScale
  const centerOffsetY = (canvas.height - height * baseScale) / 2 - minY * baseScale

  // 应用视图变换
  const finalScale = baseScale * viewState.value.scale
  const finalOffsetX = centerOffsetX + viewState.value.offsetX
  const finalOffsetY = centerOffsetY + viewState.value.offsetY

  // 绘制多边形
  ctx.beginPath()
  points.forEach((p, i) => {
    const x = p.x * finalScale + finalOffsetX
    const y = p.y * finalScale + finalOffsetY
    if (i === 0) {
      ctx.moveTo(x, y)
    } else {
      ctx.lineTo(x, y)
    }
  })
  ctx.closePath()

  // 填充
  ctx.fillStyle = hexToRgba(polygon.color, 0.3)
  ctx.fill()

  // 边框
  ctx.strokeStyle = polygon.color
  ctx.lineWidth = selectedPolygonId.value === polygon.id ? 3 : 2
  ctx.stroke()

  // 绘制顶点
  points.forEach((p, i) => {
    const x = p.x * finalScale + finalOffsetX
    const y = p.y * finalScale + finalOffsetY

    ctx.beginPath()
    ctx.arc(x, y, 5, 0, Math.PI * 2)
    ctx.fillStyle = polygon.color
    ctx.fill()

    ctx.fillStyle = '#333'
    ctx.font = '12px Arial'
    ctx.fillText(`${i + 1}`, x + 8, y - 8)
  })
}

// 颜色转换
const hexToRgba = (hex: string, alpha: number) => {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

// 绘制网格
const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
  ctx.strokeStyle = '#e0e0e0'
  ctx.lineWidth = 1

  const gridSize = 50 * viewState.value.scale
  const offsetX = viewState.value.offsetX % gridSize
  const offsetY = viewState.value.offsetY % gridSize

  for (let x = offsetX; x <= width; x += gridSize) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)
    ctx.stroke()
  }

  for (let y = offsetY; y <= height; y += gridSize) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
    ctx.stroke()
  }
}

// 添加多边形
const addPolygon = () => {
  errorMsg.value = ''
  if (!inputText.value.trim()) {
    errorMsg.value = '请输入点集数据'
    return
  }

  try {
    const points = JSON.parse(inputText.value) as Point[]
    if (!Array.isArray(points)) {
      errorMsg.value = '输入必须是数组格式'
      return
    }

    const validPoints = points.filter(p => 
      typeof p.x === 'number' && typeof p.y === 'number'
    )

    if (validPoints.length !== points.length) {
      errorMsg.value = '所有点必须包含 x 和 y 数字属性'
      return
    }

    if (validPoints.length < 3) {
      errorMsg.value = '至少需要3个点才能绘制多边形'
      return
    }

    const newPolygon: Polygon = {
      id: generateId(),
      name: `多边形 ${polygons.value.length + 1}`,
      points: validPoints,
      color: getNextColor(),
      visible: true
    }

    polygons.value.push(newPolygon)
    selectedPolygonId.value = newPolygon.id
    inputText.value = ''
    drawAllPolygons()
  } catch (e) {
    errorMsg.value = 'JSON 格式错误，请检查输入'
  }
}

// 删除多边形
const deletePolygon = (id: string) => {
  const index = polygons.value.findIndex(p => p.id === id)
  if (index > -1) {
    polygons.value.splice(index, 1)
    if (selectedPolygonId.value === id) {
      selectedPolygonId.value = null
    }
    drawAllPolygons()
  }
}

// 开始重命名
const startRename = (polygon: Polygon) => {
  editingNameId.value = polygon.id
  editingName.value = polygon.name
}

// 确认重命名
const confirmRename = () => {
  if (editingNameId.value) {
    const polygon = polygons.value.find(p => p.id === editingNameId.value)
    if (polygon && editingName.value.trim()) {
      polygon.name = editingName.value.trim()
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

// 切换多边形可见性
const toggleVisibility = (polygon: Polygon) => {
  polygon.visible = !polygon.visible
  drawAllPolygons()
}

// 选择多边形
const selectPolygon = (id: string) => {
  selectedPolygonId.value = id
  drawAllPolygons()
}

// 设置画布大小
const resizeCanvas = () => {
  const canvas = canvasRef.value
  if (!canvas) return

  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
  drawAllPolygons()
}

// 滚轮缩放
const handleWheel = (e: WheelEvent) => {
  e.preventDefault()
  
  const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1
  const newScale = viewState.value.scale * scaleFactor
  
  if (newScale < 0.1 || newScale > 10) return
  
  viewState.value.scale = newScale
  drawAllPolygons()
}

// 鼠标按下开始拖拽
const handleMouseDown = (e: MouseEvent) => {
  if (e.button === 0) {
    isDragging.value = true
    lastMousePos.value = { x: e.clientX, y: e.clientY }
  }
}

// 鼠标移动拖拽
const handleMouseMove = (e: MouseEvent) => {
  if (!isDragging.value) return
  
  const deltaX = e.clientX - lastMousePos.value.x
  const deltaY = e.clientY - lastMousePos.value.y
  
  viewState.value.offsetX += deltaX
  viewState.value.offsetY += deltaY
  
  lastMousePos.value = { x: e.clientX, y: e.clientY }
  
  drawAllPolygons()
}

// 鼠标释放结束拖拽
const handleMouseUp = () => {
  isDragging.value = false
}

// 重置视图
const resetView = () => {
  viewState.value = { scale: 1, offsetX: 0, offsetY: 0 }
  drawAllPolygons()
}

// 清空所有
const clearAll = () => {
  if (confirm('确定要清空所有多边形吗？')) {
    polygons.value = []
    selectedPolygonId.value = null
    drawAllPolygons()
  }
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
    <div class="input-panel">
      <h3>输入点集 (JSON 格式)</h3>
      <textarea
        v-model="inputText"
        placeholder='[{"x": 100, "y": 100}, {"x": 200, "y": 100}, {"x": 150, "y": 200}]'
        rows="8"
      ></textarea>
      <p v-if="errorMsg" class="error">{{ errorMsg }}</p>
      <div class="input-actions">
        <button class="btn-primary" @click="addPolygon">添加多边形</button>
        <button class="btn-secondary" @click="inputText = ''">清空输入</button>
      </div>
      
      <div class="polygon-list" v-if="polygons.length > 0">
        <h4>多边形列表 ({{ polygons.length }})</h4>
        <div 
          v-for="polygon in polygons" 
          :key="polygon.id"
          class="polygon-item"
          :class="{ selected: selectedPolygonId === polygon.id }"
          @click="selectPolygon(polygon.id)"
        >
          <div class="polygon-color" :style="{ backgroundColor: polygon.color }"></div>
          
          <div class="polygon-info" v-if="editingNameId !== polygon.id">
            <span class="polygon-name">{{ polygon.name }}</span>
            <span class="polygon-count">{{ polygon.points.length }}个点</span>
          </div>
          
          <div class="polygon-edit" v-else @click.stop>
            <input 
              v-model="editingName" 
              @keyup.enter="confirmRename"
              @keyup.esc="cancelRename"
              @blur="confirmRename"
              ref="renameInput"
              autofocus
            />
          </div>
          
          <div class="polygon-actions">
            <button 
              class="btn-icon" 
              :class="{ active: polygon.visible }"
              @click.stop="toggleVisibility(polygon)"
              :title="polygon.visible ? '隐藏' : '显示'"
            >
              {{ polygon.visible ? '👁' : '🚫' }}
            </button>
            <button 
              class="btn-icon" 
              @click.stop="startRename(polygon)"
              title="重命名"
            >
              ✏️
            </button>
            <button 
              class="btn-icon btn-delete" 
              @click.stop="deletePolygon(polygon.id)"
              title="删除"
            >
              🗑️
            </button>
          </div>
        </div>
      </div>
      
      <div class="controls" v-if="polygons.length > 0">
        <button class="btn-secondary" @click="resetView">重置视图</button>
        <button class="btn-danger" @click="clearAll">清空全部</button>
      </div>
      <div class="scale-info" v-if="polygons.length > 0">
        缩放: {{ (viewState.scale * 100).toFixed(0) }}%
      </div>
    </div>
    
    <canvas 
      ref="canvasRef" 
      class="canvas"
      :class="{ dragging: isDragging }"
    ></canvas>
    
    <div class="help-tip">
      <p>🖱️ 滚轮缩放 | 左键拖拽移动</p>
    </div>
  </div>
</template>

<style scoped>
.container {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

.input-panel {
  position: absolute;
  top: 20px;
  left: 20px;
  z-index: 100;
  background: rgba(255, 255, 255, 0.95);
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  width: 320px;
  max-height: calc(100vh - 40px);
  overflow-y: auto;
}

.input-panel h3 {
  margin: 0 0 12px 0;
  color: #333;
  font-size: 16px;
}

.input-panel textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 13px;
  resize: vertical;
  box-sizing: border-box;
}

.input-panel textarea:focus {
  outline: none;
  border-color: #409eff;
}

.error {
  color: #f56c6c;
  font-size: 12px;
  margin: 8px 0 0 0;
}

.input-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.btn-primary {
  flex: 1;
  padding: 8px 16px;
  background: #409eff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
}

.btn-primary:hover {
  background: #66b1ff;
}

.btn-secondary {
  padding: 8px 16px;
  background: #909399;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
}

.btn-secondary:hover {
  background: #a6a9ad;
}

.btn-danger {
  padding: 8px 16px;
  background: #f56c6c;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
}

.btn-danger:hover {
  background: #f78989;
}

.polygon-list {
  margin-top: 20px;
  border-top: 1px solid #e4e7ed;
  padding-top: 16px;
}

.polygon-list h4 {
  margin: 0 0 12px 0;
  color: #606266;
  font-size: 14px;
}

.polygon-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px;
  background: #f5f7fa;
  border-radius: 4px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.polygon-item:hover {
  background: #ebeef5;
}

.polygon-item.selected {
  background: #ecf5ff;
  border: 1px solid #409eff;
}

.polygon-color {
  width: 12px;
  height: 12px;
  border-radius: 2px;
  flex-shrink: 0;
}

.polygon-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.polygon-name {
  font-size: 13px;
  color: #303133;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.polygon-count {
  font-size: 11px;
  color: #909399;
}

.polygon-edit {
  flex: 1;
}

.polygon-edit input {
  width: 100%;
  padding: 4px 8px;
  border: 1px solid #409eff;
  border-radius: 4px;
  font-size: 13px;
  box-sizing: border-box;
}

.polygon-actions {
  display: flex;
  gap: 4px;
}

.btn-icon {
  padding: 4px 6px;
  background: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  opacity: 0.6;
  transition: all 0.2s;
}

.btn-icon:hover {
  opacity: 1;
  background: rgba(0, 0, 0, 0.1);
}

.btn-icon.active {
  opacity: 1;
}

.btn-delete:hover {
  background: #fde2e2;
}

.controls {
  display: flex;
  gap: 8px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #e4e7ed;
}

.scale-info {
  margin-top: 12px;
  font-size: 12px;
  color: #606266;
  text-align: center;
}

.canvas {
  display: block;
  width: 100vw;
  height: 100vh;
  background: #f5f7fa;
  cursor: grab;
}

.canvas.dragging {
  cursor: grabbing;
}

.help-tip {
  position: absolute;
  bottom: 20px;
  right: 20px;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 13px;
  pointer-events: none;
}

.help-tip p {
  margin: 0;
}
</style>
