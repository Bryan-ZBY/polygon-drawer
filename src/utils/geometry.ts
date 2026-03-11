import type { Point } from '@/types'

/**
 * 计算点到线段的距离和最近点
 */
export const pointToSegmentDistance = (
  point: Point,
  a: Point,
  b: Point
): { distance: number; closestPoint: Point } => {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const lenSq = dx * dx + dy * dy

  if (lenSq === 0) {
    const dist = Math.sqrt(Math.pow(point.x - a.x, 2) + Math.pow(point.y - a.y, 2))
    return { distance: dist, closestPoint: { ...a } }
  }

  let t = ((point.x - a.x) * dx + (point.y - a.y) * dy) / lenSq
  t = Math.max(0, Math.min(1, t))

  const closestPoint = {
    x: a.x + t * dx,
    y: a.y + t * dy
  }

  const distance = Math.sqrt(
    Math.pow(point.x - closestPoint.x, 2) +
    Math.pow(point.y - closestPoint.y, 2)
  )

  return { distance, closestPoint }
}

/**
 * 射线法判断点是否在多边形内
 */
export const isPointInPolygon = (point: Point, polygon: Point[]): boolean => {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y
    const xj = polygon[j].x, yj = polygon[j].y

    if (((yi > point.y) !== (yj > point.y)) &&
      (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
      inside = !inside
    }
  }
  return inside
}

/**
 * 计算点到直线的垂足
 */
export const getPerpendicularFoot = (point: Point, a: Point, b: Point): Point => {
  const dx = b.x - a.x
  const dy = b.y - a.y

  if (dx === 0 && dy === 0) {
    return { ...a }
  }

  const t = ((point.x - a.x) * dx + (point.y - a.y) * dy) / (dx * dx + dy * dy)

  return {
    x: a.x + t * dx,
    y: a.y + t * dy
  }
}

/**
 * 计算两点之间的距离
 */
export const calculateDistance = (a: Point, b: Point): number => {
  return Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2))
}

/**
 * 计算多边形的边界框
 */
export const calculateBoundingBox = (points: Point[]): { minX: number; maxX: number; minY: number; maxY: number } => {
  if (points.length === 0) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0 }
  }

  let minX = points[0].x
  let maxX = points[0].x
  let minY = points[0].y
  let maxY = points[0].y

  for (const point of points) {
    minX = Math.min(minX, point.x)
    maxX = Math.max(maxX, point.x)
    minY = Math.min(minY, point.y)
    maxY = Math.max(maxY, point.y)
  }

  return { minX, maxX, minY, maxY }
}

/**
 * 计算多边形的中心点
 */
export const calculatePolygonCenter = (points: Point[]): Point => {
  const bbox = calculateBoundingBox(points)
  return {
    x: (bbox.minX + bbox.maxX) / 2,
    y: (bbox.minY + bbox.maxY) / 2
  }
}

/**
 * 检查两条线段是否相交
 */
export const doSegmentsIntersect = (
  a1: Point, a2: Point,
  b1: Point, b2: Point
): boolean => {
  const d1 = direction(b1, b2, a1)
  const d2 = direction(b1, b2, a2)
  const d3 = direction(a1, a2, b1)
  const d4 = direction(a1, a2, b2)

  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
    ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
    return true
  }

  if (d1 === 0 && onSegment(b1, b2, a1)) return true
  if (d2 === 0 && onSegment(b1, b2, a2)) return true
  if (d3 === 0 && onSegment(a1, a2, b1)) return true
  if (d4 === 0 && onSegment(a1, a2, b2)) return true

  return false
}

/**
 * 计算方向（用于线段相交检测）
 */
const direction = (a: Point, b: Point, c: Point): number => {
  return (c.x - a.x) * (b.y - a.y) - (b.x - a.x) * (c.y - a.y)
}

/**
 * 检查点是否在线段上
 */
const onSegment = (a: Point, b: Point, c: Point): boolean => {
  return Math.min(a.x, b.x) <= c.x && c.x <= Math.max(a.x, b.x) &&
    Math.min(a.y, b.y) <= c.y && c.y <= Math.max(a.y, b.y)
}

/**
 * 检查多边形是否自相交
 */
export const isSelfIntersecting = (points: Point[]): boolean => {
  const n = points.length
  for (let i = 0; i < n; i++) {
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue
      if (doSegmentsIntersect(points[i], points[(i + 1) % n], points[j], points[(j + 1) % n])) {
        return true
      }
    }
  }
  return false
}
