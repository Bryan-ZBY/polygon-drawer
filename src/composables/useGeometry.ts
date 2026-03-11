import { ref } from 'vue'
import type { Geometry, Polygon, PolygonGroup, Point } from '@/types'
import { generateId, getNextColor } from '@/types'

export function useGeometry(
  saveToHistory: () => void,
  scheduleDraw: () => void
) {
  const geometries = ref<Geometry[]>([])
  const selectedId = ref<string | null>(null)
  const selectedEdge = ref<{ polygonId: string; edgeIndex: number; start: Point; end: Point } | null>(null)
  const hoveredId = ref<string | null>(null)
  const hoveredVertex = ref<{ geometryId: string; vertexIndex: number; point: Point } | null>(null)
  const lastHoveredVertex = ref<{ geometryId: string; vertexIndex: number; point: Point } | null>(null)
  const errorMsg = ref('')

  // 存储原始输入数据
  const originalInputData = ref<Map<string, any>>(new Map())

  // 添加普通多边形
  const addGeometry = (partialGeometry: Omit<Geometry, 'id' | 'name' | 'color'>, isRealtime: boolean = false, originalData?: any) => {
    errorMsg.value = ''

    // 如果是实时输入，先移除之前通过实时输入添加的图形
    if (isRealtime) {
      const existingIndex = geometries.value.findIndex(g => g.name === '实时预览')
      if (existingIndex > -1) {
        geometries.value.splice(existingIndex, 1)
      }
    }

    const newGeometry: Geometry = {
      ...partialGeometry,
      id: generateId(),
      name: isRealtime ? '实时预览' : `多边形 ${geometries.value.length + 1}`,
      color: isRealtime ? '#00ff88' : getNextColor()
    } as Geometry

    geometries.value.push(newGeometry)

    // 保存原始输入数据
    if (originalData) {
      originalInputData.value.set(newGeometry.id, originalData)
    }

    if (!isRealtime) {
      selectedId.value = newGeometry.id
      saveToHistory()
    }
    scheduleDraw()
  }

  // 添加多边形组
  const addPolygonGroup = (partialGroup: Omit<PolygonGroup, 'id' | 'name' | 'color'>, originalData?: any[]) => {
    errorMsg.value = ''

    const newGroup: PolygonGroup = {
      ...partialGroup,
      id: generateId(),
      name: `多边形组 ${geometries.value.length + 1}`,
      color: getNextColor()
    }

    geometries.value.push(newGroup)

    // 保存原始输入数据（为每个多边形保存对应的原始边数据）
    if (originalData && Array.isArray(originalData)) {
      newGroup.polygons.forEach((polygon, index) => {
        if (originalData[index]) {
          originalInputData.value.set(polygon.id, originalData[index])
        }
      })
    }

    selectedId.value = newGroup.id
    saveToHistory()
    scheduleDraw()
  }

  // 删除图形
  const deleteGeometry = (id: string) => {
    const index = geometries.value.findIndex(g => g.id === id)
    if (index > -1) {
      geometries.value.splice(index, 1)
      if (selectedId.value === id) {
        selectedId.value = null
        selectedEdge.value = null
      }
      if (hoveredId.value === id) {
        hoveredId.value = null
      }
      // 删除原始数据
      originalInputData.value.delete(id)
      saveToHistory()
      scheduleDraw()
    }
  }

  // 选择图形
  const selectGeometry = (id: string) => {
    selectedId.value = id
    scheduleDraw()
  }

  // 选择组内多边形
  const selectGroupPolygon = (groupId: string, polygonId: string) => {
    const group = geometries.value.find(g => g.id === groupId && g.type === 'group') as PolygonGroup | undefined
    if (group && !group.collapsed) {
      selectedId.value = polygonId
      scheduleDraw()
    }
  }

  // 切换组折叠状态
  const toggleGroupCollapse = (groupId: string) => {
    const group = geometries.value.find(g => g.id === groupId && g.type === 'group') as PolygonGroup | undefined
    if (group) {
      group.collapsed = !group.collapsed
      scheduleDraw()
    }
  }

  // 切换可见性
  const toggleVisibility = (geometry: Geometry) => {
    geometry.visible = !geometry.visible
    scheduleDraw()
  }

  // 清空所有
  const clearAll = () => {
    if (confirm('确定要清空所有图形吗？')) {
      geometries.value = []
      selectedId.value = null
      selectedEdge.value = null
      hoveredId.value = null
      hoveredVertex.value = null
      lastHoveredVertex.value = null
      originalInputData.value.clear()
      saveToHistory()
      scheduleDraw()
    }
  }

  // 设置选中边
  const selectEdge = (polygonId: string, edgeIndex: number, start: Point, end: Point) => {
    selectedEdge.value = { polygonId, edgeIndex, start, end }
    selectedId.value = polygonId
    scheduleDraw()
  }

  // 清除选中边
  const clearSelectedEdge = () => {
    selectedEdge.value = null
  }

  // 设置悬浮图形
  const setHoveredGeometry = (id: string | null) => {
    hoveredId.value = id
  }

  // 设置悬浮顶点
  const setHoveredVertex = (vertex: { geometryId: string; vertexIndex: number; point: Point } | null) => {
    hoveredVertex.value = vertex
    if (vertex) {
      lastHoveredVertex.value = vertex
    }
  }

  // 清除选中状态（用于撤销/恢复）
  const clearSelection = () => {
    selectedId.value = null
    selectedEdge.value = null
    hoveredId.value = null
    hoveredVertex.value = null
  }

  return {
    // 状态
    geometries,
    selectedId,
    selectedEdge,
    hoveredId,
    hoveredVertex,
    lastHoveredVertex,
    errorMsg,
    originalInputData,
    // 方法
    addGeometry,
    addPolygonGroup,
    deleteGeometry,
    selectGeometry,
    selectGroupPolygon,
    toggleGroupCollapse,
    toggleVisibility,
    clearAll,
    selectEdge,
    clearSelectedEdge,
    setHoveredGeometry,
    setHoveredVertex,
    clearSelection
  }
}
