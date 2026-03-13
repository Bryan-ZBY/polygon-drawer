<script setup lang="ts">
import { ref, watch } from 'vue'
import type { Geometry, Polygon, PolygonGroup, ParseResult, PolygonEdge } from '@/types'
import { GeometryType, generateId, getNextColor } from '@/types'
import { parse3DPoints, is3DFormat } from '@/utils/geometry3d'

interface Props {
  geometriesCount: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  add: [geometry: Omit<Geometry, 'id' | 'name' | 'color'>, isRealtime: boolean, originalData?: unknown]
  addGroup: [group: Omit<PolygonGroup, 'id' | 'name' | 'color'>, originalData?: unknown[]]
  addArcPolygon: [edges: PolygonEdge[]]
  addArcPolygonGroup: [polygons: PolygonEdge[][]]
  generateRandom: []
  printGeometries: []
}>()

const inputText = ref('')
const localError = ref('')
const isValid = ref(false)
const is3DMode = ref(false)
const isProcessing = ref(false)
const inputMode = ref<'points' | 'edges'>('points') // 自动识别，保留用于样式

// 常量配置
const MAX_POINTS = 10000 // 最大点数限制
const DEBOUNCE_MS = 300 // 防抖延迟

// 防抖函数
const debounce = <T extends (...args: unknown[]) => void>(fn: T, delay: number) => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  return (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }
}

// 检查数据量是否过大
const checkDataSize = (data: unknown[]): { valid: boolean; error?: string } => {
  let totalPoints = 0
  
  const countPoints = (item: unknown): number => {
    if (Array.isArray(item)) {
      return item.reduce((sum, subItem) => sum + countPoints(subItem), 0)
    }
    return 1
  }
  
  totalPoints = countPoints(data)
  
  if (totalPoints > MAX_POINTS) {
    return { 
      valid: false, 
      error: `数据量过大（${totalPoints} 个点），最多支持 ${MAX_POINTS} 个点` 
    }
  }
  return { valid: true }
}

// 多边形解析器
const parsePolygon = (input: string): ParseResult<Polygon> => {
  if (!input.trim()) {
    return { success: false, error: '' }
  }
  
  try {
    const data = JSON.parse(input)
    
    if (!Array.isArray(data)) {
      return { success: false, error: '输入必须是数组格式' }
    }
    
    if (data.length === 0) {
      return { success: false, error: '' }
    }
    
    // 检查是否是嵌套的边数据格式（多边形组）
    if (Array.isArray(data[0])) {
      return { success: false, error: 'GROUP_FORMAT' } // 特殊标记，表示是多边形组格式
    }
    
    // 检查是否是边数据格式（包含 P1, P2 属性）
    if (data[0] && data[0].P1 && data[0].P2) {
      return parseEdgesFormat(data)
    }
    
    // 支持大小写属性名 (x/y 或 X/Y)
    const points = data.filter(p => {
      const x = typeof p.X === 'number' ? p.X : p.x
      const y = typeof p.Y === 'number' ? p.Y : p.y
      return typeof x === 'number' && typeof y === 'number'
    }).map(p => ({
      x: typeof p.X === 'number' ? p.X : p.x,
      y: typeof p.Y === 'number' ? p.Y : p.y
    }))
    
    if (points.length !== data.length) {
      return { success: false, error: '所有点必须包含 x/y 或 X/Y 数字属性' }
    }
    
    if (points.length < 3) {
      return { success: false, error: '至少需要3个点才能绘制多边形' }
    }
    
    return { 
      success: true, 
      data: {
        id: '',
        name: '',
        type: GeometryType.POLYGON,
        points,
        visible: true,
        color: ''
      }
    }
  } catch (e) {
    return { success: false, error: 'JSON 格式错误' }
  }
}

// 解析边数据格式为 PolygonEdge[]
const parseEdgesToPolygonEdges = (edges: unknown[]): { success: boolean; edges?: PolygonEdge[]; error?: string } => {
  try {
    const polygonEdges: PolygonEdge[] = []
    
    for (let i = 0; i < edges.length; i++) {
      const edge = edges[i] as any
      
      // 验证边数据格式
      if (!edge.P1 && !edge.p1) {
        return { success: false, error: `第 ${i + 1} 条边必须包含 P1 或 p1` }
      }
      if (!edge.P2 && !edge.p2) {
        return { success: false, error: `第 ${i + 1} 条边必须包含 P2 或 p2` }
      }
      
      const p1 = edge.P1 || edge.p1
      const p2 = edge.P2 || edge.p2
      
      if (typeof p1.X !== 'number' && typeof p1.x !== 'number') {
        return { success: false, error: `第 ${i + 1} 条边的 P1 X 坐标必须是数字` }
      }
      if (typeof p1.Y !== 'number' && typeof p1.y !== 'number') {
        return { success: false, error: `第 ${i + 1} 条边的 P1 Y 坐标必须是数字` }
      }
      if (typeof p2.X !== 'number' && typeof p2.x !== 'number') {
        return { success: false, error: `第 ${i + 1} 条边的 P2 X 坐标必须是数字` }
      }
      if (typeof p2.Y !== 'number' && typeof p2.y !== 'number') {
        return { success: false, error: `第 ${i + 1} 条边的 P2 Y 坐标必须是数字` }
      }
      
      polygonEdges.push({
        p1: { 
          x: typeof p1.X === 'number' ? p1.X : p1.x, 
          y: typeof p1.Y === 'number' ? p1.Y : p1.y 
        },
        p2: { 
          x: typeof p2.X === 'number' ? p2.X : p2.x, 
          y: typeof p2.Y === 'number' ? p2.Y : p2.y 
        },
        id: edge.ID || edge.id || `edge_${i}`,
        archHeight: edge.ArchHeight || edge.archHeight || 0,
        isInnerArc: edge.IsInnerArc !== undefined ? edge.IsInnerArc : (edge.isInnerArc || false)
      })
    }
    
    if (polygonEdges.length < 2) {
      return { success: false, error: '至少需要2条边才能绘制多边形' }
    }
    
    return { success: true, edges: polygonEdges }
  } catch (e) {
    return { success: false, error: '边数据解析错误' }
  }
}

// 解析拱形多边形组（嵌套数组格式）
const parseArcPolygonGroup = (data: unknown[]): { success: boolean; polygons?: PolygonEdge[][]; error?: string } => {
  try {
    const polygons: PolygonEdge[][] = []
    
    for (let i = 0; i < data.length; i++) {
      const polygonData = data[i] as unknown[]
      
      if (!Array.isArray(polygonData)) {
        return { success: false, error: `第 ${i + 1} 个多边形必须是数组格式` }
      }
      
      const result = parseEdgesToPolygonEdges(polygonData)
      if (!result.success || !result.edges) {
        return { success: false, error: `第 ${i + 1} 个多边形解析失败: ${result.error}` }
      }
      
      polygons.push(result.edges)
    }
    
    if (polygons.length === 0) {
      return { success: false, error: '至少需要1个多边形' }
    }
    
    return { success: true, polygons }
  } catch (e) {
    return { success: false, error: '拱形多边形组解析错误' }
  }
}

// 解析边数据格式（旧版，转换为普通多边形点集）
const parseEdgesFormat = (edges: unknown[]): ParseResult<Polygon> => {
  try {
    const points: { x: number; y: number }[] = []
    
    // 构建点集，假设边是连续的
    for (let i = 0; i < edges.length; i++) {
      const edge = edges[i] as any
      
      // 验证边数据格式
      const p1 = edge.P1 || edge.p1
      const p2 = edge.P2 || edge.p2
      
      if (!p1 || !p2) {
        return { success: false, error: '边数据必须包含 P1/P2 或 p1/p2' }
      }
      
      const x1 = typeof p1.X === 'number' ? p1.X : p1.x
      const y1 = typeof p1.Y === 'number' ? p1.Y : p1.y
      const x2 = typeof p2.X === 'number' ? p2.X : p2.x
      const y2 = typeof p2.Y === 'number' ? p2.Y : p2.y
      
      if (typeof x1 !== 'number' || typeof y1 !== 'number' ||
          typeof x2 !== 'number' || typeof y2 !== 'number') {
        return { success: false, error: '边的坐标必须是数字' }
      }
      
      // 添加起点（第一条边）或检查连续性
      if (i === 0) {
        points.push({ x: x1, y: y1 })
      }
      
      // 添加终点
      points.push({ x: x2, y: y2 })
    }
    
    // 检查是否形成闭合多边形
    if (points.length < 3) {
      return { success: false, error: '至少需要3个点才能绘制多边形' }
    }
    
    // 检查首尾是否相连，如果不相连则添加闭合点
    const firstPoint = points[0]
    const lastPoint = points[points.length - 1]
    const isClosed = Math.abs(firstPoint.x - lastPoint.x) < 0.0001 && 
                     Math.abs(firstPoint.y - lastPoint.y) < 0.0001
    
    if (!isClosed) {
      // 如果边数据没有形成闭合，我们仍然使用这些点绘制
      // 但会移除最后一个重复的点
      if (points.length > 1) {
        // 检查是否有重复的点
        const uniquePoints: { x: number; y: number }[] = []
        for (const point of points) {
          const isDuplicate = uniquePoints.some(p => 
            Math.abs(p.x - point.x) < 0.0001 && Math.abs(p.y - point.y) < 0.0001
          )
          if (!isDuplicate) {
            uniquePoints.push(point)
          }
        }
        
        if (uniquePoints.length >= 3) {
          return {
            success: true,
            data: {
              id: '',
              name: '',
              type: GeometryType.POLYGON,
              points: uniquePoints,
              visible: true,
              color: ''
            }
          }
        }
      }
    }
    
    // 移除最后一个点（因为它是重复的起点）
    if (isClosed && points.length > 1) {
      points.pop()
    }
    
    return {
      success: true,
      data: {
        id: '',
        name: '',
        type: GeometryType.POLYGON,
        points,
        visible: true,
        color: ''
      }
    }
  } catch (e) {
    return { success: false, error: '边数据解析错误' }
  }
}

// 将任意深度的数组扁平化为两层（多边形组格式）
const flattenToTwoLevels = (data: unknown[]): unknown[] => {
  const result: any[] = []

  const isPolygonData = (item: any): boolean => {
    // 检查是否是多边形数据（点数组或边数组）
    if (!Array.isArray(item) || item.length === 0) return false
    const first = item[0]
    // 点数组格式：包含 X/Y 或 x/y
    if (typeof first === 'object' && (typeof first.X === 'number' || typeof first.x === 'number')) return true
    // 边数组格式：包含 P1/P2
    if (typeof first === 'object' && (first.P1 || first.P2)) return true
    return false
  }

  const flatten = (arr: any[]) => {
    for (const item of arr) {
      if (Array.isArray(item)) {
        if (isPolygonData(item)) {
          // 这是多边形数据，添加到结果
          result.push(item)
        } else {
          // 继续递归扁平化
          flatten(item)
        }
      }
    }
  }

  flatten(data)
  return result
}

// 解析多边形组格式（支持边数据格式或点数组格式，支持任意深度嵌套）
const parsePolygonGroup = (data: unknown[]): { success: boolean; group?: Omit<PolygonGroup, 'id' | 'name' | 'color'>; error?: string } => {
  try {
    // 首先将任意深度的数组扁平化为两层
    const flattenedData = flattenToTwoLevels(data)

    if (flattenedData.length === 0) {
      return { success: false, error: '未能解析出有效的多边形数据' }
    }

    const polygons: Polygon[] = []

    for (let i = 0; i < flattenedData.length; i++) {
      const polygonData = flattenedData[i]

      if (!Array.isArray(polygonData)) {
        return { success: false, error: `第 ${i + 1} 个多边形数据必须是数组` }
      }

      if (polygonData.length === 0) {
        return { success: false, error: `第 ${i + 1} 个多边形数据不能为空` }
      }

      let polygon: Polygon | null = null

      // 检测数据格式：边数据格式（包含 P1, P2）或点数组格式（包含 X, Y 或 x, y）
      if (polygonData[0] && (polygonData[0].P1 || polygonData[0].P2)) {
        // 边数据格式
        const result = parseEdgesFormat(polygonData)
        if (!result.success || !result.data) {
          return { success: false, error: `第 ${i + 1} 个多边形解析失败: ${result.error}` }
        }
        polygon = result.data
      } else if (polygonData[0] && (typeof polygonData[0].X === 'number' || typeof polygonData[0].x === 'number')) {
        // 点数组格式（支持大写 X, Y 或小写 x, y）
        const points = polygonData.map((p: any) => ({
          x: typeof p.X === 'number' ? p.X : p.x,
          y: typeof p.Y === 'number' ? p.Y : p.y
        })).filter((p: any) => typeof p.x === 'number' && typeof p.y === 'number')

        if (points.length < 3) {
          return { success: false, error: `第 ${i + 1} 个多边形至少需要3个有效点` }
        }

        polygon = {
          id: '',
          name: '',
          type: GeometryType.POLYGON,
          points,
          visible: true,
          color: ''
        }
      } else {
        return { success: false, error: `第 ${i + 1} 个多边形数据格式不正确，需要边数据格式或点数组格式` }
      }

      if (polygon) {
        polygons.push({
          ...polygon,
          id: generateId(),
          name: `多边形 ${i + 1}`,
          color: getNextColor()
        })
      }
    }

    if (polygons.length === 0) {
      return { success: false, error: '至少需要1个多边形' }
    }

    return {
      success: true,
      group: {
        type: 'group',
        polygons,
        visible: true,
        collapsed: false
      }
    }
  } catch (e) {
    return { success: false, error: '多边形组解析错误' }
  }
}

// 处理输入的核心逻辑
const processInput = () => {
  if (isProcessing.value) return
  
  localError.value = ''
  const text = inputText.value.trim()
  
  if (!text) {
    isValid.value = false
    return
  }
  
  isProcessing.value = true
  
  try {
    // 检查是否是三维点格式
    if (is3DFormat(text)) {
      is3DMode.value = true
      const result3D = parse3DPoints(text)
      
      if (result3D.success && result3D.points2D) {
        // 检查数据量
        const sizeCheck = checkDataSize(result3D.points2D as unknown[])
        if (!sizeCheck.valid) {
          localError.value = sizeCheck.error || '数据量过大'
          isValid.value = false
          return
        }
        
        isValid.value = true
        const polygon: Omit<Polygon, 'id' | 'name' | 'color'> = {
          type: GeometryType.POLYGON,
          points: result3D.points2D,
          visible: true
        }
        emit('add', polygon, false)
        inputText.value = ''
        is3DMode.value = false
      } else {
        isValid.value = false
        localError.value = result3D.error || ''
      }
      return
    }
    
    // 检查是否是多边形组格式（嵌套数组）
    try {
      const data = JSON.parse(text)
      
      if (!Array.isArray(data)) {
        localError.value = '输入必须是数组格式'
        isValid.value = false
        return
      }
      
      // 检查数据量
      const sizeCheck = checkDataSize(data)
      if (!sizeCheck.valid) {
        localError.value = sizeCheck.error || '数据量过大'
        isValid.value = false
        return
      }
      
      // 检查是否是嵌套数组（多边形组格式）
      if (data.length > 0 && Array.isArray(data[0])) {
        // 检查是否是拱形多边形组（检查所有多边形的所有边是否有 ArchHeight 或 IsInnerArc 属性）
        const hasArcProperties = data.some((polygon: any) => 
          Array.isArray(polygon) && polygon.some((edge: any) => 
            edge && (
              edge.ArchHeight !== undefined || edge.archHeight !== undefined ||
              edge.IsInnerArc !== undefined || edge.isInnerArc !== undefined
            )
          )
        )
        
        // 检查是否是边数据格式（包含 P1, P2 属性）
        const hasEdgeFormat = data.some((polygon: any) => 
          Array.isArray(polygon) && polygon.length > 0 && polygon[0] && 
          (polygon[0].P1 || polygon[0].p1) && (polygon[0].P2 || polygon[0].p2)
        )
        
        if (hasArcProperties || hasEdgeFormat || inputMode.value === 'edges') {
          // 解析为拱形多边形组
          const result = parseArcPolygonGroup(data)
          if (result.success && result.polygons) {
            isValid.value = true
            is3DMode.value = false
            emit('addArcPolygonGroup', result.polygons)
            inputText.value = ''
          } else {
            isValid.value = false
            localError.value = result.error || '拱形多边形组解析失败'
          }
          return
        }
        
        // 是普通多边形组格式
        const result = parsePolygonGroup(data)
        if (result.success && result.group) {
          isValid.value = true
          is3DMode.value = false
          emit('addGroup', result.group, data)
          inputText.value = ''
        } else {
          isValid.value = false
          localError.value = result.error || ''
        }
        return
      }
      
      // 检查是否是边集模式（包含 ArchHeight 或 IsInnerArc 属性）
      const hasArcProperties = data.length > 0 && data[0] && (
        data[0].ArchHeight !== undefined || data[0].archHeight !== undefined ||
        data[0].IsInnerArc !== undefined || data[0].isInnerArc !== undefined
      )
      
      if (hasArcProperties || inputMode.value === 'edges') {
        // 解析为带拱形的多边形
        const result = parseEdgesToPolygonEdges(data)
        if (result.success && result.edges) {
          isValid.value = true
          is3DMode.value = false
          emit('addArcPolygon', result.edges)
          inputText.value = ''
        } else {
          isValid.value = false
          localError.value = result.error || '边数据解析失败'
        }
        return
      }
      
      // 检查是否是边数据格式（包含 P1, P2 属性但没有拱形属性）
      if (data.length > 0 && data[0] && (data[0].P1 || data[0].p1) && (data[0].P2 || data[0].p2)) {
        // 边数据格式，转换为普通多边形
        is3DMode.value = false
        const result = parseEdgesFormat(data)
        
        if (result.success && result.data) {
          isValid.value = true
          let originalData: unknown = null
          try {
            originalData = JSON.parse(text)
          } catch {
            // 解析失败则不保存原始数据
          }
          emit('add', result.data, false, originalData)
          inputText.value = ''
        } else if (result.error) {
          isValid.value = false
          localError.value = result.error
        }
        return
      }
      
      // 普通多边形格式
      is3DMode.value = false
      const result = parsePolygon(text)
      
      if (result.success && result.data) {
        isValid.value = true
        let originalData: unknown = null
        try {
          originalData = JSON.parse(text)
        } catch {
          // 解析失败则不保存原始数据
        }
        emit('add', result.data, false, originalData)
        inputText.value = ''
      } else if (result.error && result.error !== 'GROUP_FORMAT') {
        isValid.value = false
        localError.value = result.error
      }
    } catch (e) {
      isValid.value = false
      localError.value = 'JSON 格式错误'
    }
  } finally {
    isProcessing.value = false
  }
}

// 使用防抖处理输入
const debouncedProcessInput = debounce(processInput, DEBOUNCE_MS)

// 监听输入变化
watch(inputText, () => {
  debouncedProcessInput()
})
</script>

<template>
  <div class="realtime-input">
    <div class="input-row">
      <input
        v-model="inputText"
        placeholder="📋 粘贴多边形数据 (自动识别点集/边集格式)"
        class="glass-input"
        :class="{ valid: isValid, invalid: localError, 'mode-3d': is3DMode, processing: isProcessing, 'mode-edges': inputMode === 'edges' }"
        :disabled="isProcessing"
      />
      <div class="action-btns">
        <button class="btn-test" @click="emit('generateRandom')" title="生成随机测试多边形">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
            <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
          </svg>
        </button>
        <button class="btn-print" @click="emit('printGeometries')" title="打印图形信息到控制台">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 6 2 18 2 18 9"></polyline>
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
            <rect x="6" y="14" width="12" height="8"></rect>
          </svg>
        </button>
      </div>
    </div>
    <p v-if="localError" class="error-msg">{{ localError }}</p>
  </div>
</template>

<style scoped>
.realtime-input {
  width: 100%;
}

.input-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.glass-input {
  flex: 1;
  padding: 10px 14px;
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(117, 142, 255, 0.5);
  border-radius: 8px;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 13px;
  color: #758eff;
  transition: all 0.3s ease;
  box-shadow: 0 0 15px rgba(117, 142, 255, 0.15), inset 0 0 20px rgba(0, 0, 0, 0.3);
}

.glass-input::placeholder {
  color: rgba(117, 142, 255, 0.5);
}

.glass-input:focus {
  outline: none;
  border-color: rgba(117, 142, 255, 0.9);
  background: rgba(0, 0, 0, 0.6);
  box-shadow: 0 0 25px rgba(117, 142, 255, 0.35), inset 0 0 20px rgba(0, 0, 0, 0.4);
}

.glass-input.valid {
  border-color: rgba(0, 255, 136, 0.6);
  box-shadow: 0 0 20px rgba(0, 255, 136, 0.15);
}

.glass-input.invalid {
  border-color: rgba(255, 107, 107, 0.6);
  box-shadow: 0 0 20px rgba(255, 107, 107, 0.15);
}

.glass-input.mode-3d {
  border-color: rgba(255, 0, 255, 0.6);
  box-shadow: 0 0 20px rgba(255, 0, 255, 0.15);
}

.glass-input.mode-edges {
  border-color: rgba(255, 165, 0, 0.6);
  box-shadow: 0 0 20px rgba(255, 165, 0, 0.15);
}

.glass-input.processing {
  opacity: 0.6;
  cursor: wait;
}

.glass-input:disabled {
  cursor: wait;
}

.error-msg {
  margin: 4px 0 0 0;
  font-size: 10px;
  color: #ff6b6b;
}

.action-btns {
  display: flex;
  align-items: center;
  gap: 4px;
}

.btn-test {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px;
  background: rgba(0, 255, 136, 0.1);
  border: 1px solid rgba(0, 255, 136, 0.2);
  border-radius: 4px;
  color: #00ff88;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-test:hover {
  background: rgba(0, 255, 136, 0.15);
  border-color: rgba(0, 255, 136, 0.4);
}

.btn-print {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px;
  background: rgba(0, 245, 255, 0.1);
  border: 1px solid rgba(0, 245, 255, 0.2);
  border-radius: 4px;
  color: #00f5ff;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-print:hover {
  background: rgba(0, 245, 255, 0.15);
  border-color: rgba(0, 245, 255, 0.4);
}
</style>
