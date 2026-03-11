import { ref, onMounted, onUnmounted } from 'vue'
import type { ViewState } from '@/types'

export function useCanvas() {
  const canvasRef = ref<HTMLCanvasElement | null>(null)
  const ctxRef = ref<CanvasRenderingContext2D | null>(null)
  const animationFrameId = ref<number | null>(null)
  const needsRedraw = ref(false)
  
  // 初始化 Canvas
  const initCanvas = () => {
    const canvas = canvasRef.value
    if (!canvas) return false
    
    const ctx = canvas.getContext('2d', {
      willReadFrequently: true
    })
    if (!ctx) return false
    
    ctxRef.value = ctx
    resizeCanvas()
    return true
  }
  
  // 设置画布大小
  const resizeCanvas = () => {
    const canvas = canvasRef.value
    if (!canvas) return
    
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    scheduleDraw()
  }
  
  // 清空画布
  const clearCanvas = () => {
    const canvas = canvasRef.value
    const ctx = ctxRef.value
    if (!canvas || !ctx) return
    
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }
  
  // 调度绘制
  const scheduleDraw = (drawFn?: () => void) => {
    needsRedraw.value = true
    
    if (!animationFrameId.value) {
      animationFrameId.value = requestAnimationFrame(() => {
        if (drawFn) {
          drawFn()
        }
        animationFrameId.value = null
        needsRedraw.value = false
      })
    }
  }
  
  // 世界坐标转屏幕坐标
  const worldToScreen = (
    point: { x: number; y: number },
    viewState: ViewState
  ): { x: number; y: number } => {
    const canvas = canvasRef.value
    if (!canvas) return { x: 0, y: 0 }
    
    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    
    return {
      x: centerX + (point.x * viewState.scale) + viewState.offsetX,
      y: centerY - (point.y * viewState.scale) + viewState.offsetY
    }
  }
  
  // 屏幕坐标转世界坐标
  const screenToWorld = (
    screenX: number,
    screenY: number,
    viewState: ViewState
  ): { x: number; y: number } => {
    const canvas = canvasRef.value
    if (!canvas) return { x: 0, y: 0 }
    
    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    
    return {
      x: (screenX - centerX - viewState.offsetX) / viewState.scale,
      y: -(screenY - centerY - viewState.offsetY) / viewState.scale
    }
  }
  
  // 窗口大小变化监听
  onMounted(() => {
    window.addEventListener('resize', resizeCanvas)
  })
  
  onUnmounted(() => {
    window.removeEventListener('resize', resizeCanvas)
    if (animationFrameId.value) {
      cancelAnimationFrame(animationFrameId.value)
    }
  })
  
  return {
    canvasRef,
    ctxRef,
    initCanvas,
    resizeCanvas,
    clearCanvas,
    scheduleDraw,
    worldToScreen,
    screenToWorld
  }
}
