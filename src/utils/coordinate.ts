import type { Point, ViewState } from '@/types'

/**
 * 世界坐标转屏幕坐标（Y轴向上为正）
 */
export const worldToScreen = (
  point: Point,
  viewState: ViewState,
  canvasWidth: number,
  canvasHeight: number
): { x: number; y: number } => {
  const centerX = canvasWidth / 2
  const centerY = canvasHeight / 2

  return {
    x: centerX + (point.x * viewState.scale) + viewState.offsetX,
    y: centerY - (point.y * viewState.scale) + viewState.offsetY
  }
}

/**
 * 屏幕坐标转世界坐标（Y轴向上为正）
 */
export const screenToWorld = (
  screenX: number,
  screenY: number,
  viewState: ViewState,
  canvasWidth: number,
  canvasHeight: number
): Point => {
  const centerX = canvasWidth / 2
  const centerY = canvasHeight / 2

  return {
    x: (screenX - centerX - viewState.offsetX) / viewState.scale,
    y: -(screenY - centerY - viewState.offsetY) / viewState.scale
  }
}
