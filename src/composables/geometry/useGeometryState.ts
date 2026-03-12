import { ref, computed } from 'vue'
import type { Geometry, Polygon, PolygonGroup } from '@/types'
import { generateId, getNextColor } from '@/types'

export function useGeometryState() {
  const geometries = ref<Geometry[]>([])
  const selectedId = ref<string | null>(null)
  const selectedEdge = ref<{ polygonId: string; edgeIndex: number } | null>(null)
  const hoveredId = ref<string | null>(null)
  const errorMsg = ref('')

  const selectedGeometry = computed(() => {
    return geometries.value.find(g => g.id === selectedId.value) || null
  })

  const allVisible = computed(() => {
    return geometries.value.length > 0 && geometries.value.every(g => g.visible)
  })

  function addGeometry(partial: Omit<Geometry, 'id' | 'name' | 'color'>) {
    const newGeometry: Geometry = {
      ...partial,
      id: generateId(),
      name: `多边形 ${geometries.value.length + 1}`,
      color: getNextColor()
    } as Geometry
    
    geometries.value.push(newGeometry)
    selectedId.value = newGeometry.id
    return newGeometry
  }

  function addPolygonGroup(partial: Omit<PolygonGroup, 'id' | 'name' | 'color'>) {
    const newGroup: PolygonGroup = {
      ...partial,
      id: generateId(),
      name: `多边形组 ${geometries.value.length + 1}`,
      color: getNextColor()
    }
    
    geometries.value.push(newGroup)
    selectedId.value = newGroup.id
    return newGroup
  }

  function deleteGeometry(id: string) {
    const index = geometries.value.findIndex(g => g.id === id)
    if (index >= 0) {
      geometries.value.splice(index, 1)
      if (selectedId.value === id) {
        selectedId.value = null
        selectedEdge.value = null
      }
    }
  }

  function selectGeometry(id: string | null) {
    selectedId.value = id
    if (!id) {
      selectedEdge.value = null
    }
  }

  function toggleVisibility(geometry: Geometry) {
    const isShowing = !geometry.visible
    
    if (isShowing) {
      geometry.visible = true
    }
    
    if (geometry.opacity === undefined) {
      geometry.opacity = isShowing ? 0 : 1
    }
    
    const targetOpacity = isShowing ? 1 : 0
    const startOpacity = geometry.opacity
    const startTime = performance.now()
    const duration = 500
    
    const easeInOutCubic = (t: number): number => {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
    }
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      const easedProgress = easeInOutCubic(progress)
      
      geometry.opacity = startOpacity + (targetOpacity - startOpacity) * easedProgress
      
      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        if (!isShowing) {
          geometry.visible = false
        }
      }
    }
    
    requestAnimationFrame(animate)
  }

  function toggleAllVisibility() {
    const newVisible = !allVisible.value
    
    if (newVisible) {
      geometries.value.forEach(g => {
        g.visible = true
        if (g.opacity === undefined) g.opacity = 0
      })
    }
    
    const duration = 500
    const startTime = performance.now()
    const startOpacities = geometries.value.map(g => g.opacity || 0)
    const targetOpacity = newVisible ? 1 : 0
    
    const easeInOutCubic = (t: number): number => {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
    }
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      const easedProgress = easeInOutCubic(progress)
      
      geometries.value.forEach((g, i) => {
        g.opacity = startOpacities[i] + (targetOpacity - startOpacities[i]) * easedProgress
      })
      
      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        if (!newVisible) {
          geometries.value.forEach(g => g.visible = false)
        }
      }
    }
    
    requestAnimationFrame(animate)
  }

  function moveLayerUp(id: string) {
    const index = geometries.value.findIndex(g => g.id === id)
    if (index > 0) {
      const temp = geometries.value[index]
      geometries.value[index] = geometries.value[index - 1]
      geometries.value[index - 1] = temp
    }
  }

  function moveLayerDown(id: string) {
    const index = geometries.value.findIndex(g => g.id === id)
    if (index >= 0 && index < geometries.value.length - 1) {
      const temp = geometries.value[index]
      geometries.value[index] = geometries.value[index + 1]
      geometries.value[index + 1] = temp
    }
  }

  function updateGeometryName(id: string, newName: string) {
    const geometry = geometries.value.find(g => g.id === id)
    if (geometry) {
      geometry.name = newName
    }
  }

  return {
    geometries,
    selectedId,
    selectedEdge,
    hoveredId,
    errorMsg,
    selectedGeometry,
    allVisible,
    addGeometry,
    addPolygonGroup,
    deleteGeometry,
    selectGeometry,
    toggleVisibility,
    toggleAllVisibility,
    moveLayerUp,
    moveLayerDown,
    updateGeometryName
  }
}
