// 坐标转换
export { worldToScreen, screenToWorld } from './coordinate'

// 几何计算
export {
  pointToSegmentDistance,
  isPointInPolygon,
  getPerpendicularFoot,
  calculateDistance,
  calculateBoundingBox,
  calculatePolygonCenter,
  doSegmentsIntersect,
  isSelfIntersecting
} from './geometry'

// 多边形生成
export {
  generateRandomPolygon,
  generateNonOverlappingPolygons,
  checkPolygonOverlap,
  expandPolygon
} from './polygonGenerator'

// 3D 点解析
export {
  parse3DPoints,
  is3DFormat,
  project3DTo2D
} from './geometry3d'

// Canvas 渲染
export {
  drawGeometry,
  drawMeasurement,
  drawGrid,
  drawSnapIndicator,
  drawMeasurePreview,
  drawMeasurementDeleteButton,
  drawMeasurementHighlight,
  detectHover
} from './canvasRenderer'
