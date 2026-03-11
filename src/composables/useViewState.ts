import { ref, reactive } from 'vue'
import type { ViewState, Point } from '@/types'

export function useViewState(canvasRef: ReturnType<typeof ref<HTMLCanvasElement | null>>) {
  const viewState = reactive<ViewState>({
    scale: 1,
    offsetX: 0,
    offsetY: 0
  })

  const isDragging = ref(false)
  const dragStart = ref({ x: 0, y: 0 })
  const viewDragStart = ref<{ scale: number; offsetX: number; offsetY: number }>({ scale: 1, offsetX: 0, offsetY: 0 })

  // 世界坐标转屏幕坐标（Y轴向上为正）
  const worldToScreen = (point: Point): { x: number; y: number } => {
    const canvas = canvasRef.value
    if (!canvas) return { x: 0, y: 0 }

    const centerX = canvas.width / 2
    const centerY = canvas.height / 2

    return {
      x: centerX + (point.x * viewState.scale) + viewState.offsetX,
      y: centerY - (point.y * viewState.scale) + viewState.offsetY
    }
  }

  // 屏幕坐标转世界坐标（Y轴向上为正）
  const screenToWorld = (screenX: number, screenY: number): Point => {
    const canvas = canvasRef.value
    if (!canvas) return { x: 0, y: 0 }

    const centerX = canvas.width / 2
    const centerY = canvas.height / 2

    return {
      x: (screenX - centerX - viewState.offsetX) / viewState.scale,
      y: -(screenY - centerY - viewState.offsetY) / viewState.scale
    }
  }

  // 开始拖拽视图
  const startDrag = (x: number, y: number) => {
    isDragging.value = true
    dragStart.value = { x, y }
    viewDragStart.value = { scale: viewState.scale, offsetX: viewState.offsetX, offsetY: viewState.offsetY }
  }

  // 更新拖拽
  const updateDrag = (x: number, y: number) => {
    if (isDragging.value) {
      const dx = x - dragStart.value.x
      const dy = y - dragStart.value.y
      viewState.offsetX = viewDragStart.value.offsetX + dx
      viewState.offsetY = viewDragStart.value.offsetY + dy
    }
  }

  // 结束拖拽
  const endDrag = () => {
    isDragging.value = false
  }

  // 缩放视图
  const zoom = (factor: number, centerX: number, centerY: number) => {
    const canvas = canvasRef.value
    if (!canvas) return

    const oldScale = viewState.scale
    const newScale = Math.max(0.1, Math.min(10, oldScale * factor))

    // 以鼠标位置为中心缩放
    const worldX = (centerX - canvas.width / 2 - viewState.offsetX) / oldScale
    const worldY = -(centerY - canvas.height / 2 - viewState.offsetY) / oldScale

    viewState.scale = newScale
    viewState.offsetX = centerX - canvas.width / 2 - worldX * newScale
    viewState.offsetY = centerY - canvas.height / 2 + worldY * newScale
  }

  // 重置视图
  const resetView = () => {
    viewState.scale = 1
    viewState.offsetX = 0
    viewState.offsetY = 0
  }

  return {
    viewState,
    isDragging,
    worldToScreen,
    screenToWorld,
    startDrag,
    updateDrag,
    endDrag,
    zoom,
    resetView
  }
}
