import { ref, computed } from 'vue'
import type { Point, Geometry, Polygon, PolygonGroup } from '@/types'
import { GeometryType } from '@/types'

export interface SnapResult {
  point: Point
  type: 'vertex' | 'edge' | 'axis' | 'edge-axis' | 'measure-perp' | 'perpendicular-hint' | 'grid' | 'none'
  measurementId?: string
  isPerpendicular?: boolean
  perpendicularTo?: 'measurement' | 'polygon'
}

export function useSnap() {
  // 吸附状态
  const snappedPoint = ref<Point | null>(null)
  const snapType = ref<SnapResult['type']>('none')
  const snappedMeasurementId = ref<string | null>(null)
  const isPerpendicularSnap = ref(false)
  const perpendicularTarget = ref<'measurement' | 'polygon' | null>(null)
  
  // 吸附配置
  const SNAP_THRESHOLD = 15 // 顶点吸附阈值（像素）
  const EDGE_SNAP_THRESHOLD = 10 // 边吸附阈值（像素）
  const GRID_SIZE = 50 // 网格大小
  
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
  
  // 计算点到直线的垂足
  const getPerpendicularFoot = (p: Point, a: Point, b: Point): Point => {
    const dx = b.x - a.x
    const dy = b.y - a.y
    
    if (dx === 0 && dy === 0) return a
    
    const t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)
    
    return {
      x: a.x + t * dx,
      y: a.y + t * dy
    }
  }
  
  // 网格吸附
  const snapToGrid = (worldPos: Point, enableGridSnap: boolean): { point: Point; snapped: boolean } => {
    if (!enableGridSnap) return { point: worldPos, snapped: false }
    
    const snapX = Math.round(worldPos.x / GRID_SIZE) * GRID_SIZE
    const snapY = Math.round(worldPos.y / GRID_SIZE) * GRID_SIZE
    
    const dist = Math.sqrt(Math.pow(snapX - worldPos.x, 2) + Math.pow(snapY - worldPos.y, 2))
    
    if (dist < 10) {
      return { point: { x: snapX, y: snapY }, snapped: true }
    }
    
    return { point: worldPos, snapped: false }
  }
  
  // 检测吸附
  const detectSnap = (
    worldPos: Point,
    geometries: Geometry[],
    measurements: Array<{ id: string; start: Point; end: Point }>,
    options: {
      isMeasuring?: boolean
      measureStart?: Point | null
      scale?: number
      enableGridSnap?: boolean
    } = {}
  ): SnapResult => {
    const { isMeasuring = false, measureStart = null, scale = 1, enableGridSnap = false } = options
    
    let minDist = Infinity
    let snapPoint = worldPos
    let snapTypeResult: SnapResult['type'] = 'none'
    let snapMeasurementId: string | undefined = undefined
    let isPerpendicular = false
    let perpendicularTo: 'measurement' | 'polygon' | undefined = undefined
    
    // 检测顶点吸附
    for (const geometry of geometries) {
      if (!geometry.visible) continue
      
      const polygons: Polygon[] = []
      if (geometry.type === 'group') {
        polygons.push(...(geometry as PolygonGroup).polygons.filter(p => p.visible))
      } else if (geometry.type === GeometryType.POLYGON) {
        polygons.push(geometry as Polygon)
      }
      
      for (const polygon of polygons) {
        for (const point of polygon.points) {
          const dist = Math.sqrt(
            Math.pow(point.x - worldPos.x, 2) +
            Math.pow(point.y - worldPos.y, 2)
          )
          const screenDist = dist * scale
          
          if (screenDist < SNAP_THRESHOLD && screenDist < minDist) {
            minDist = screenDist
            snapPoint = point
            snapTypeResult = 'vertex'
          }
        }
      }
    }
    
    // 检测边吸附
    let edgeSnapPoint: Point | null = null
    let edgeMinDist = Infinity
    
    if (snapTypeResult === 'none') {
      for (const geometry of geometries) {
        if (!geometry.visible) continue
        
        const polygons: Polygon[] = []
        if (geometry.type === 'group') {
          polygons.push(...(geometry as PolygonGroup).polygons.filter(p => p.visible))
        } else if (geometry.type === GeometryType.POLYGON) {
          polygons.push(geometry as Polygon)
        }
        
        for (const polygon of polygons) {
          const points = polygon.points
          for (let i = 0; i < points.length; i++) {
            const a = points[i]
            const b = points[(i + 1) % points.length]
            if (!a || !b) continue
            const { distance, closestPoint } = pointToSegmentDistance(worldPos, a, b)
            const screenDist = distance * scale
            
            if (screenDist < EDGE_SNAP_THRESHOLD && screenDist < edgeMinDist) {
              edgeMinDist = screenDist
              edgeSnapPoint = closestPoint
            }
          }
        }
      }
      
      if (edgeSnapPoint) {
        snapPoint = edgeSnapPoint
        snapTypeResult = 'edge'
        minDist = edgeMinDist
      }
    }
    
    // 测距时的垂直吸附
    if (isMeasuring && measureStart) {
      const PERP_SNAP_DISTANCE = 15 / scale
      
      // 检测与已有测距线的垂直关系
      for (const measurement of measurements) {
        const foot = getPerpendicularFoot(measureStart, measurement.start, measurement.end)
        const { distance: distFromSegment } = pointToSegmentDistance(foot, measurement.start, measurement.end)
        
        if (distFromSegment < 0.001) {
          const distToFoot = Math.sqrt(
            Math.pow(foot.x - worldPos.x, 2) +
            Math.pow(foot.y - worldPos.y, 2)
          )
          
          if (distToFoot < PERP_SNAP_DISTANCE && distToFoot * scale < minDist) {
            snapPoint = foot
            snapTypeResult = 'perpendicular-hint'
            isPerpendicular = true
            perpendicularTo = 'measurement'
            snapMeasurementId = measurement.id
            minDist = distToFoot * scale
          }
        }
      }
      
      // 检测与多边形边的垂直关系
      if (snapTypeResult !== 'perpendicular-hint') {
        for (const geometry of geometries) {
          if (!geometry.visible) continue
          
          const polygons: Polygon[] = []
          if (geometry.type === 'group') {
            polygons.push(...(geometry as PolygonGroup).polygons.filter(p => p.visible))
          } else if (geometry.type === GeometryType.POLYGON) {
            polygons.push(geometry as Polygon)
          }
          
          for (const polygon of polygons) {
            const points = polygon.points
            for (let i = 0; i < points.length; i++) {
              const a = points[i]
              const b = points[(i + 1) % points.length]
              if (!a || !b) continue
              const foot = getPerpendicularFoot(measureStart, a, b)
              const { distance: distFromSegment } = pointToSegmentDistance(foot, a, b)
              
              if (distFromSegment < 0.001) {
                const distToFoot = Math.sqrt(
                  Math.pow(foot.x - worldPos.x, 2) +
                  Math.pow(foot.y - worldPos.y, 2)
                )
                
                if (distToFoot < PERP_SNAP_DISTANCE && distToFoot * scale < minDist) {
                  snapPoint = foot
                  snapTypeResult = 'perpendicular-hint'
                  isPerpendicular = true
                  perpendicularTo = 'polygon'
                  minDist = distToFoot * scale
                }
              }
            }
          }
        }
      }
      
      // 轴吸附
      if (snapTypeResult !== 'perpendicular-hint') {
        const AXIS_SNAP_THRESHOLD = 10 / scale
        
        const yDist = Math.abs(worldPos.y - measureStart.y)
        if (yDist < AXIS_SNAP_THRESHOLD) {
          const axisSnapPoint = { x: worldPos.x, y: measureStart.y }
          const yScreenDist = yDist * scale
          
          if (snapTypeResult === 'edge' && edgeSnapPoint) {
            snapPoint = { x: edgeSnapPoint.x, y: measureStart.y }
            snapTypeResult = 'edge-axis'
          } else if (yScreenDist < minDist) {
            minDist = yScreenDist
            snapPoint = axisSnapPoint
            snapTypeResult = 'axis'
          }
        }
        
        const xDist = Math.abs(worldPos.x - measureStart.x)
        if (xDist < AXIS_SNAP_THRESHOLD) {
          const axisSnapPoint = { x: measureStart.x, y: worldPos.y }
          const xScreenDist = xDist * scale
          
          if (snapTypeResult === 'edge' && edgeSnapPoint) {
            snapPoint = { x: measureStart.x, y: edgeSnapPoint.y }
            snapTypeResult = 'edge-axis'
          } else if (xScreenDist < minDist) {
            minDist = xScreenDist
            snapPoint = axisSnapPoint
            snapTypeResult = 'axis'
          }
        }
      }
    }
    
    // 检测已有测距线段的吸附
    if (snapTypeResult !== 'perpendicular-hint' && snapTypeResult !== 'vertex') {
      const MEASURE_SNAP_THRESHOLD = 10 / scale
      for (const measurement of measurements) {
        const { distance, closestPoint } = pointToSegmentDistance(worldPos, measurement.start, measurement.end)
        const screenDist = distance * scale
        
        if (screenDist < MEASURE_SNAP_THRESHOLD && screenDist < minDist) {
          minDist = screenDist
          snapPoint = closestPoint
          snapTypeResult = 'measure-perp'
          snapMeasurementId = measurement.id
        }
      }
    }
    
    // 网格吸附（优先级最低）
    if (snapTypeResult === 'none' && enableGridSnap) {
      const gridResult = snapToGrid(worldPos, enableGridSnap)
      if (gridResult.snapped) {
        snapPoint = gridResult.point
        snapTypeResult = 'grid'
      }
    }
    
    // 更新状态
    snappedPoint.value = snapTypeResult !== 'none' ? snapPoint : null
    snapType.value = snapTypeResult
    snappedMeasurementId.value = snapMeasurementId || null
    isPerpendicularSnap.value = isPerpendicular
    perpendicularTarget.value = perpendicularTo || null
    
    return {
      point: snapPoint,
      type: snapTypeResult,
      measurementId: snapMeasurementId,
      isPerpendicular,
      perpendicularTo
    }
  }
  
  // 重置吸附状态
  const resetSnap = () => {
    snappedPoint.value = null
    snapType.value = 'none'
    snappedMeasurementId.value = null
    isPerpendicularSnap.value = false
    perpendicularTarget.value = null
  }
  
  return {
    // 状态
    snappedPoint,
    snapType,
    snappedMeasurementId,
    isPerpendicularSnap,
    perpendicularTarget,
    
    // 方法
    detectSnap,
    resetSnap,
    pointToSegmentDistance,
    getPerpendicularFoot
  }
}
