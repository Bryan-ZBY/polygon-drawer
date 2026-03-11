<script setup lang="ts">
import { ref, watch } from 'vue'
import type { Geometry, Polygon, ParseResult } from '@/types'
import { GeometryType } from '@/types'
import { parse3DPoints, is3DFormat } from '@/utils/geometry3d'

interface Props {
  geometriesCount: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  add: [geometry: Omit<Geometry, 'id' | 'name' | 'color'>, isRealtime: boolean]
  generateRandom: []
  printGeometries: []
}>()

const inputText = ref('')
const localError = ref('')
const isValid = ref(false)
const is3DMode = ref(false)

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
    
    // 检查是否是边数据格式（包含 P1, P2 属性）
    if (data[0] && data[0].P1 && data[0].P2) {
      return parseEdgesFormat(data)
    }
    
    const points = data.filter(p => 
      typeof p.x === 'number' && typeof p.y === 'number'
    )
    
    if (points.length !== data.length) {
      return { success: false, error: '所有点必须包含 x 和 y 数字属性' }
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

// 解析边数据格式
const parseEdgesFormat = (edges: any[]): ParseResult<Polygon> => {
  try {
    const points: { x: number; y: number }[] = []
    
    // 构建点集，假设边是连续的
    for (let i = 0; i < edges.length; i++) {
      const edge = edges[i]
      
      // 验证边数据格式
      if (!edge.P1 || !edge.P2) {
        return { success: false, error: '边数据必须包含 P1 和 P2' }
      }
      
      if (typeof edge.P1.X !== 'number' || typeof edge.P1.Y !== 'number' ||
          typeof edge.P2.X !== 'number' || typeof edge.P2.Y !== 'number') {
        return { success: false, error: '边的坐标必须是数字' }
      }
      
      // 添加起点（第一条边）或检查连续性
      if (i === 0) {
        points.push({ x: edge.P1.X, y: edge.P1.Y })
      }
      
      // 添加终点
      points.push({ x: edge.P2.X, y: edge.P2.Y })
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

// 监听输入变化，实时绘制
watch(inputText, () => {
  localError.value = ''
  
  // 检查是否是三维点格式
  if (is3DFormat(inputText.value)) {
    is3DMode.value = true
    const result3D = parse3DPoints(inputText.value)
    
    if (result3D.success && result3D.points2D) {
      isValid.value = true
      // 将二维点转换为多边形，每次都创建新图形
      const polygon: Omit<Polygon, 'id' | 'name' | 'color'> = {
        type: GeometryType.POLYGON,
        points: result3D.points2D,
        visible: true
      }
      emit('add', polygon, false)
      // 输入合法并成功绘制后，清空输入框
      inputText.value = ''
      is3DMode.value = false
    } else {
      isValid.value = false
      if (inputText.value.trim()) {
        localError.value = result3D.error || ''
      }
    }
  } else {
    is3DMode.value = false
    const result = parsePolygon(inputText.value)

    if (result.success && result.data) {
      isValid.value = true
      // 每次都创建新图形，isRealtime 设为 false
      emit('add', result.data, false)
      // 输入合法并成功绘制后，清空输入框
      inputText.value = ''
    } else {
      isValid.value = false
      if (inputText.value.trim()) {
        localError.value = result.error || ''
      }
    }
  }
})
</script>

<template>
  <div class="realtime-input">
    <div class="input-row">
      <input
        v-model="inputText"
        placeholder='粘贴点集或边数据...'
        class="glass-input"
        :class="{ valid: isValid, invalid: localError, 'mode-3d': is3DMode }"
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
  padding: 6px 10px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 12px;
  color: #00f5ff;
  transition: all 0.2s ease;
}

.glass-input::placeholder {
  color: rgba(255, 255, 255, 0.3);
}

.glass-input:focus {
  outline: none;
  border-color: rgba(0, 245, 255, 0.4);
  background: rgba(0, 0, 0, 0.4);
}

.glass-input.valid {
  border-color: rgba(0, 255, 136, 0.4);
}

.glass-input.invalid {
  border-color: rgba(255, 107, 107, 0.4);
}

.glass-input.mode-3d {
  border-color: rgba(255, 0, 255, 0.4);
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
