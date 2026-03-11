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
  generateNonOverlappingPolygon as generateNonOverlappingPolygons,
  checkBoundingBoxOverlap as checkPolygonOverlap
} from './geometryGenerator'

// 3D 点解析
export {
  parse3DPoints,
  is3DFormat
} from './geometry3d'

// Canvas 渲染
export {
  drawGeometry,
  drawGrid,
  detectHover
} from './canvasRenderer'
