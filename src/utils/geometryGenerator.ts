import type { Point, Polygon } from '@/types'
import { GeometryType } from '@/types'

// 生成随机多边形
export const generateRandomPolygon = (
  minPoints: number = 3,
  maxPoints: number = 8,
  minCoord: number = -500,
  maxCoord: number = 500
): Omit<Polygon, 'id' | 'name' | 'color'> => {
  const numPoints = Math.floor(Math.random() * (maxPoints - minPoints + 1)) + minPoints
  const points: Point[] = []
  
  // 生成中心点 - 缩小范围确保在视野内
  const centerX = (Math.random() - 0.5) * 600
  const centerY = (Math.random() - 0.5) * 400
  
  // 生成半径范围
  const minRadius = 30
  const maxRadius = 100
  
  // 按角度均匀分布点，添加一些随机性
  for (let i = 0; i < numPoints; i++) {
    const angle = (i / numPoints) * Math.PI * 2 + (Math.random() - 0.5) * 0.5
    const radius = minRadius + Math.random() * (maxRadius - minRadius)
    
    points.push({
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius
    })
  }
  
  return {
    type: GeometryType.POLYGON,
    points,
    visible: true
  }
}

// 计算边界框
const getBounds = (points: Point[]) => {
  let minX = Infinity, maxX = -Infinity
  let minY = Infinity, maxY = -Infinity
  points.forEach(p => {
    minX = Math.min(minX, p.x)
    maxX = Math.max(maxX, p.x)
    minY = Math.min(minY, p.y)
    maxY = Math.max(maxY, p.y)
  })
  return { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY }
}

// 检查两个多边形是否相交（使用边界框快速检测）
export const checkBoundingBoxOverlap = (
  points1: Point[],
  points2: Point[],
  padding: number = 30
): boolean => {
  const b1 = getBounds(points1)
  const b2 = getBounds(points2)
  
  // 添加padding确保多边形之间有一定间距
  return !(
    b1.maxX + padding < b2.minX ||
    b2.maxX + padding < b1.minX ||
    b1.maxY + padding < b2.minY ||
    b2.maxY + padding < b1.minY
  )
}

// 生成不与现有图形相交的随机多边形
export const generateNonOverlappingPolygon = (
  existingPolygons: Polygon[],
  maxAttempts: number = 50
): Omit<Polygon, 'id' | 'name' | 'color'> => {
  // 如果没有现有多边形，直接生成一个
  if (existingPolygons.length === 0) {
    return generateRandomPolygon()
  }
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const newPolygon = generateRandomPolygon()
    
    // 检查是否与现有图形相交
    let hasOverlap = false
    for (const existing of existingPolygons) {
      if (checkBoundingBoxOverlap(newPolygon.points, existing.points)) {
        hasOverlap = true
        break
      }
    }
    
    if (!hasOverlap) {
      return newPolygon
    }
  }
  
  // 如果多次尝试都失败，生成一个距离较远的图形
  // 找到一个空位 - 使用网格布局思路
  const spacing = 300
  const gridSize = Math.ceil(Math.sqrt(existingPolygons.length + 1))
  const offsetX = ((existingPolygons.length % gridSize) - gridSize / 2) * spacing
  const offsetY = (Math.floor(existingPolygons.length / gridSize) - gridSize / 2) * spacing
  
  const farPolygon = generateRandomPolygon()
  farPolygon.points = farPolygon.points.map(p => ({
    x: p.x + offsetX,
    y: p.y + offsetY
  }))
  
  return farPolygon
}

// 生成正多边形
export const generateRegularPolygon = (
  sides: number,
  radius: number,
  centerX: number = 0,
  centerY: number = 0,
  rotation: number = 0
): Omit<Polygon, 'id' | 'name' | 'color'> => {
  const points: Point[] = []
  
  for (let i = 0; i < sides; i++) {
    const angle = (i / sides) * Math.PI * 2 + rotation
    points.push({
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius
    })
  }
  
  return {
    type: GeometryType.POLYGON,
    points,
    visible: true
  }
}

// 生成星形多边形
export const generateStarPolygon = (
  points: number,
  outerRadius: number,
  innerRadius: number,
  centerX: number = 0,
  centerY: number = 0
): Omit<Polygon, 'id' | 'name' | 'color'> => {
  const polygonPoints: Point[] = []
  const totalPoints = points * 2
  
  for (let i = 0; i < totalPoints; i++) {
    const angle = (i / totalPoints) * Math.PI * 2 - Math.PI / 2
    const radius = i % 2 === 0 ? outerRadius : innerRadius
    polygonPoints.push({
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius
    })
  }
  
  return {
    type: GeometryType.POLYGON,
    points: polygonPoints,
    visible: true
  }
}
