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
  const centerX = canvasWidth / 2
  const centerY = canvasHeight / 2
  
  return {
    x: centerX + (point.x * viewState.scale) + viewState.offsetX,
    y: centerY + (point.y * viewState.scale) + viewState.offsetY
  }
}

// 屏幕坐标转世界坐标
export const screenToWorld = (
  screenX: number,
  screenY: number,
  viewState: ViewState,
  canvasWidth: number,
  canvasHeight: number
): Point => {
  const centerX = canvasWidth / 2
  const centerY = canvasHeight / 2
  
  return {
    x: (screenX - centerX - viewState.offsetX) / viewState.scale,
    y: (screenY - centerY - viewState.offsetY) / viewState.scale
  }
}

// 绘制网格
export const drawGrid = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  viewState: ViewState
): void => {
  const gridSize = 50
  const screenGridSize = gridSize * viewState.scale
  
  const centerX = width / 2 + viewState.offsetX
  const centerY = height / 2 + viewState.offsetY
  
  const startX = centerX % screenGridSize
  const startY = centerY % screenGridSize
  
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
  
  ctx.fillStyle = 'rgba(0, 245, 255, 0.03)'
  const dotSpacing = screenGridSize / 5
  for (let x = startX; x <= width; x += dotSpacing) {
    for (let y = startY; y <= height; y += dotSpacing) {
      ctx.fillRect(x - 1, y - 1, 2, 2)
    }
  }
  
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
  
  ctx.beginPath()
  ctx.arc(originX, originY, 4, 0, Math.PI * 2)
  ctx.fillStyle = '#00f5ff'
  ctx.fill()
}

// 检查点是否在多边形内（射线法）
export const isPointInPolygon = (point: Point, polygon: Point[]): boolean => {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y
    const xj = polygon[j].x, yj = polygon[j].y
    
    const intersect = ((yi > point.y) !== (yj > point.y)) &&
      (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)
    if (intersect) inside = !inside
  }
  return inside
}

// 计算点到点的距离
export const distance = (p1: Point, p2: Point): number => {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2))
}

// 绘制多边形 - 支持多种状态
export const drawPolygon = (
  ctx: CanvasRenderingContext2D,
  polygon: Polygon,
  viewState: ViewState,
  canvasWidth: number,
  canvasHeight: number,
  isHovered: boolean,
  isSelected: boolean,
  activeHoveredVertex: { geometryId: string; vertexIndex: number; point: Point } | null = null
): { screenPoints: Point[] } => {
  const points = polygon.points
  if (points.length < 3) return { screenPoints: [] }
  
  // 检查当前多边形是否有悬停的顶点
  const hasHoveredVertex = activeHoveredVertex?.geometryId === polygon.id
  const hoveredVertexIndex = hasHoveredVertex ? activeHoveredVertex?.vertexIndex : null
  
  // 转换所有点到屏幕坐标
  const screenPoints = points.map(p => worldToScreen(p, viewState, canvasWidth, canvasHeight))
  
  // 绘制路径
  ctx.beginPath()
  screenPoints.forEach((p, i) => {
    if (i === 0) {
      ctx.moveTo(p.x, p.y)
    } else {
      ctx.lineTo(p.x, p.y)
    }
  })
  ctx.closePath()
  
  // 根据状态绘制
  if (isHovered || isSelected) {
    // 悬停或选中时：填充 + 发光
    const glowIntensity = isSelected ? 30 : 20
    ctx.shadowColor = polygon.color
    ctx.shadowBlur = glowIntensity
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 0
    
    // 均匀填充
    ctx.fillStyle = hexToRgba(polygon.color, 0.25)
    ctx.fill()
    
    ctx.shadowBlur = 0
    
    // 边框加粗
    ctx.strokeStyle = polygon.color
    ctx.lineWidth = isSelected ? 3 : 2.5
    ctx.stroke()
  } else {
    // 默认状态：仅轮廓
    ctx.strokeStyle = polygon.color
    ctx.lineWidth = 1.5
    ctx.stroke()
  }
  
  // 绘制顶点和序号（仅在悬停或选中时）
  if (isHovered || isSelected) {
    screenPoints.forEach((p, i) => {
      const isThisVertexHovered = hoveredVertexIndex === i
      
      if (isThisVertexHovered) {
        // 悬停的顶点：特殊高亮效果
        // 外发光圈
        ctx.shadowColor = '#ffff00'
        ctx.shadowBlur = 20
        ctx.beginPath()
        ctx.arc(p.x, p.y, 10, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(255, 255, 0, 0.3)'
        ctx.fill()
        ctx.shadowBlur = 0
        
        // 内圈 - 黄色
        ctx.beginPath()
        ctx.arc(p.x, p.y, 7, 0, Math.PI * 2)
        ctx.fillStyle = '#ffff00'
        ctx.fill()
        
        // 中心白点
        ctx.beginPath()
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2)
        ctx.fillStyle = '#ffffff'
        ctx.fill()
        
        // 外边框
        ctx.beginPath()
        ctx.arc(p.x, p.y, 7, 0, Math.PI * 2)
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 2
        ctx.stroke()
      } else {
        // 普通顶点
        ctx.shadowColor = polygon.color
        ctx.shadowBlur = 10
        
        ctx.beginPath()
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2)
        ctx.fillStyle = '#ffffff'
        ctx.fill()
        
        ctx.shadowBlur = 0
        
        ctx.beginPath()
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2)
        ctx.strokeStyle = polygon.color
        ctx.lineWidth = 2
        ctx.stroke()
      }
      
      // 绘制序号
      ctx.fillStyle = isThisVertexHovered ? '#ffff00' : '#ffffff'
      ctx.font = isThisVertexHovered ? 'bold 12px Inter, sans-serif' : 'bold 10px Inter, sans-serif'
      ctx.shadowColor = 'rgba(0,0,0,0.8)'
      ctx.shadowBlur = 3
      ctx.fillText(`${i + 1}`, p.x + 10, p.y - 10)
      ctx.shadowBlur = 0
    })
  }
  
  return { screenPoints }
}

// 检测鼠标位置对应的多边形和顶点
export const detectHover = (
  mouseX: number,
  mouseY: number,
  geometries: Geometry[],
  viewState: ViewState,
  canvasWidth: number,
  canvasHeight: number
): { 
  hoveredGeometryId: string | null
  hoveredVertex: { geometryId: string; vertexIndex: number; point: Point } | null
} => {
  let hoveredGeometryId: string | null = null
  let hoveredVertex: { geometryId: string; vertexIndex: number; point: Point } | null = null
  let minVertexDistance = Infinity
  
  // 转换为世界坐标
  const worldMouse = screenToWorld(mouseX, mouseY, viewState, canvasWidth, canvasHeight)
  
  // 倒序遍历，优先检测上层图形
  for (let i = geometries.length - 1; i >= 0; i--) {
    const geometry = geometries[i]
    if (!geometry.visible) continue
    
    if (geometry.type === GeometryType.POLYGON) {
      const polygon = geometry as Polygon
      
      // 检测顶点悬停
      polygon.points.forEach((p, idx) => {
        const screenP = worldToScreen(p, viewState, canvasWidth, canvasHeight)
        const dist = Math.sqrt(
          Math.pow(screenP.x - mouseX, 2) + Math.pow(screenP.y - mouseY, 2)
        )
        
        // 顶点检测阈值：15像素
        if (dist < 15 && dist < minVertexDistance) {
          minVertexDistance = dist
          hoveredVertex = {
            geometryId: geometry.id,
            vertexIndex: idx,
            point: p
          }
        }
      })
      
      // 检测多边形内部悬停（如果还没有检测到顶点）
      if (!hoveredVertex && isPointInPolygon(worldMouse, polygon.points)) {
        hoveredGeometryId = geometry.id
        // 继续遍历，但记录这个悬停，可能被上层的多边形覆盖
      }
    }
  }
  
  // 如果检测到了顶点，对应的图形也算悬停
  if (hoveredVertex && !hoveredGeometryId) {
    hoveredGeometryId = hoveredVertex.geometryId
  }
  
  return { hoveredGeometryId, hoveredVertex }
}

// 绘制线段
export const drawLine = (
  ctx: CanvasRenderingContext2D,
  line: Line,
  viewState: ViewState,
  canvasWidth: number,
  canvasHeight: number,
  isHovered: boolean,
  isSelected: boolean
): void => {
  const start = worldToScreen(line.start, viewState, canvasWidth, canvasHeight)
  const end = worldToScreen(line.end, viewState, canvasWidth, canvasHeight)
  
  ctx.shadowColor = line.color
  ctx.shadowBlur = (isHovered || isSelected) ? 15 : 0
  
  ctx.beginPath()
  ctx.moveTo(start.x, start.y)
  ctx.lineTo(end.x, end.y)
  ctx.strokeStyle = line.color
  ctx.lineWidth = (isHovered || isSelected) ? 3 : 1.5
  ctx.stroke()
  
  ctx.shadowBlur = 0
  
  if (isHovered || isSelected) {
    [start, end].forEach((p, i) => {
      ctx.beginPath()
      ctx.arc(p.x, p.y, 5, 0, Math.PI * 2)
      ctx.fillStyle = '#ffffff'
      ctx.fill()
      ctx.strokeStyle = line.color
      ctx.lineWidth = 2
      ctx.stroke()
    })
  }
}

// 绘制圆形
export const drawCircle = (
  ctx: CanvasRenderingContext2D,
  circle: Circle,
  viewState: ViewState,
  canvasWidth: number,
  canvasHeight: number,
  isHovered: boolean,
  isSelected: boolean
): void => {
  const center = worldToScreen(circle.center, viewState, canvasWidth, canvasHeight)
  const radius = circle.radius * viewState.scale
  
  ctx.shadowColor = circle.color
  ctx.shadowBlur = (isHovered || isSelected) ? 20 : 0
  
  ctx.beginPath()
  ctx.arc(center.x, center.y, radius, 0, Math.PI * 2)
  
  if (isHovered || isSelected) {
    ctx.fillStyle = hexToRgba(circle.color, 0.25)
    ctx.fill()
  }
  
  ctx.strokeStyle = circle.color
  ctx.lineWidth = (isHovered || isSelected) ? 3 : 1.5
  ctx.stroke()
  
  ctx.shadowBlur = 0
  
  if (isHovered || isSelected) {
    ctx.beginPath()
    ctx.arc(center.x, center.y, 5, 0, Math.PI * 2)
    ctx.fillStyle = '#ffffff'
    ctx.fill()
    ctx.strokeStyle = circle.color
    ctx.lineWidth = 2
    ctx.stroke()
  }
}

// 绘制矩形
export const drawRectangle = (
  ctx: CanvasRenderingContext2D,
  rect: Rectangle,
  viewState: ViewState,
  canvasWidth: number,
  canvasHeight: number,
  isHovered: boolean,
  isSelected: boolean
): void => {
  const topLeft = worldToScreen({ x: rect.x, y: rect.y }, viewState, canvasWidth, canvasHeight)
  const width = rect.width * viewState.scale
  const height = rect.height * viewState.scale
  
  ctx.shadowColor = rect.color
  ctx.shadowBlur = (isHovered || isSelected) ? 20 : 0
  
  if (isHovered || isSelected) {
    ctx.fillStyle = hexToRgba(rect.color, 0.25)
    ctx.fillRect(topLeft.x, topLeft.y, width, height)
  }
  
  ctx.strokeStyle = rect.color
  ctx.lineWidth = (isHovered || isSelected) ? 3 : 1.5
  ctx.strokeRect(topLeft.x, topLeft.y, width, height)
  
  ctx.shadowBlur = 0
  
  if (isHovered || isSelected) {
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
}

// 主绘制函数
export const drawGeometry = (
  ctx: CanvasRenderingContext2D,
  geometry: Geometry,
  viewState: ViewState,
  canvasWidth: number,
  canvasHeight: number,
  isHovered: boolean,
  isSelected: boolean,
  activeHoveredVertex: { geometryId: string; vertexIndex: number; point: Point } | null = null
): { screenPoints?: Point[] } => {
  switch (geometry.type) {
    case GeometryType.POLYGON:
      return drawPolygon(ctx, geometry as Polygon, viewState, canvasWidth, canvasHeight, isHovered, isSelected, activeHoveredVertex)
    case GeometryType.LINE:
      drawLine(ctx, geometry as Line, viewState, canvasWidth, canvasHeight, isHovered, isSelected)
      return {}
    case GeometryType.CIRCLE:
      drawCircle(ctx, geometry as Circle, viewState, canvasWidth, canvasHeight, isHovered, isSelected)
      return {}
    case GeometryType.RECTANGLE:
      drawRectangle(ctx, geometry as Rectangle, viewState, canvasWidth, canvasHeight, isHovered, isSelected)
      return {}
    default:
      return {}
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
