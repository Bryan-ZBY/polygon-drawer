<script setup lang="ts">
import { ref, watch } from 'vue'
import type { Geometry, Polygon, ParseResult } from '@/types'
import { GeometryType } from '@/types'

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

// 监听输入变化，实时绘制
watch(inputText, () => {
  localError.value = ''
  const result = parsePolygon(inputText.value)

  if (result.success && result.data) {
    isValid.value = true
    // 实时添加到画布，标记为实时预览
    emit('add', result.data, true)
    // 输入合法并成功绘制后，清空输入框
    inputText.value = ''
  } else {
    isValid.value = false
    if (inputText.value.trim()) {
      localError.value = result.error || ''
    }
  }
})
</script>

<template>
  <div class="realtime-input">
    <label class="input-label">
      <span class="label-icon">📐</span>
      输入点集 (JSON)
      <span v-if="isValid" class="valid-badge">✓</span>
    </label>
    <textarea
      v-model="inputText"
      placeholder='[{"x": 100, "y": 100}, {"x": 200, "y": 100}, {"x": 150, "y": 200}]'
      rows="6"
      class="glass-input"
      :class="{ valid: isValid, invalid: localError }"
    ></textarea>
    <p v-if="localError" class="error-msg">
      <span class="error-icon">⚠</span>
      {{ localError }}
    </p>
    
    <!-- 操作按钮行 -->
    <div class="action-row">
      <button class="btn-test" @click="emit('generateRandom')" title="生成随机测试多边形">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
          <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
        </svg>
        测试
      </button>
      
      <button class="btn-print" @click="emit('printGeometries')" title="打印图形信息到控制台">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 6 2 18 2 18 9"></polyline>
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
          <rect x="6" y="14" width="12" height="8"></rect>
        </svg>
        打印
      </button>
    </div>
  </div>
</template>

<style scoped>
.realtime-input {
  width: 100%;
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

.valid-badge {
  margin-left: auto;
  padding: 2px 8px;
  background: rgba(0, 255, 136, 0.2);
  border: 1px solid rgba(0, 255, 136, 0.5);
  border-radius: 12px;
  font-size: 11px;
  color: #00ff88;
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

.glass-input.valid {
  border-color: rgba(0, 255, 136, 0.5);
  box-shadow: 0 0 0 3px rgba(0, 255, 136, 0.1);
}

.glass-input.invalid {
  border-color: rgba(255, 107, 107, 0.5);
  box-shadow: 0 0 0 3px rgba(255, 107, 107, 0.1);
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

.action-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.btn-test {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 16px;
  background: rgba(255, 0, 255, 0.1);
  border: 1px solid rgba(255, 0, 255, 0.3);
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  color: #ff00ff;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-test:hover {
  background: rgba(255, 0, 255, 0.2);
  border-color: rgba(255, 0, 255, 0.5);
  box-shadow: 0 0 20px rgba(255, 0, 255, 0.3);
}

.btn-print {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 16px;
  background: rgba(0, 245, 255, 0.1);
  border: 1px solid rgba(0, 245, 255, 0.3);
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  color: #00f5ff;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-print:hover {
  background: rgba(0, 245, 255, 0.2);
  border-color: rgba(0, 245, 255, 0.5);
  box-shadow: 0 0 20px rgba(0, 245, 255, 0.3);
}
</style>
