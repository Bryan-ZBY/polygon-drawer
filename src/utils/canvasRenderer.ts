import type { 
  Point, 
  Polygon, 
  PolygonGroup,
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

// 统一的坐标变换 - 将世界坐标转换为屏幕坐标（Y轴向上为正）
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
    y: centerY - (point.y * viewState.scale) + viewState.offsetY  // Y轴取反，向上为正
  }
}

// 屏幕坐标转世界坐标（Y轴向上为正）
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
    y: -(screenY - centerY - viewState.offsetY) / viewState.scale  // Y轴取反，向上为正
  }
}

// 绘制网格 - 简化版本，减少绘制调用
export const drawGrid = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  viewState: ViewState,
  options: { showGrid?: boolean; gridColor?: string } = {}
): void => {
  const { showGrid = true, gridColor = 'rgba(0, 245, 255, 0.06)' } = options
  
  if (!showGrid) {
    // 只绘制坐标轴
    const originX = width / 2 + viewState.offsetX
    const originY = height / 2 + viewState.offsetY
    
    ctx.strokeStyle = 'rgba(0, 245, 255, 0.2)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(originX, 0)
    ctx.lineTo(originX, height)
    ctx.moveTo(0, originY)
    ctx.lineTo(width, originY)
    ctx.stroke()
    return
  }
  
  const gridSize = 50
  const screenGridSize = gridSize * viewState.scale
  
  const centerX = width / 2 + viewState.offsetX
  const centerY = height / 2 + viewState.offsetY
  
  const startX = centerX % screenGridSize
  const startY = centerY % screenGridSize
  
  // 批量绘制竖线
  ctx.strokeStyle = gridColor
  ctx.lineWidth = 1
  ctx.beginPath()
  for (let x = startX; x <= width; x += screenGridSize) {
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)
  }
  ctx.stroke()
  
  // 批量绘制横线
  ctx.beginPath()
  for (let y = startY; y <= height; y += screenGridSize) {
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
  }
  ctx.stroke()
  
  // 简化原点标记
  const originX = width / 2 + viewState.offsetX
  const originY = height / 2 + viewState.offsetY
  
  ctx.strokeStyle = 'rgba(0, 245, 255, 0.2)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(originX, 0)
  ctx.lineTo(originX, height)
  ctx.moveTo(0, originY)
  ctx.lineTo(width, originY)
  ctx.stroke()
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

// 计算多边形面积（使用鞋带公式）
export const calculatePolygonArea = (points: Point[]): number => {
  if (points.length < 3) return 0
  let area = 0
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length
    area += points[i].x * points[j].y
    area -= points[j].x * points[i].y
  }
  return Math.abs(area) / 2
}

// 计算多边形周长
export const calculatePolygonPerimeter = (points: Point[]): number => {
  if (points.length < 2) return 0
  let perimeter = 0
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length
    perimeter += distance(points[i], points[j])
  }
  return perimeter
}

// 检查边界框是否在视口内
const isBoundingBoxInViewport = (
  bbox: BoundingBox,
  viewState: ViewState,
  canvasWidth: number,
  canvasHeight: number
): boolean => {
  // 将边界框转换为屏幕坐标
  const screenMin = worldToScreen(
    { x: bbox.minX, y: bbox.maxY },
    viewState,
    canvasWidth,
    canvasHeight
  )
  const screenMax = worldToScreen(
    { x: bbox.maxX, y: bbox.minY },
    viewState,
    canvasWidth,
    canvasHeight
  )
  
  // 检查是否与视口相交
  return !(
    screenMax.x < 0 ||
    screenMin.x > canvasWidth ||
    screenMax.y < 0 ||
    screenMin.y > canvasHeight
  )
}

// 绘制多边形 - 性能优化版本，支持视口裁剪
export const drawPolygon = (
  ctx: CanvasRenderingContext2D,
  polygon: Polygon,
  viewState: ViewState,
  canvasWidth: number,
  canvasHeight: number,
  isHovered: boolean,
  isSelected: boolean,
  activeHoveredVertex: { geometryId: string; vertexIndex: number; point: Point } | null = null,
  enableCulling: boolean = true
): { screenPoints: Point[] } => {
  const points = polygon.points
  if (points.length < 3) return { screenPoints: [] }
  
  // 视口裁剪
  if (enableCulling) {
    const bbox = calculateBoundingBox(polygon.points)
    if (!isBoundingBoxInViewport(bbox, viewState, canvasWidth, canvasHeight)) {
      return { screenPoints: [] } // 多边形在视口外，跳过绘制
    }
  }
  
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
  
  // 根据状态绘制 - 简化效果以提升性能
  if (isHovered || isSelected) {
    // 填充 - 不使用阴影
    ctx.fillStyle = hexToRgba(polygon.color, 0.2)
    ctx.fill()
    
    // 边框
    ctx.strokeStyle = polygon.color
    ctx.lineWidth = isSelected ? 2.5 : 2
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
        // 悬停的顶点：简化高亮效果
        ctx.beginPath()
        ctx.arc(p.x, p.y, 8, 0, Math.PI * 2)
        ctx.fillStyle = '#ffff00'
        ctx.fill()
        
        ctx.beginPath()
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2)
        ctx.fillStyle = '#ffffff'
        ctx.fill()
      } else {
        // 普通顶点 - 简化效果
        ctx.beginPath()
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2)
        ctx.fillStyle = '#ffffff'
        ctx.fill()
        
        ctx.strokeStyle = polygon.color
        ctx.lineWidth = 1.5
        ctx.stroke()
      }
      
      // 绘制序号 - 简化效果
      ctx.fillStyle = isThisVertexHovered ? '#ffff00' : '#ffffff'
      ctx.font = isThisVertexHovered ? 'bold 11px sans-serif' : '10px sans-serif'
      ctx.fillText(`${i + 1}`, p.x + 8, p.y - 8)
    })
  }
  
  return { screenPoints }
}

// 检测鼠标位置对应的多边形和顶点 - 优化版本
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

      // 检测顶点悬停 - 使用平方距离避免开方运算
      polygon.points.forEach((p, idx) => {
        const screenP = worldToScreen(p, viewState, canvasWidth, canvasHeight)
        const distSq = Math.pow(screenP.x - mouseX, 2) + Math.pow(screenP.y - mouseY, 2)

        // 顶点检测阈值：15像素（平方为225）
        if (distSq < 225 && distSq < minVertexDistance) {
          minVertexDistance = distSq
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
      }
    } else if (geometry.type === 'group') {
      // 检测多边形组内的多边形
      const group = geometry as PolygonGroup
      // 倒序遍历组内的多边形
      for (let k = group.polygons.length - 1; k >= 0; k--) {
        const polygon = group.polygons[k]
        if (!polygon.visible) continue

        // 检测顶点悬停
        polygon.points.forEach((p, idx) => {
          const screenP = worldToScreen(p, viewState, canvasWidth, canvasHeight)
          const distSq = Math.pow(screenP.x - mouseX, 2) + Math.pow(screenP.y - mouseY, 2)

          if (distSq < 225 && distSq < minVertexDistance) {
            minVertexDistance = distSq
            hoveredVertex = {
              geometryId: polygon.id,
              vertexIndex: idx,
              point: p
            }
          }
        })

        // 检测多边形内部悬停
        if (!hoveredVertex && isPointInPolygon(worldMouse, polygon.points)) {
          hoveredGeometryId = polygon.id
        }
      }
    }
  }

  // 如果检测到了顶点，对应的图形也算悬停
  if (hoveredVertex && !hoveredGeometryId) {
    hoveredGeometryId = hoveredVertex.geometryId
  }

  return { hoveredGeometryId, hoveredVertex }
}

// 绘制线段 - 简化版本
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
  
  ctx.beginPath()
  ctx.moveTo(start.x, start.y)
  ctx.lineTo(end.x, end.y)
  ctx.strokeStyle = line.color
  ctx.lineWidth = (isHovered || isSelected) ? 2.5 : 1.5
  ctx.stroke()
  
  if (isHovered || isSelected) {
    [start, end].forEach(p => {
      ctx.beginPath()
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2)
      ctx.fillStyle = '#ffffff'
      ctx.fill()
      ctx.strokeStyle = line.color
      ctx.lineWidth = 1.5
      ctx.stroke()
    })
  }
}

// 绘制圆形 - 简化版本
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
  
  ctx.beginPath()
  ctx.arc(center.x, center.y, radius, 0, Math.PI * 2)
  
  if (isHovered || isSelected) {
    ctx.fillStyle = hexToRgba(circle.color, 0.2)
    ctx.fill()
  }
  
  ctx.strokeStyle = circle.color
  ctx.lineWidth = (isHovered || isSelected) ? 2.5 : 1.5
  ctx.stroke()
  
  if (isHovered || isSelected) {
    ctx.beginPath()
    ctx.arc(center.x, center.y, 4, 0, Math.PI * 2)
    ctx.fillStyle = '#ffffff'
    ctx.fill()
    ctx.strokeStyle = circle.color
    ctx.lineWidth = 1.5
    ctx.stroke()
  }
}

// 绘制矩形 - 简化版本
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
  
  if (isHovered || isSelected) {
    ctx.fillStyle = hexToRgba(rect.color, 0.2)
    ctx.fillRect(topLeft.x, topLeft.y, width, height)
  }
  
  ctx.strokeStyle = rect.color
  ctx.lineWidth = (isHovered || isSelected) ? 2.5 : 1.5
  ctx.strokeRect(topLeft.x, topLeft.y, width, height)
  
  if (isHovered || isSelected) {
    const corners = [
      topLeft,
      { x: topLeft.x + width, y: topLeft.y },
      { x: topLeft.x + width, y: topLeft.y + height },
      { x: topLeft.x, y: topLeft.y + height }
    ]
    
    corners.forEach(p => {
      ctx.beginPath()
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2)
      ctx.fillStyle = '#ffffff'
      ctx.fill()
      ctx.strokeStyle = rect.color
      ctx.lineWidth = 1.5
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
