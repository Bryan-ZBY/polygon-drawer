import type { 
  Point, 
  Polygon, 
  Line, 
  Circle, 
  Rectangle, 
  Geometry, 
  ViewState,
  BoundingBox 
} from '@/types'
import { GeometryType } from '@/types'

// 颜色转换
export const hexToRgba = (hex: string, alpha: number): string => {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

// 计算边界框
export const calculateBoundingBox = (points: Point[]): BoundingBox => {
  let minX = Infinity, maxX = -Infinity
  let minY = Infinity, maxY = -Infinity
  
  points.forEach(p => {
    minX = Math.min(minX, p.x)
    maxX = Math.max(maxX, p.x)
    minY = Math.min(minY, p.y)
    maxY = Math.max(maxY, p.y)
  })
  
  return {
    minX, maxX, minY, maxY,
    width: maxX - minX,
    height: maxY - minY
  }
}

// 统一的坐标变换 - 将世界坐标转换为屏幕坐标
export const worldToScreen = (
  point: Point,
  viewState: ViewState,
  canvasWidth: number,
  canvasHeight: number
): { x: number; y: number } => {
  // 以画布中心为原点进行变换
  const centerX = canvasWidth / 2
  const centerY = canvasHeight / 2
  
  return {
    x: centerX + (point.x * viewState.scale) + viewState.offsetX,
    y: centerY + (point.y * viewState.scale) + viewState.offsetY
  }
}

// 绘制网格 - 固定在世界坐标系中
export const drawGrid = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  viewState: ViewState
): void => {
  const gridSize = 50 // 世界坐标系中的网格大小
  const screenGridSize = gridSize * viewState.scale
  
  // 计算网格起点（考虑偏移）
  const centerX = width / 2 + viewState.offsetX
  const centerY = height / 2 + viewState.offsetY
  
  const startX = centerX % screenGridSize
  const startY = centerY % screenGridSize
  
  // 主网格线 - 青色微光
  ctx.strokeStyle = 'rgba(0, 245, 255, 0.08)'
  ctx.lineWidth = 1
  
  for (let x = startX; x <= width; x += screenGridSize) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)
    ctx.stroke()
  }
  
  for (let y = startY; y <= height; y += screenGridSize) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
    ctx.stroke()
  }
  
  // 次网格点
  ctx.fillStyle = 'rgba(0, 245, 255, 0.03)'
  const dotSpacing = screenGridSize / 5
  for (let x = startX; x <= width; x += dotSpacing) {
    for (let y = startY; y <= height; y += dotSpacing) {
      ctx.fillRect(x - 1, y - 1, 2, 2)
    }
  }
  
  // 中心十字线（世界坐标原点）
  const originX = width / 2 + viewState.offsetX
  const originY = height / 2 + viewState.offsetY
  
  ctx.strokeStyle = 'rgba(0, 245, 255, 0.3)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(originX, 0)
  ctx.lineTo(originX, height)
  ctx.moveTo(0, originY)
  ctx.lineTo(width, originY)
  ctx.stroke()
  
  // 绘制原点
  ctx.beginPath()
  ctx.arc(originX, originY, 4, 0, Math.PI * 2)
  ctx.fillStyle = '#00f5ff'
  ctx.fill()
}

// 绘制多边形
export const drawPolygon = (
  ctx: CanvasRenderingContext2D,
  polygon: Polygon,
  viewState: ViewState,
  canvasWidth: number,
  canvasHeight: number,
  isSelected: boolean
): void => {
  const points = polygon.points
  if (points.length < 3) return
  
  // 计算多边形的中心点（用于渐变）
  const bbox = calculateBoundingBox(points)
  const centerPoint = {
    x: bbox.minX + bbox.width / 2,
    y: bbox.minY + bbox.height / 2
  }
  const screenCenter = worldToScreen(centerPoint, viewState, canvasWidth, canvasHeight)
  
  // 发光效果
  const glowIntensity = isSelected ? 30 : 20
  ctx.shadowColor = polygon.color
  ctx.shadowBlur = glowIntensity
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = 0
  
  // 绘制路径
  ctx.beginPath()
  points.forEach((p, i) => {
    const screenPos = worldToScreen(p, viewState, canvasWidth, canvasHeight)
    if (i === 0) {
      ctx.moveTo(screenPos.x, screenPos.y)
    } else {
      ctx.lineTo(screenPos.x, screenPos.y)
    }
  })
  ctx.closePath()
  
  // 渐变填充 - 基于屏幕坐标
  const maxRadius = Math.max(bbox.width, bbox.height) * viewState.scale / 2
  const gradient = ctx.createRadialGradient(
    screenCenter.x, screenCenter.y, 0,
    screenCenter.x, screenCenter.y, maxRadius
  )
  gradient.addColorStop(0, hexToRgba(polygon.color, 0.4))
  gradient.addColorStop(1, hexToRgba(polygon.color, 0.1))
  ctx.fillStyle = gradient
  ctx.fill()
  
  // 边框
  ctx.strokeStyle = polygon.color
  ctx.lineWidth = isSelected ? 3 : 2
  ctx.stroke()
  
  // 重置阴影
  ctx.shadowBlur = 0
  
  // 绘制顶点
  points.forEach((p, i) => {
    const screenPos = worldToScreen(p, viewState, canvasWidth, canvasHeight)
    
    // 顶点发光
    ctx.shadowColor = polygon.color
    ctx.shadowBlur = 15
    
    ctx.beginPath()
    ctx.arc(screenPos.x, screenPos.y, 6, 0, Math.PI * 2)
    ctx.fillStyle = '#ffffff'
    ctx.fill()
    
    ctx.shadowBlur = 0
    
    // 顶点外圈
    ctx.beginPath()
    ctx.arc(screenPos.x, screenPos.y, 6, 0, Math.PI * 2)
    ctx.strokeStyle = polygon.color
    ctx.lineWidth = 2
    ctx.stroke()
    
    // 绘制序号
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 11px Inter, sans-serif'
    ctx.shadowColor = 'rgba(0,0,0,0.8)'
    ctx.shadowBlur = 4
    ctx.fillText(`${i + 1}`, screenPos.x + 10, screenPos.y - 10)
    ctx.shadowBlur = 0
  })
}

// 绘制线段
export const drawLine = (
  ctx: CanvasRenderingContext2D,
  line: Line,
  viewState: ViewState,
  canvasWidth: number,
  canvasHeight: number,
  isSelected: boolean
): void => {
  const start = worldToScreen(line.start, viewState, canvasWidth, canvasHeight)
  const end = worldToScreen(line.end, viewState, canvasWidth, canvasHeight)
  
  // 发光效果
  ctx.shadowColor = line.color
  ctx.shadowBlur = isSelected ? 20 : 15
  
  ctx.beginPath()
  ctx.moveTo(start.x, start.y)
  ctx.lineTo(end.x, end.y)
  ctx.strokeStyle = line.color
  ctx.lineWidth = isSelected ? 4 : 3
  ctx.stroke()
  
  ctx.shadowBlur = 0
  
  // 绘制端点
  [start, end].forEach((p, i) => {
    ctx.shadowColor = line.color
    ctx.shadowBlur = 10
    
    ctx.beginPath()
    ctx.arc(p.x, p.y, 5, 0, Math.PI * 2)
    ctx.fillStyle = '#ffffff'
    ctx.fill()
    
    ctx.shadowBlur = 0
    
    ctx.beginPath()
    ctx.arc(p.x, p.y, 5, 0, Math.PI * 2)
    ctx.strokeStyle = line.color
    ctx.lineWidth = 2
    ctx.stroke()
    
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 11px Inter, sans-serif'
    ctx.shadowColor = 'rgba(0,0,0,0.8)'
    ctx.shadowBlur = 4
    ctx.fillText(i === 0 ? 'S' : 'E', p.x + 8, p.y - 8)
    ctx.shadowBlur = 0
  })
}

// 绘制圆形
export const drawCircle = (
  ctx: CanvasRenderingContext2D,
  circle: Circle,
  viewState: ViewState,
  canvasWidth: number,
  canvasHeight: number,
  isSelected: boolean
): void => {
  const center = worldToScreen(circle.center, viewState, canvasWidth, canvasHeight)
  const radius = circle.radius * viewState.scale
  
  ctx.shadowColor = circle.color
  ctx.shadowBlur = isSelected ? 25 : 20
  
  ctx.beginPath()
  ctx.arc(center.x, center.y, radius, 0, Math.PI * 2)
  
  const gradient = ctx.createRadialGradient(center.x, center.y, 0, center.x, center.y, radius)
  gradient.addColorStop(0, hexToRgba(circle.color, 0.4))
  gradient.addColorStop(1, hexToRgba(circle.color, 0.1))
  ctx.fillStyle = gradient
  ctx.fill()
  
  ctx.strokeStyle = circle.color
  ctx.lineWidth = isSelected ? 3 : 2
  ctx.stroke()
  
  ctx.shadowBlur = 0
  
  // 中心点
  ctx.beginPath()
  ctx.arc(center.x, center.y, 5, 0, Math.PI * 2)
  ctx.fillStyle = '#ffffff'
  ctx.fill()
  ctx.strokeStyle = circle.color
  ctx.lineWidth = 2
  ctx.stroke()
}

// 绘制矩形
export const drawRectangle = (
  ctx: CanvasRenderingContext2D,
  rect: Rectangle,
  viewState: ViewState,
  canvasWidth: number,
  canvasHeight: number,
  isSelected: boolean
): void => {
  const topLeft = worldToScreen({ x: rect.x, y: rect.y }, viewState, canvasWidth, canvasHeight)
  const width = rect.width * viewState.scale
  const height = rect.height * viewState.scale
  
  ctx.shadowColor = rect.color
  ctx.shadowBlur = isSelected ? 25 : 20
  
  const gradient = ctx.createLinearGradient(topLeft.x, topLeft.y, topLeft.x + width, topLeft.y + height)
  gradient.addColorStop(0, hexToRgba(rect.color, 0.4))
  gradient.addColorStop(1, hexToRgba(rect.color, 0.1))
  ctx.fillStyle = gradient
  ctx.fillRect(topLeft.x, topLeft.y, width, height)
  
  ctx.strokeStyle = rect.color
  ctx.lineWidth = isSelected ? 3 : 2
  ctx.strokeRect(topLeft.x, topLeft.y, width, height)
  
  ctx.shadowBlur = 0
  
  // 四个角点
  const corners = [
    topLeft,
    { x: topLeft.x + width, y: topLeft.y },
    { x: topLeft.x + width, y: topLeft.y + height },
    { x: topLeft.x, y: topLeft.y + height }
  ]
  
  corners.forEach(p => {
    ctx.beginPath()
    ctx.arc(p.x, p.y, 5, 0, Math.PI * 2)
    ctx.fillStyle = '#ffffff'
    ctx.fill()
    ctx.strokeStyle = rect.color
    ctx.lineWidth = 2
    ctx.stroke()
  })
}

// 主绘制函数
export const drawGeometry = (
  ctx: CanvasRenderingContext2D,
  geometry: Geometry,
  viewState: ViewState,
  canvasWidth: number,
  canvasHeight: number,
  isSelected: boolean
): void => {
  switch (geometry.type) {
    case GeometryType.POLYGON:
      drawPolygon(ctx, geometry as Polygon, viewState, canvasWidth, canvasHeight, isSelected)
      break
    case GeometryType.LINE:
      drawLine(ctx, geometry as Line, viewState, canvasWidth, canvasHeight, isSelected)
      break
    case GeometryType.CIRCLE:
      drawCircle(ctx, geometry as Circle, viewState, canvasWidth, canvasHeight, isSelected)
      break
    case GeometryType.RECTANGLE:
      drawRectangle(ctx, geometry as Rectangle, viewState, canvasWidth, canvasHeight, isSelected)
      break
  }
}

// 清空画布
export const clearCanvas = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void => {
  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, width, height)
}
