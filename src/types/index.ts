// 基础几何类型
export interface Point {
  x: number
  y: number
}

// 几何图形类型枚举
export enum GeometryType {
  POLYGON = 'polygon',
  LINE = 'line',
  CIRCLE = 'circle',
  RECTANGLE = 'rectangle',
  MEASUREMENT = 'measurement',
  // 可扩展更多类型
}

// 基础几何图形接口
export interface BaseGeometry {
  id: string
  name: string
  type: GeometryType
  visible: boolean
  color: string
}

// 多边形
export interface Polygon extends BaseGeometry {
  type: GeometryType.POLYGON
  points: Point[]
}

// 线段
export interface Line extends BaseGeometry {
  type: GeometryType.LINE
  start: Point
  end: Point
}

// 圆形
export interface Circle extends BaseGeometry {
  type: GeometryType.CIRCLE
  center: Point
  radius: number
}

// 矩形
export interface Rectangle extends BaseGeometry {
  type: GeometryType.RECTANGLE
  x: number
  y: number
  width: number
  height: number
}

// 测距线
export interface Measurement extends BaseGeometry {
  type: GeometryType.MEASUREMENT
  start: Point
  end: Point
  distance: number
}

// 联合类型
export type Geometry = Polygon | Line | Circle | Rectangle | Measurement

// 视图状态
export interface ViewState {
  scale: number
  offsetX: number
  offsetY: number
}

// 画布边界框
export interface BoundingBox {
  minX: number
  maxX: number
  minY: number
  maxY: number
  width: number
  height: number
}

// 解析结果
export interface ParseResult<T = Geometry> {
  success: boolean
  data?: T
  error?: string
}

// 几何图形解析器接口
export interface GeometryParser {
  type: GeometryType
  parse: (input: string) => ParseResult
  validate: (data: unknown) => boolean
}

// 霓虹色彩配置
export const NEON_COLORS = [
  '#00f5ff', '#ff00ff', '#00ff88', '#ffaa00',
  '#ff3366', '#aa66ff', '#00ccff', '#ff6699',
  '#66ffcc', '#ffcc00', '#ff6b6b', '#4ecdc4'
]

// 生成唯一ID
export const generateId = () => 
  Date.now().toString(36) + Math.random().toString(36).substr(2)

// 获取下一个颜色
let colorIndex = 0
export const getNextColor = () => {
  const color = NEON_COLORS[colorIndex % NEON_COLORS.length]
  colorIndex++
  return color
}

// 重置颜色索引
export const resetColorIndex = () => {
  colorIndex = 0
}
