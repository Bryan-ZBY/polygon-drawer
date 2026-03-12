import { ref } from 'vue'
import type { Geometry, PolygonGroup } from '@/types'

export function useFocusButton() {
  const focusButton = ref<{
    show: boolean
    x: number
    y: number
    geometryId: string | null
  }>({ show: false, x: 0, y: 0, geometryId: null })

  function show(geometryId: string, screenX: number, screenY: number) {
    focusButton.value = {
      show: true,
      x: screenX + 10,
      y: screenY - 40,
      geometryId
    }
  }

  function hide() {
    focusButton.value.show = false
    focusButton.value.geometryId = null
  }

  function findGeometry(geometries: Geometry[], id: string): Geometry | null {
    // 先在顶层查找
    const geometry = geometries.find(g => g.id === id)
    if (geometry) return geometry

    // 在多边形组中查找
    for (const g of geometries) {
      if (g.type === 'group') {
        const group = g as PolygonGroup
        const polygon = group.polygons.find(p => p.id === id)
        if (polygon) return polygon
      }
    }
    return null
  }

  return {
    focusButton,
    show,
    hide,
    findGeometry
  }
}
