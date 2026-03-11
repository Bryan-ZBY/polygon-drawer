<script setup lang="ts">
import { ref } from 'vue'
import type { Geometry, Polygon, ParseResult } from '@/types'
import { GeometryType } from '@/types'

interface Props {
  geometriesCount: number
  viewScale: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  add: [geometry: Geometry]
  error: [message: string]
  clear: []
  resetView: []
  clearAll: []
  generateRandom: []
}>()

const inputText = ref('')
const localError = ref('')

// 多边形解析器
const parsePolygon = (input: string): ParseResult<Polygon> => {
  try {
    const data = JSON.parse(input)
    
    if (!Array.isArray(data)) {
      return { success: false, error: '输入必须是数组格式' }
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
    return { success: false, error: 'JSON 格式错误，请检查输入' }
  }
}

// 主解析函数 - 可扩展支持更多格式
const parseInput = (input: string): ParseResult => {
  // 目前只支持多边形，后续可扩展
  return parsePolygon(input)
}

const handleAdd = () => {
  localError.value = ''
  emit('clear')
  
  if (!inputText.value.trim()) {
    localError.value = '请输入点集数据'
    emit('error', localError.value)
    return
  }
  
  const result = parseInput(inputText.value)
  
  if (!result.success || !result.data) {
    localError.value = result.error || '解析失败'
    emit('error', localError.value)
    return
  }
  
  emit('add', result.data)
  inputText.value = ''
}

const handleClear = () => {
  inputText.value = ''
  localError.value = ''
  emit('clear')
}
</script>

<template>
  <div class="glass-panel">
    <div class="panel-header">
      <div class="logo">
        <span class="logo-icon">◈</span>
        <span class="logo-text">Polygon Studio</span>
      </div>
    </div>
    
    <div class="input-section">
      <label class="input-label">
        <span class="label-icon">📐</span>
        输入点集 (JSON)
      </label>
      <textarea
        v-model="inputText"
        placeholder='[{"x": 100, "y": 100}, {"x": 200, "y": 100}, {"x": 150, "y": 200}]'
        rows="6"
        class="glass-input"
      ></textarea>
      <p v-if="localError" class="error-msg">
        <span class="error-icon">⚠</span>
        {{ localError }}
      </p>
      <div class="input-actions">
        <button class="btn-glow btn-primary" @click="handleAdd">
          <span class="btn-icon">+</span>
          添加多边形
        </button>
        <button class="btn-glass" @click="handleClear">
          清空
        </button>
        <button class="btn-test" @click="emit('generateRandom')" title="生成随机测试多边形">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
            <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
          </svg>
          测试
        </button>
      </div>
    </div>
    
    <!-- 底部控制 -->
    <div class="panel-footer" v-if="geometriesCount > 0">
      <button class="btn-glass" @click="emit('resetView')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
          <path d="M3 3v5h5"></path>
        </svg>
        重置视图
      </button>
      <button class="btn-danger" @click="emit('clearAll')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
        清空
      </button>
    </div>
    
    <div class="zoom-indicator" v-if="geometriesCount > 0">
      <span class="zoom-value">{{ (viewScale * 100).toFixed(0) }}%</span>
    </div>
  </div>
</template>

<style scoped>
.glass-panel {
  position: absolute;
  top: 20px;
  left: 20px;
  z-index: 100;
  width: 340px;
  max-height: calc(100vh - 40px);
  background: rgba(20, 20, 30, 0.75);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 24px;
  overflow-y: auto;
  box-shadow: 
    0 25px 50px -12px rgba(0, 0, 0, 0.5),
    0 0 0 1px rgba(255, 255, 255, 0.05) inset;
}

.glass-panel::-webkit-scrollbar {
  width: 6px;
}

.glass-panel::-webkit-scrollbar-track {
  background: transparent;
}

.glass-panel::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}

.panel-header {
  margin-bottom: 20px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo-icon {
  font-size: 24px;
  color: #00f5ff;
  text-shadow: 0 0 20px rgba(0, 245, 255, 0.5);
}

.logo-text {
  font-size: 18px;
  font-weight: 700;
  background: linear-gradient(135deg, #fff 0%, #a0a0b0 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.input-section {
  margin-bottom: 20px;
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

.input-actions {
  display: flex;
  gap: 8px;
  margin-top: 14px;
}

.btn-glow {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px 20px;
  font-size: 13px;
  font-weight: 600;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
  overflow: hidden;
}

.btn-primary {
  flex: 1;
  background: linear-gradient(135deg, #00f5ff 0%, #00c8ff 100%);
  color: #000;
  box-shadow: 0 4px 20px rgba(0, 245, 255, 0.3);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(0, 245, 255, 0.4);
}

.btn-primary:active {
  transform: translateY(0);
}

.btn-glass {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px 18px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  font-size: 13px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-glass:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
}

.btn-test {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px 14px;
  background: rgba(255, 107, 107, 0.1);
  border: 1px solid rgba(255, 107, 107, 0.3);
  border-radius: 10px;
  font-size: 13px;
  font-weight: 500;
  color: #ff6b6b;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-test:hover {
  background: rgba(255, 107, 107, 0.2);
  border-color: rgba(255, 107, 107, 0.5);
  box-shadow: 0 0 20px rgba(255, 107, 107, 0.3);
}

.btn-danger {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 16px;
  background: rgba(255, 107, 107, 0.1);
  border: 1px solid rgba(255, 107, 107, 0.3);
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  color: #ff6b6b;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-danger:hover {
  background: rgba(255, 107, 107, 0.2);
  border-color: rgba(255, 107, 107, 0.5);
}

.panel-footer {
  display: flex;
  gap: 10px;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.zoom-indicator {
  margin-top: 16px;
  text-align: center;
}

.zoom-value {
  display: inline-block;
  padding: 6px 16px;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  color: #00f5ff;
  font-family: 'JetBrains Mono', monospace;
}
</style>
