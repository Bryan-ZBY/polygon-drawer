import { ref, computed } from 'vue'
import type { Point } from '@/types'
import { generateId } from '@/types'

export function useMeasurement(
  saveToHistory: () => void,
  scheduleDraw: () => void
) {
  // 测距状态
  const isMeasuring = ref(false)
  const measureStart = ref<Point | null>(null)
  const measureEnd = ref<Point | null>(null)
  const isMeasureDragging = ref(false)
  const isMeasurePending = ref(false)
  const canMeasureDrag = ref(false)
  const measureDragStartPos = ref({ x: 0, y: 0 })

  // 测距线列表
  const measurements = ref<Array<{ id: string; start: Point; end: Point; distance: number }>>([])
  const selectedMeasurementId = ref<string | null>(null)
  const measurementDeleteBtnPos = ref<{ x: number; y: number; measurementId: string } | null>(null)

  // 开始测距
  const startMeasurement = (point: Point) => {
    isMeasuring.value = true
    isMeasurePending.value = false
    measureStart.value = { ...point }
    measureEnd.value = { ...point }
    canMeasureDrag.value = false
  }

  // 更新测距终点
  const updateMeasureEnd = (point: Point) => {
    if (isMeasuring.value && measureStart.value) {
      measureEnd.value = { ...point }
    }
  }

  // 结束测距并保存
  const endMeasurement = (point: Point) => {
    if (isMeasuring.value && measureStart.value) {
      const distance = Math.sqrt(
        Math.pow(point.x - measureStart.value.x, 2) +
        Math.pow(point.y - measureStart.value.y, 2)
      )

      if (distance > 0.001) {
        measurements.value.push({
          id: generateId(),
          start: { ...measureStart.value },
          end: { ...point },
          distance
        })
        saveToHistory()
      }

      isMeasuring.value = false
      isMeasurePending.value = false
      measureStart.value = null
      measureEnd.value = null
      scheduleDraw()
    }
  }

  // 取消测距
  const cancelMeasurement = () => {
    isMeasuring.value = false
    isMeasurePending.value = false
    measureStart.value = null
    measureEnd.value = null
    scheduleDraw()
  }

  // 删除测距线
  const deleteMeasurement = (id: string) => {
    const index = measurements.value.findIndex(m => m.id === id)
    if (index > -1) {
      measurements.value.splice(index, 1)
      if (selectedMeasurementId.value === id) {
        selectedMeasurementId.value = null
      }
      measurementDeleteBtnPos.value = null
      scheduleDraw()
    }
  }

  // 选择测距线
  const selectMeasurement = (id: string) => {
    selectedMeasurementId.value = id
    scheduleDraw()
  }

  // 清除选中状态
  const clearMeasurementSelection = () => {
    selectedMeasurementId.value = null
    measurementDeleteBtnPos.value = null
  }

  return {
    // 状态
    isMeasuring,
    measureStart,
    measureEnd,
    isMeasureDragging,
    isMeasurePending,
    canMeasureDrag,
    measureDragStartPos,
    measurements,
    selectedMeasurementId,
    measurementDeleteBtnPos,
    // 方法
    startMeasurement,
    updateMeasureEnd,
    endMeasurement,
    cancelMeasurement,
    deleteMeasurement,
    selectMeasurement,
    clearMeasurementSelection
  }
}
