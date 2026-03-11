import { ref, computed } from 'vue'
import type { Geometry, Point } from '@/types'

interface HistoryState {
  geometries: Geometry[]
  measurements: Array<{ id: string; start: Point; end: Point; distance: number }>
}

export function useHistory(
  geometries: ReturnType<typeof ref<Geometry[]>>,
  measurements: ReturnType<typeof ref<Array<{ id: string; start: Point; end: Point; distance: number }>>>,
  onRestore: () => void
) {
  const historyStack = ref<HistoryState[]>([])
  const historyIndex = ref(-1)
  const MAX_HISTORY_SIZE = 50

  const canUndo = computed(() => historyIndex.value > 0)
  const canRedo = computed(() => historyIndex.value < historyStack.value.length - 1)

  const saveToHistory = () => {
    if (historyIndex.value < historyStack.value.length - 1) {
      historyStack.value = historyStack.value.slice(0, historyIndex.value + 1)
    }

    historyStack.value.push({
      geometries: JSON.parse(JSON.stringify(geometries.value)),
      measurements: JSON.parse(JSON.stringify(measurements.value))
    })

    if (historyStack.value.length > MAX_HISTORY_SIZE) {
      historyStack.value.shift()
    } else {
      historyIndex.value++
    }
  }

  const undo = () => {
    if (historyIndex.value > 0) {
      historyIndex.value--
      const state = historyStack.value[historyIndex.value]
      geometries.value = JSON.parse(JSON.stringify(state.geometries))
      measurements.value = JSON.parse(JSON.stringify(state.measurements))
      onRestore()
    }
  }

  const redo = () => {
    if (historyIndex.value < historyStack.value.length - 1) {
      historyIndex.value++
      const state = historyStack.value[historyIndex.value]
      geometries.value = JSON.parse(JSON.stringify(state.geometries))
      measurements.value = JSON.parse(JSON.stringify(state.measurements))
      onRestore()
    }
  }

  const initHistory = () => {
    saveToHistory()
  }

  return {
    canUndo,
    canRedo,
    saveToHistory,
    undo,
    redo,
    initHistory
  }
}
