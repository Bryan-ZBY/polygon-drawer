<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
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
import RealtimeInput from '@/components/RealtimeInput.vue'

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

// 测距功能
const isMeasuring = ref(false)
const measureStart = ref<Point | null>(null)
const measureEnd = ref<Point | null>(null)
const snappedPoint = ref<Point | null>(null)
const snapType = ref<'none' | 'vertex' | 'edge' | 'axis' | 'edge-axis'>('none')
const isMeasurePending = ref(false)  // 松开Ctrl后等待左键确认的测距状态

// 已完成的测距线列表
const measurements = ref<Array<{ id: string; start: Point; end: Point; distance: number }>>([])
const selectedMeasurementId = ref<string | null>(null)
const hoveredMeasurementId = ref<string | null>(null)
const measurementDeleteBtnPos = ref<{ x: number; y: number; measurementId: string } | null>(null)

// 吸附阈值（像素）
const SNAP_THRESHOLD = 15
const EDGE_SNAP_THRESHOLD = 10

// 计算距离
const calculateDistance = (a: Point, b: Point): number => {
  return Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2))
}

// 渲染优化相关
const animationFrameId = ref<number | null>(null)
const needsRedraw = ref(false)

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
const isRightDragging = ref(false)  // 右键拖动状态
const isMeasureDragging = ref(false)  // 测距时左键拖动状态
const canMeasureDrag = ref(false)  // 是否可以拖动（需要重新按下左键）
const lastMousePos = ref({ x: 0, y: 0 })
const measureDragStartPos = ref({ x: 0, y: 0 })  // 测距时左键按下的位置
const lastClickTime = ref(0)  // 上次左键点击时间，用于检测双击
const DOUBLE_CLICK_DELAY = 300  // 双击间隔阈值（毫秒）

// 重命名状态
const editingNameId = ref<string | null>(null)
const editingName = ref('')

// 面板折叠状态
const isListCollapsed = ref(false)
const isInputCollapsed = ref(false)

// 从 localStorage 读取位置
const loadPanelPositions = () => {
  try {
    const saved = localStorage.getItem('polygon-drawer-positions')
    if (saved) {
      const positions = JSON.parse(saved)
      return {
        input: positions.input || { x: 20, y: 20 },
        list: positions.list || { x: 20, y: 380 }
      }
    }
  } catch (e) {
    console.error('Failed to load positions:', e)
  }
  return {
    input: { x: 20, y: 20 },
    list: { x: 20, y: 380 }
  }
}

const savedPositions = loadPanelPositions()

// 输入面板位置
const inputPanelPos = ref(savedPositions.input)

// 图形列表位置
const listPanelPos = ref(savedPositions.list)

// 保存位置到 localStorage
const savePanelPositions = () => {
  try {
    localStorage.setItem('polygon-drawer-positions', JSON.stringify({
      input: inputPanelPos.value,
      list: listPanelPos.value
    }))
  } catch (e) {
    console.error('Failed to save positions:', e)
  }
}

// 监听位置变化并保存
watch(inputPanelPos, savePanelPositions, { deep: true })
watch(listPanelPos, savePanelPositions, { deep: true })

// 世界坐标转屏幕坐标
const worldToScreen = (point: Point): { x: number; y: number } => {
  const canvas = canvasRef.value
  if (!canvas) return { x: 0, y: 0 }
  
  const centerX = canvas.width / 2
  const centerY = canvas.height / 2
  
  return {
    x: centerX + (point.x * viewState.value.scale) + viewState.value.offsetX,
    y: centerY + (point.y * viewState.value.scale) + viewState.value.offsetY
  }
}

// 使用 requestAnimationFrame 的绘制函数
const scheduleDraw = () => {
  needsRedraw.value = true
  if (!animationFrameId.value) {
    animationFrameId.value = requestAnimationFrame(() => {
      drawAll()
      animationFrameId.value = null
      if (needsRedraw.value) {
        scheduleDraw()
      }
    })
  }
}

// 实际绘制函数
const drawAll = () => {
  needsRedraw.value = false
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

  // 绘制吸附点
  if (snappedPoint.value && snapType.value !== 'none') {
    const screenPos = worldToScreen(snappedPoint.value)

    if (snapType.value === 'axis' || snapType.value === 'edge-axis') {
      // 轴吸附或边+轴吸附：绘制十字线
      ctx.strokeStyle = '#ff6b6b'
      ctx.lineWidth = 1
      ctx.setLineDash([3, 3])

      // 水平线
      ctx.beginPath()
      ctx.moveTo(0, screenPos.y)
      ctx.lineTo(canvas.width, screenPos.y)
      ctx.stroke()

      // 垂直线
      ctx.beginPath()
      ctx.moveTo(screenPos.x, 0)
      ctx.lineTo(screenPos.x, canvas.height)
      ctx.stroke()

      ctx.setLineDash([])

      // 边+轴吸附：使用边的颜色（绿色），普通轴吸附使用红色
      const isEdgeAxis = snapType.value === 'edge-axis'
      ctx.beginPath()
      ctx.arc(screenPos.x, screenPos.y, isEdgeAxis ? 8 : 6, 0, Math.PI * 2)
      ctx.fillStyle = isEdgeAxis ? 'rgba(0, 255, 136, 0.5)' : 'rgba(255, 107, 107, 0.5)'
      ctx.fill()
      ctx.strokeStyle = isEdgeAxis ? '#00ff88' : '#ff6b6b'
      ctx.lineWidth = 2
      ctx.stroke()
    } else {
      // 顶点或边吸附
      ctx.beginPath()
      ctx.arc(screenPos.x, screenPos.y, 8, 0, Math.PI * 2)
      ctx.fillStyle = snapType.value === 'vertex' ? 'rgba(255, 255, 0, 0.5)' : 'rgba(0, 255, 136, 0.5)'
      ctx.fill()
      ctx.strokeStyle = snapType.value === 'vertex' ? '#ffff00' : '#00ff88'
      ctx.lineWidth = 2
      ctx.stroke()
    }
  }

  // 绘制测距线
  if (isMeasuring.value && measureStart.value && measureEnd.value) {
    const start = worldToScreen(measureStart.value)
    const end = worldToScreen(measureEnd.value)

    // 待确认状态下使用不同的颜色
    const lineColor = isMeasurePending.value ? '#ffff00' : '#00f5ff'
    const labelBgColor = isMeasurePending.value ? 'rgba(255, 255, 0, 0.2)' : 'rgba(0, 245, 255, 0.2)'
    const labelBorderColor = isMeasurePending.value ? 'rgba(255, 255, 0, 0.5)' : 'rgba(0, 245, 255, 0.5)'
    const labelTextColor = isMeasurePending.value ? '#ffff00' : '#00f5ff'

    // 绘制测距线
    ctx.beginPath()
    ctx.moveTo(start.x, start.y)
    ctx.lineTo(end.x, end.y)
    ctx.strokeStyle = lineColor
    ctx.lineWidth = 2
    ctx.setLineDash([5, 5])
    ctx.stroke()
    ctx.setLineDash([])

    // 绘制起点
    ctx.beginPath()
    ctx.arc(start.x, start.y, 6, 0, Math.PI * 2)
    ctx.fillStyle = '#00ff88'
    ctx.fill()
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2
    ctx.stroke()

    // 绘制终点
    ctx.beginPath()
    ctx.arc(end.x, end.y, 6, 0, Math.PI * 2)
    ctx.fillStyle = '#ff6b6b'
    ctx.fill()
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2
    ctx.stroke()

    // 绘制距离标签背景
    const midX = (start.x + end.x) / 2
    const midY = (start.y + end.y) / 2
    const distance = calculateDistance(measureStart.value, measureEnd.value)
    const label = distance.toFixed(2)
    ctx.font = 'bold 14px "JetBrains Mono", monospace'
    const textWidth = ctx.measureText(label).width

    ctx.fillStyle = labelBgColor
    ctx.strokeStyle = labelBorderColor
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.roundRect(midX - textWidth / 2 - 8, midY - 12, textWidth + 16, 24, 4)
    ctx.fill()
    ctx.stroke()

    // 绘制距离标签文字
    ctx.fillStyle = labelTextColor
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(label, midX, midY)

    // 待确认状态下显示提示文字
    if (isMeasurePending.value) {
      ctx.font = '12px "Inter", sans-serif'
      const hintText = '点击左键确认终点'
      const hintWidth = ctx.measureText(hintText).width
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
      ctx.beginPath()
      ctx.roundRect(midX - hintWidth / 2 - 6, midY + 16, hintWidth + 12, 18, 4)
      ctx.fill()
      ctx.fillStyle = '#ffff00'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(hintText, midX, midY + 25)
    }
  }

  // 绘制已保存的测距线
  measurements.value.forEach(measurement => {
    const isSelected = selectedMeasurementId.value === measurement.id
    const isHovered = hoveredMeasurementId.value === measurement.id
    const start = worldToScreen(measurement.start)
    const end = worldToScreen(measurement.end)

    // 绘制测距线 - 悬浮时为黄色，选中时为紫色，默认青色
    ctx.beginPath()
    ctx.moveTo(start.x, start.y)
    ctx.lineTo(end.x, end.y)
    if (isHovered) {
      ctx.strokeStyle = '#ffff00'
      ctx.lineWidth = 3
    } else if (isSelected) {
      ctx.strokeStyle = '#ff6b6b'
      ctx.lineWidth = 3
    } else {
      ctx.strokeStyle = '#00f5ff'
      ctx.lineWidth = 2
    }
    ctx.setLineDash([5, 5])
    ctx.stroke()
    ctx.setLineDash([])

    // 绘制起点
    ctx.beginPath()
    ctx.arc(start.x, start.y, isHovered || isSelected ? 7 : 5, 0, Math.PI * 2)
    ctx.fillStyle = '#00ff88'
    ctx.fill()
    if (isHovered) {
      ctx.strokeStyle = '#ffff00'
    } else if (isSelected) {
      ctx.strokeStyle = '#ff6b6b'
    } else {
      ctx.strokeStyle = '#fff'
    }
    ctx.lineWidth = 2
    ctx.stroke()

    // 绘制终点
    ctx.beginPath()
    ctx.arc(end.x, end.y, isHovered || isSelected ? 7 : 5, 0, Math.PI * 2)
    ctx.fillStyle = '#ff6b6b'
    ctx.fill()
    if (isHovered) {
      ctx.strokeStyle = '#ffff00'
    } else if (isSelected) {
      ctx.strokeStyle = '#ff6b6b'
    } else {
      ctx.strokeStyle = '#fff'
    }
    ctx.lineWidth = 2
    ctx.stroke()

    // 计算标签位置（稍微偏移避免遮挡线条）
    const midX = (start.x + end.x) / 2
    const midY = (start.y + end.y) / 2
    const dx = end.x - start.x
    const dy = end.y - start.y
    const len = Math.sqrt(dx * dx + dy * dy)

    // 垂直于线条的偏移方向 - 增加偏移距离到 30
    let offsetX = 0
    let offsetY = -30
    if (len > 0) {
      offsetX = -(dy / len) * 30
      offsetY = (dx / len) * 30
    }

    const labelX = midX + offsetX
    const labelY = midY + offsetY
    const label = measurement.distance.toFixed(2)

    // 绘制标签背景
    ctx.font = 'bold 13px "JetBrains Mono", monospace'
    const textWidth = ctx.measureText(label).width

    if (isHovered) {
      ctx.fillStyle = 'rgba(255, 255, 0, 0.3)'
      ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)'
      ctx.lineWidth = 2
    } else if (isSelected) {
      ctx.fillStyle = 'rgba(255, 0, 255, 0.3)'
      ctx.strokeStyle = 'rgba(255, 0, 255, 0.6)'
      ctx.lineWidth = 1
    } else {
      ctx.fillStyle = 'rgba(0, 245, 255, 0.2)'
      ctx.strokeStyle = 'rgba(0, 245, 255, 0.5)'
      ctx.lineWidth = 1
    }
    ctx.beginPath()
    ctx.roundRect(labelX - textWidth / 2 - 6, labelY - 10, textWidth + 12, 20, 4)
    ctx.fill()
    ctx.stroke()

    // 绘制距离标签文字
    if (isHovered) {
      ctx.fillStyle = '#ffff00'
    } else if (isSelected) {
      ctx.fillStyle = '#ff6b6b'
    } else {
      ctx.fillStyle = '#00f5ff'
    }
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(label, labelX, labelY)

    // 如果悬浮，显示端点坐标
    if (isHovered) {
      // 起点坐标
      const startLabel = `(${measurement.start.x.toFixed(1)}, ${measurement.start.y.toFixed(1)})`
      const endLabel = `(${measurement.end.x.toFixed(1)}, ${measurement.end.y.toFixed(1)})`

      ctx.font = '11px "JetBrains Mono", monospace'
      const startLabelWidth = ctx.measureText(startLabel).width
      const endLabelWidth = ctx.measureText(endLabel).width

      // 绘制起点坐标背景
      ctx.fillStyle = 'rgba(0, 255, 136, 0.3)'
      ctx.strokeStyle = 'rgba(0, 255, 136, 0.6)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.roundRect(start.x - startLabelWidth / 2 - 4, start.y - 22, startLabelWidth + 8, 16, 4)
      ctx.fill()
      ctx.stroke()

      // 绘制起点坐标文字
      ctx.fillStyle = '#00ff88'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(startLabel, start.x, start.y - 14)

      // 绘制终点坐标背景
      ctx.fillStyle = 'rgba(255, 107, 107, 0.3)'
      ctx.strokeStyle = 'rgba(255, 107, 107, 0.6)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.roundRect(end.x - endLabelWidth / 2 - 4, end.y - 22, endLabelWidth + 8, 16, 4)
      ctx.fill()
      ctx.stroke()

      // 绘制终点坐标文字
      ctx.fillStyle = '#ff6b6b'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(endLabel, end.x, end.y - 14)
    }

    // 如果悬浮或选中，绘制删除按钮
    if (isHovered || isSelected) {
      const btnX = labelX + textWidth / 2 + 20
      const btnY = labelY

      // 删除按钮背景
      ctx.beginPath()
      ctx.arc(btnX, btnY, 12, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(255, 0, 0, 0.8)'
      ctx.fill()
      ctx.strokeStyle = '#ff0000'
      ctx.lineWidth = 2
      ctx.stroke()

      // 删除按钮 X 符号
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(btnX - 4, btnY - 4)
      ctx.lineTo(btnX + 4, btnY + 4)
      ctx.moveTo(btnX + 4, btnY - 4)
      ctx.lineTo(btnX - 4, btnY + 4)
      ctx.stroke()

      // 保存删除按钮位置供点击检测
      measurementDeleteBtnPos.value = { x: btnX, y: btnY, measurementId: measurement.id }
    }
  })
}

// 计算点到线段的距离和最近点
const pointToSegmentDistance = (p: Point, a: Point, b: Point): { distance: number; closestPoint: Point } => {
  const ab = { x: b.x - a.x, y: b.y - a.y }
  const ap = { x: p.x - a.x, y: p.y - a.y }
  const abLen = Math.sqrt(ab.x * ab.x + ab.y * ab.y)
  
  if (abLen === 0) {
    return { distance: Math.sqrt(ap.x * ap.x + ap.y * ap.y), closestPoint: a }
  }
  
  const t = Math.max(0, Math.min(1, (ap.x * ab.x + ap.y * ab.y) / (abLen * abLen)))
  const closestPoint = {
    x: a.x + t * ab.x,
    y: a.y + t * ab.y
  }
  
  const dx = p.x - closestPoint.x
  const dy = p.y - closestPoint.y
  
  return { distance: Math.sqrt(dx * dx + dy * dy), closestPoint }
}

// 检测是否点击了测距线
const detectMeasurementClick = (worldPos: Point): { id: string } | null => {
  const CLICK_THRESHOLD = 10 / viewState.value.scale // 10像素的点击阈值，转换为世界坐标

  for (let i = measurements.value.length - 1; i >= 0; i--) {
    const measurement = measurements.value[i]
    const { distance } = pointToSegmentDistance(worldPos, measurement.start, measurement.end)

    if (distance < CLICK_THRESHOLD) {
      return { id: measurement.id }
    }
  }
  return null
}

// 删除选中的测距线
const deleteSelectedMeasurement = () => {
  if (selectedMeasurementId.value) {
    const index = measurements.value.findIndex(m => m.id === selectedMeasurementId.value)
    if (index > -1) {
      measurements.value.splice(index, 1)
      selectedMeasurementId.value = null
      measurementDeleteBtnPos.value = null
      scheduleDraw()
    }
  }
}

// 删除指定测距线
const deleteMeasurement = (id: string) => {
  const index = measurements.value.findIndex(m => m.id === id)
  if (index > -1) {
    measurements.value.splice(index, 1)
    if (selectedMeasurementId.value === id) {
      selectedMeasurementId.value = null
    }
    measurementDeleteBtnPos.value = null
    scheduleDraw()
  }
}

// 检测测距线悬浮
const detectMeasurementHover = (worldPos: Point): { id: string } | null => {
  const HOVER_THRESHOLD = 8 / viewState.value.scale // 8像素的悬浮阈值

  for (let i = measurements.value.length - 1; i >= 0; i--) {
    const measurement = measurements.value[i]
    const { distance } = pointToSegmentDistance(worldPos, measurement.start, measurement.end)

    if (distance < HOVER_THRESHOLD) {
      return { id: measurement.id }
    }
  }
  return null
}

// 吸附检测
const detectSnap = (worldPos: Point): { point: Point; type: 'vertex' | 'edge' | 'axis' | 'edge-axis' | 'none' } => {
  let minDist = Infinity
  let snapPoint = worldPos
  let snapType: 'vertex' | 'edge' | 'axis' | 'edge-axis' | 'none' = 'none'

  // 检测顶点吸附
  for (const geometry of geometries.value) {
    if (!geometry.visible || geometry.type !== 'polygon') continue

    const polygon = geometry as Polygon
    for (const point of polygon.points) {
      const dist = Math.sqrt(
        Math.pow(point.x - worldPos.x, 2) +
        Math.pow(point.y - worldPos.y, 2)
      )
      const screenDist = dist * viewState.value.scale

      if (screenDist < SNAP_THRESHOLD && screenDist < minDist) {
        minDist = screenDist
        snapPoint = point
        snapType = 'vertex'
      }
    }
  }

  // 检测边吸附（顶点吸附优先）
  let edgeSnapPoint: Point | null = null
  let edgeMinDist = Infinity
  if (snapType === 'none') {
    for (const geometry of geometries.value) {
      if (!geometry.visible || geometry.type !== 'polygon') continue

      const polygon = geometry as Polygon
      const points = polygon.points
      for (let i = 0; i < points.length; i++) {
        const a = points[i]
        const b = points[(i + 1) % points.length]
        const { distance, closestPoint } = pointToSegmentDistance(worldPos, a, b)
        const screenDist = distance * viewState.value.scale

        if (screenDist < EDGE_SNAP_THRESHOLD && screenDist < edgeMinDist) {
          edgeMinDist = screenDist
          edgeSnapPoint = closestPoint
        }
      }
    }
    if (edgeSnapPoint) {
      snapPoint = edgeSnapPoint
      snapType = 'edge'
      minDist = edgeMinDist
    }
  }

  // 测距时检测水平/垂直轴吸附
  if (isMeasuring.value && measureStart.value) {
    const AXIS_SNAP_THRESHOLD = 10 / viewState.value.scale // 10像素的轴吸附阈值
    const start = measureStart.value

    // 检测水平轴吸附（Y坐标相同）
    const yDist = Math.abs(worldPos.y - start.y)
    if (yDist < AXIS_SNAP_THRESHOLD) {
      const axisSnapPoint = { x: worldPos.x, y: start.y }
      const yScreenDist = yDist * viewState.value.scale

      if (snapType === 'edge' && edgeSnapPoint) {
        // 边吸附和水平轴吸附同时满足：将边吸附点投影到水平轴上
        snapPoint = { x: edgeSnapPoint.x, y: start.y }
        snapType = 'edge-axis'
      } else if (yScreenDist < minDist) {
        minDist = yScreenDist
        snapPoint = axisSnapPoint
        snapType = 'axis'
      }
    }

    // 检测垂直轴吸附（X坐标相同）
    const xDist = Math.abs(worldPos.x - start.x)
    if (xDist < AXIS_SNAP_THRESHOLD) {
      const axisSnapPoint = { x: start.x, y: worldPos.y }
      const xScreenDist = xDist * viewState.value.scale

      if (snapType === 'edge' && edgeSnapPoint) {
        // 边吸附和垂直轴吸附同时满足：将边吸附点投影到垂直轴上
        snapPoint = { x: start.x, y: edgeSnapPoint.y }
        snapType = 'edge-axis'
      } else if (xScreenDist < minDist) {
        minDist = xScreenDist
        snapPoint = axisSnapPoint
        snapType = 'axis'
      }
    }
  }

  return { point: snapPoint, type: snapType }
}

// 处理鼠标移动 - 优化版本，减少不必要的重绘
const handleMouseMove = (e: MouseEvent) => {
  const canvas = canvasRef.value
  if (!canvas) return

  // 获取鼠标在画布上的位置
  const rect = canvas.getBoundingClientRect()
  const newMousePos = {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  }

  // 计算世界坐标
  const centerX = canvas.width / 2
  const centerY = canvas.height / 2
  const worldPos = {
    x: (newMousePos.x - centerX - viewState.value.offsetX) / viewState.value.scale,
    y: (newMousePos.y - centerY - viewState.value.offsetY) / viewState.value.scale
  }

  // 检测吸附
  const snap = detectSnap(worldPos)
  const snapChanged = (snappedPoint.value?.x !== snap.point.x || snappedPoint.value?.y !== snap.point.y || snapType.value !== snap.type)
  snappedPoint.value = snap.type !== 'none' ? snap.point : null
  snapType.value = snap.type

  // 更新测距终点
  let measureChanged = false
  if (isMeasuring.value) {
    const newEnd = snap.point || worldPos
    if (!measureEnd.value || measureEnd.value.x !== newEnd.x || measureEnd.value.y !== newEnd.y) {
      measureEnd.value = newEnd
      measureChanged = true
    }
  }

  // 检测悬停 - 只在鼠标位置变化较大或需要时检测
  const result = detectHover(
    newMousePos.x,
    newMousePos.y,
    geometries.value,
    viewState.value,
    canvas.width,
    canvas.height
  )

  // 更新悬停状态
  const hoverChanged = result.hoveredGeometryId !== hoveredId.value
  if (hoverChanged) {
    hoveredId.value = result.hoveredGeometryId
  }

  // 更新当前悬停顶点
  const vertexChanged = 
    (hoveredVertex.value?.geometryId !== result.hoveredVertex?.geometryId) ||
    (hoveredVertex.value?.vertexIndex !== result.hoveredVertex?.vertexIndex)
  hoveredVertex.value = result.hoveredVertex

  // 如果有新的悬停顶点，更新最后经过的顶点
  let lastVertexChanged = false
  if (result.hoveredVertex) {
    if (!lastHoveredVertex.value ||
        lastHoveredVertex.value.geometryId !== result.hoveredVertex.geometryId ||
        lastHoveredVertex.value.vertexIndex !== result.hoveredVertex.vertexIndex) {
      lastHoveredVertex.value = result.hoveredVertex
      lastVertexChanged = true
    }
  }

  // 更新鼠标位置
  mousePos.value = newMousePos

  // 处理左键拖拽（包括测距时）
  let dragChanged = false
  if (isDragging.value) {
    const deltaX = e.clientX - lastMousePos.value.x
    const deltaY = e.clientY - lastMousePos.value.y

    if (deltaX !== 0 || deltaY !== 0) {
      viewState.value.offsetX += deltaX
      viewState.value.offsetY += deltaY
      dragChanged = true
    }

    lastMousePos.value = { x: e.clientX, y: e.clientY }
  }

  // 处理测距时的左键拖动（移动超过5像素视为拖动）
  if (isMeasuring.value && canMeasureDrag.value && e.buttons === 1) {
    if (!isMeasureDragging.value) {
      const deltaX = e.clientX - measureDragStartPos.value.x
      const deltaY = e.clientY - measureDragStartPos.value.y
      if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
        isMeasureDragging.value = true
      }
    }

    if (isMeasureDragging.value) {
      const deltaX = e.clientX - lastMousePos.value.x
      const deltaY = e.clientY - lastMousePos.value.y

      if (deltaX !== 0 || deltaY !== 0) {
        viewState.value.offsetX += deltaX
        viewState.value.offsetY += deltaY
        dragChanged = true
      }

      lastMousePos.value = { x: e.clientX, y: e.clientY }
    }
  }

  // 处理右键拖拽（测距时也可以移动画布）
  if (e.buttons === 2) {
    // 检测是否开始右键拖动（移动超过5像素视为拖动）
    if (!isRightDragging.value) {
      const deltaX = e.clientX - lastMousePos.value.x
      const deltaY = e.clientY - lastMousePos.value.y
      if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
        isRightDragging.value = true
      }
    }

    if (isRightDragging.value) {
      const deltaX = e.clientX - lastMousePos.value.x
      const deltaY = e.clientY - lastMousePos.value.y

      if (deltaX !== 0 || deltaY !== 0) {
        viewState.value.offsetX += deltaX
        viewState.value.offsetY += deltaY
        dragChanged = true
      }

      lastMousePos.value = { x: e.clientX, y: e.clientY }
    }
  }

  // 检测测距线悬浮 - 只有检测到新的悬浮时才更新，移出时不清空
  let measurementHoverChanged = false
  if (!isMeasuring.value && !isDragging.value && !isRightDragging.value) {
    const hoveredMeasurement = detectMeasurementHover(worldPos)
    if (hoveredMeasurement?.id) {
      // 只有悬浮到新的测距线时才更新
      if (hoveredMeasurementId.value !== hoveredMeasurement.id) {
        hoveredMeasurementId.value = hoveredMeasurement.id
        measurementHoverChanged = true
      }
    }
    // 注意：移出时不清空 hoveredMeasurementId，保持最后一个悬浮状态
  }

  // 只有在需要时才调度重绘
  if (snapChanged || measureChanged || hoverChanged || vertexChanged || lastVertexChanged || dragChanged || isDragging.value || isRightDragging.value || isMeasuring.value || measurementHoverChanged) {
    scheduleDraw()
  }
}

// 处理鼠标按下
const handleMouseDown = (e: MouseEvent) => {
  const canvas = canvasRef.value
  if (!canvas) return

  // 获取点击位置的世界坐标
  const rect = canvas.getBoundingClientRect()
  const clickX = e.clientX - rect.left
  const clickY = e.clientY - rect.top
  const centerX = canvas.width / 2
  const centerY = canvas.height / 2
  const worldPos = {
    x: (clickX - centerX - viewState.value.offsetX) / viewState.value.scale,
    y: (clickY - centerY - viewState.value.offsetY) / viewState.value.scale
  }

  if (e.button === 0) {
    // 左键：拖动画布 或 Ctrl+左键测距 或 双击测距
    e.preventDefault()

    // 检测是否点击了删除按钮
    if (measurementDeleteBtnPos.value) {
      const btnScreenX = measurementDeleteBtnPos.value.x
      const btnScreenY = measurementDeleteBtnPos.value.y
      const distToBtn = Math.sqrt(Math.pow(clickX - btnScreenX, 2) + Math.pow(clickY - btnScreenY, 2))
      if (distToBtn < 15) {
        // 点击了删除按钮
        deleteMeasurement(measurementDeleteBtnPos.value.measurementId)
        return
      }
    }

    // 检测是否点击了已有的测距线
    const clickedMeasurement = detectMeasurementClick(worldPos)
    if (clickedMeasurement) {
      selectedMeasurementId.value = clickedMeasurement.id
      scheduleDraw()
      return
    }

    // 检测双击
    const now = Date.now()
    const isDoubleClick = now - lastClickTime.value < DOUBLE_CLICK_DELAY
    lastClickTime.value = now

    // 双击 或 Ctrl+左键：开始测距或结束测距
    if (isDoubleClick || e.ctrlKey) {
      // Ctrl+左键：开始测距或结束测距
      selectedMeasurementId.value = null
      measurementDeleteBtnPos.value = null

      // 检测吸附
      const snap = detectSnap(worldPos)
      const finalPoint = snap.point || worldPos

      if (!isMeasuring.value) {
        // 开始测距
        isMeasuring.value = true
        isMeasurePending.value = false
        measureStart.value = finalPoint
        measureEnd.value = finalPoint
        // 刚开始测距时不能拖动，需要等松开左键后重新按下
        canMeasureDrag.value = false
      } else {
        // 结束测距，保存到列表
        if (measureStart.value) {
          const distance = calculateDistance(measureStart.value, finalPoint)
          measurements.value.push({
            id: generateId(),
            start: { ...measureStart.value },
            end: { ...finalPoint },
            distance
          })
        }
        isMeasuring.value = false
        isMeasurePending.value = false
        measureStart.value = null
        measureEnd.value = null
        scheduleDraw()
      }
    } else if (isMeasuring.value && isMeasurePending.value) {
      // 待确认状态下左键按下：允许拖动
      measureDragStartPos.value = { x: e.clientX, y: e.clientY }
      isMeasureDragging.value = false
      canMeasureDrag.value = true
      lastMousePos.value = { x: e.clientX, y: e.clientY }
    } else if (isMeasuring.value && !isMeasurePending.value) {
      // 测距中（非待确认状态）：记录按下位置，用于区分单击和拖动
      measureDragStartPos.value = { x: e.clientX, y: e.clientY }
      isMeasureDragging.value = false
      canMeasureDrag.value = true
      lastMousePos.value = { x: e.clientX, y: e.clientY }
    } else {
      // 普通左键：拖动画布
      isDragging.value = true
      lastMousePos.value = { x: e.clientX, y: e.clientY }
    }
  } else if (e.button === 2) {
    // 右键：单击取消测距，拖动移动画布
    e.preventDefault()

    // 记录右键按下的位置
    lastMousePos.value = { x: e.clientX, y: e.clientY }
    isRightDragging.value = false
  }
}

// 处理鼠标释放
const handleMouseUp = (e: MouseEvent) => {
  isDragging.value = false

  // 处理左键释放
  if (e.button === 0) {
    // 测距中左键释放
    if (isMeasuring.value) {
      // 重置测距拖动状态，但不落下终点
      // 终点只能通过 Ctrl+左键 或 双击左键 落下
      isMeasureDragging.value = false
    }
  }

  // 处理右键释放
  if (e.button === 2) {
    if (!isRightDragging.value) {
      // 右键单击：取消测距（包括待确认状态）
      if (isMeasuring.value) {
        isMeasuring.value = false
        isMeasurePending.value = false
        measureStart.value = null
        measureEnd.value = null
        scheduleDraw()
      }
    }
    isRightDragging.value = false
  }
}

// 处理键盘释放 - 松开Ctrl时进入待确认状态
const handleKeyUp = (e: KeyboardEvent) => {
  if (e.key === 'Control' && isMeasuring.value && !isMeasurePending.value) {
    // 松开Ctrl，进入待确认状态，等待左键落下终点
    isMeasurePending.value = true
    scheduleDraw()
  }
}

// 添加图形
const addGeometry = (partialGeometry: Omit<Geometry, 'id' | 'name' | 'color'>, isRealtime: boolean = false) => {
  errorMsg.value = ''

  // 如果是实时输入，先移除之前通过实时输入添加的图形
  if (isRealtime) {
    const existingIndex = geometries.value.findIndex(g => g.name === '实时预览')
    if (existingIndex > -1) {
      geometries.value.splice(existingIndex, 1)
    }
  }

  const newGeometry: Geometry = {
    ...partialGeometry,
    id: generateId(),
    name: isRealtime ? '实时预览' : `多边形 ${geometries.value.length + 1}`,
    color: isRealtime ? '#00ff88' : getNextColor()
  } as Geometry

  geometries.value.push(newGeometry)
  if (!isRealtime) {
    selectedId.value = newGeometry.id
  }
  scheduleDraw()
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
    scheduleDraw()
  }
}

// 切换可见性
const toggleVisibility = (geometry: Geometry) => {
  geometry.visible = !geometry.visible
  scheduleDraw()
}

// 选择图形
const selectGeometry = (id: string) => {
  selectedId.value = id
  scheduleDraw()
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
  scheduleDraw()
}

// 清空所有
const clearAll = () => {
  if (confirm('确定要清空所有图形吗？')) {
    geometries.value = []
    selectedId.value = null
    hoveredId.value = null
    hoveredVertex.value = null
    scheduleDraw()
  }
}

// 打印图形信息到控制台
const printGeometries = () => {
  console.log('%c=== 图形列表信息 ===', 'color: #00f5ff; font-size: 16px; font-weight: bold;')
  console.log(`总计: ${geometries.value.length} 个图形`)
  console.log('')
  
  // 输出对象数组
  const geometryObjects = geometries.value.map((geometry, index) => {
    const obj: any = {
      index: index + 1,
      id: geometry.id,
      name: geometry.name,
      type: geometry.type,
      color: geometry.color,
      visible: geometry.visible
    }
    
    if (geometry.type === 'polygon') {
      const polygon = geometry as Polygon
      obj.pointCount = polygon.points.length
      obj.points = polygon.points.map((p, i) => ({
        index: i + 1,
        x: p.x,
        y: p.y
      }))
    }
    
    return obj
  })
  
  // 使用 console.table 输出表格
  console.table(geometryObjects)
  
  // 详细输出每个图形对象
  console.log('%c详细对象数据:', 'color: #ff6b6b; font-size: 12px;')
  geometryObjects.forEach((obj, i) => {
    console.log(`%c[${i + 1}] ${obj.name}:`, 'color: #00f5ff; font-weight: bold;', obj)
  })
  
  console.log('%c=== 视图状态 ===', 'color: #00f5ff; font-size: 14px; font-weight: bold;')
  console.log('缩放比例:', (viewState.value.scale * 100).toFixed(0) + '%')
  console.log('偏移 X:', viewState.value.offsetX.toFixed(2))
  console.log('偏移 Y:', viewState.value.offsetY.toFixed(2))
  console.log('')
  console.log('%c数据已导出，可复制使用', 'color: #00ff88; font-size: 12px;')
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
  scheduleDraw()
}

// 滚轮缩放
const handleWheel = (e: WheelEvent) => {
  e.preventDefault()

  const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1
  const newScale = viewState.value.scale * scaleFactor

  if (newScale < 0.1 || newScale > 10) return

  viewState.value.scale = newScale
  scheduleDraw()
}

// 禁用右键默认菜单
const handleContextMenu = (e: MouseEvent) => {
  e.preventDefault()
}

onMounted(() => {
  resizeCanvas()
  window.addEventListener('resize', resizeCanvas)

  const canvas = canvasRef.value
  if (canvas) {
    canvas.addEventListener('wheel', handleWheel, { passive: false })
    canvas.addEventListener('mousemove', handleMouseMove)
    canvas.addEventListener('mousedown', handleMouseDown)
    canvas.addEventListener('contextmenu', handleContextMenu)
    window.addEventListener('mouseup', handleMouseUp)
    window.addEventListener('keyup', handleKeyUp)
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', resizeCanvas)
  window.removeEventListener('mouseup', handleMouseUp)
  window.removeEventListener('keyup', handleKeyUp)
  const canvas = canvasRef.value
  if (canvas) {
    canvas.removeEventListener('contextmenu', handleContextMenu)
  }
  if (animationFrameId.value) {
    cancelAnimationFrame(animationFrameId.value)
  }
})
</script>

<template>
  <div class="container">
    <!-- 可拖拽输入面板 -->
    <DraggablePanel
      v-model:position="inputPanelPos"
      title="Polygon Studio"
      :collapsed="isInputCollapsed"
      @update:collapsed="isInputCollapsed = $event"
      class="input-panel"
    >
      <template #default>
        <RealtimeInput
          @add="addGeometry"
          @generate-random="generateRandomTestPolygon"
          @print-geometries="printGeometries"
          :geometries-count="geometries.length"
        />
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
      :class="{ dragging: isDragging, 'measurement-hover': hoveredMeasurementId }"
    />

    <!-- 右上角信息面板 -->
    <div class="info-panel">
      <!-- 缩放比例 -->
      <div class="info-item">
        <span class="info-label">缩放</span>
        <span class="info-value zoom">{{ (viewState.scale * 100).toFixed(0) }}%</span>
      </div>
      
      <!-- 鼠标位置 -->
      <div class="info-item">
        <span class="info-label">鼠标</span>
        <span class="info-value">X: {{ mouseWorldPos.x.toFixed(1) }}</span>
        <span class="info-value">Y: {{ mouseWorldPos.y.toFixed(1) }}</span>
      </div>
      
      <!-- 测距信息 -->
      <div v-if="isMeasuring && measureStart && measureEnd" class="info-item measure-info">
        <span class="info-label">测距中</span>
        <span class="info-value measure">
          距离: {{ calculateDistance(measureStart, measureEnd).toFixed(2) }}
        </span>
        <span class="info-value">X: {{ (measureEnd.x - measureStart.x).toFixed(2) }}</span>
        <span class="info-value">Y: {{ (measureEnd.y - measureStart.y).toFixed(2) }}</span>
      </div>
      
      <!-- 最后经过的顶点 -->
      <div v-if="lastHoveredVertex" class="info-item vertex-info">
        <span class="info-label">
          顶点 {{ lastHoveredVertex.vertexIndex + 1 }}
          <span v-if="hoveredVertex && hoveredVertex.geometryId === lastHoveredVertex.geometryId && hoveredVertex.vertexIndex === lastHoveredVertex.vertexIndex" class="active-indicator">●</span>
        </span>
        <span class="info-value highlight">X: {{ lastHoveredVertex.point.x.toFixed(2) }}</span>
        <span class="info-value highlight">Y: {{ lastHoveredVertex.point.y.toFixed(2) }}</span>
      </div>

      <!-- 测距线数量 -->
      <div v-if="measurements.length > 0" class="info-item">
        <span class="info-label">测距线</span>
        <span class="info-value">{{ measurements.length }} 条</span>
        <span v-if="selectedMeasurementId" class="info-value selected">已选中</span>
        <span v-else-if="hoveredMeasurementId" class="info-value hover">悬浮中</span>
      </div>
    </div>

    <!-- 操作提示 -->
    <div class="floating-hint">
      <div class="hint-content">
        <span class="key">滚轮</span>
        <span>缩放</span>
        <span class="divider">|</span>
        <span class="key">左键拖拽</span>
        <span>移动画布</span>
        <span class="divider">|</span>
        <span class="key">Ctrl+左键</span>
        <span>测距</span>
        <span class="divider">|</span>
        <span class="key">右键拖拽</span>
        <span>移动画布</span>
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

.input-panel,
.list-panel {
  width: 340px;
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
  background: rgba(255, 107, 107, 0.1);
  border: 1px solid rgba(255, 107, 107, 0.3);
  border-radius: 10px;
  font-size: 13px;
  font-weight: 500;
  color: #ff6b6b;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-test:hover {
  background: rgba(255, 107, 107, 0.2);
  border-color: rgba(255, 107, 107, 0.5);
  box-shadow: 0 0 20px rgba(255, 107, 107, 0.3);
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

.dark-canvas.measurement-hover {
  cursor: pointer;
}

/* 右上角信息面板 */
.info-panel {
  position: absolute;
  top: 24px;
  right: 24px;
  z-index: 50;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px 14px;
  background: rgba(20, 20, 30, 0.9);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(0, 245, 255, 0.3);
  border-radius: 8px;
  box-shadow: 0 0 20px rgba(0, 245, 255, 0.1);
  min-width: 120px;
}

.info-item.vertex-info {
  border-color: rgba(255, 255, 0, 0.5);
  box-shadow: 0 0 30px rgba(255, 255, 0, 0.3);
}

.info-item.measure-info {
  border-color: rgba(0, 245, 255, 0.5);
  box-shadow: 0 0 30px rgba(0, 245, 255, 0.3);
}

.info-value.measure {
  color: #00f5ff;
  font-size: 16px;
  font-weight: 700;
  text-shadow: 0 0 10px rgba(0, 245, 255, 0.5);
}

.info-value.selected {
  color: #ff6b6b;
  font-size: 11px;
}

.info-value.hover {
  color: #ffff00;
  font-size: 11px;
}

.info-label {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.info-value {
  font-size: 13px;
  font-weight: 600;
  color: #00f5ff;
  font-family: 'JetBrains Mono', monospace;
}

.info-value.zoom {
  font-size: 16px;
  color: #ff6b6b;
}

.info-value.highlight {
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
