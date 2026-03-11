import type { Point, Polygon } from '@/types'

export interface ValidationResult {
  valid: boolean
  error?: string
  warning?: string
}

// 检查坐标值是否在合理范围内
const COORD_LIMIT = 1e6

export const validateCoordinates = (points: Point[]): ValidationResult => {
  for (const point of points) {
    if (Math.abs(point.x) > COORD_LIMIT || Math.abs(point.y) > COORD_LIMIT) {
      return {
        valid: false,
        error: `坐标值超出范围（±${COORD_LIMIT}），请检查数据`
      }
    }
    
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
      return {
        valid: false,
        error: '坐标值必须是有限数字'
      }
    }
  }
  return { valid: true }
}

// 检查多边形是否自相交
export const checkSelfIntersection = (points: Point[]): ValidationResult => {
  if (points.length < 4) return { valid: true }
  
  const segments: Array<[Point, Point]> = []
  for (let i = 0; i < points.length; i++) {
    const start = points[i]
    const end = points[(i + 1) % points.length]
    segments.push([start, end])
  }
  
  // 检查线段相交（排除相邻线段）
  for (let i = 0; i < segments.length; i++) {
    for (let j = i + 2; j < segments.length; j++) {
      // 跳过首尾相连的线段
      if (i === 0 && j === segments.length - 1) continue
      
      if (segmentsIntersect(segments[i][0], segments[i][1], segments[j][0], segments[j][1])) {
        return {
          valid: true,
          warning: '多边形存在自相交，可能影响面积计算'
        }
      }
    }
  }
  
  return { valid: true }
}

// 检查线段相交
const segmentsIntersect = (a1: Point, a2: Point, b1: Point, b2: Point): boolean => {
  const d1 = direction(b1, b2, a1)
  const d2 = direction(b1, b2, a2)
  const d3 = direction(a1, a2, b1)
  const d4 = direction(a1, a2, b2)
  
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
      ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
    return true
  }
  
  return false
}

// 计算方向
const direction = (a: Point, b: Point, c: Point): number => {
  return (c.x - a.x) * (b.y - a.y) - (b.x - a.x) * (c.y - a.y)
}

// 检查并移除重复点
export const removeDuplicatePoints = (points: Point[]): { points: Point[]; removed: number } => {
  const uniquePoints: Point[] = []
  let removed = 0
  
  for (const point of points) {
    const isDuplicate = uniquePoints.some(p => 
      Math.abs(p.x - point.x) < 0.0001 && Math.abs(p.y - point.y) < 0.0001
    )
    if (!isDuplicate) {
      uniquePoints.push(point)
    } else {
      removed++
    }
  }
  
  return { points: uniquePoints, removed }
}

// 验证多边形
export const validatePolygon = (points: Point[]): ValidationResult => {
  // 检查点数
  if (points.length < 3) {
    return { valid: false, error: '多边形至少需要3个顶点' }
  }
  
  // 检查坐标
  const coordResult = validateCoordinates(points)
  if (!coordResult.valid) return coordResult
  
  // 检查自相交
  const intersectionResult = checkSelfIntersection(points)
  
  return intersectionResult
}

// 验证 JSON 输入
export const validateJSONInput = (input: string): ValidationResult => {
  if (!input.trim()) {
    return { valid: false, error: '输入不能为空' }
  }
  
  try {
    const data = JSON.parse(input)
    
    if (!Array.isArray(data)) {
      return { valid: false, error: '输入必须是数组格式' }
    }
    
    if (data.length === 0) {
      return { valid: false, error: '输入数组不能为空' }
    }
    
    return { valid: true }
  } catch (e) {
    return { valid: false, error: 'JSON 格式错误，请检查语法' }
  }
}
