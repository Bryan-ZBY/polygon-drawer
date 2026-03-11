/**
 * 三维几何工具函数
 * 支持三维点集到二维平面的投影转换
 */

export interface Point3D {
  X: number
  Y: number
  Z: number
}

export interface Point2D {
  x: number
  y: number
}

export interface Plane {
  normal: { x: number; y: number; z: number }
  d: number
  origin: { x: number; y: number; z: number }
  u: { x: number; y: number; z: number }  // 平面局部坐标系的u轴（对应二维x轴）
  v: { x: number; y: number; z: number }  // 平面局部坐标系的v轴（对应二维y轴）
  isYPlane?: boolean  // 是否是平行于 XZ 平面的平面
  directMapping?: boolean  // 是否直接使用原始坐标
}

export interface Parse3DResult {
  success: boolean
  error?: string
  points2D?: Point2D[]
  plane?: Plane
  originalPoints?: Point3D[]
}

/**
 * 计算三个点的叉积
 */
const crossProduct = (
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number }
): { x: number; y: number; z: number } => {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x
  }
}

/**
 * 计算向量的点积
 */
const dotProduct = (
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number }
): number => {
  return a.x * b.x + a.y * b.y + a.z * b.z
}

/**
 * 计算向量的长度
 */
const vectorLength = (v: { x: number; y: number; z: number }): number => {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z)
}

/**
 * 归一化向量
 */
const normalize = (v: { x: number; y: number; z: number }): { x: number; y: number; z: number } => {
  const len = vectorLength(v)
  if (len < 1e-10) {
    return { x: 0, y: 0, z: 0 }
  }
  return { x: v.x / len, y: v.y / len, z: v.z / len }
}

/**
 * 使用最小二乘法拟合平面
 * 平面方程: ax + by + cz + d = 0, 其中 (a, b, c) 是法向量
 */
const fitPlane = (points: Point3D[]): Plane | null => {
  if (points.length < 3) {
    return null
  }

  // 检查是否是平面平行于 XZ 平面（所有 Y 值相同或非常接近）
  const yValues = points.map(p => p.Y)
  const minY = Math.min(...yValues)
  const maxY = Math.max(...yValues)
  const isYPlane = (maxY - minY) < 1e-6

  if (isYPlane) {
    // 平面平行于 XZ 平面，直接使用原始 X 和 Z 作为二维坐标
    // 设置一个特殊的标记，让投影函数直接返回原始坐标
    const centroid = {
      x: points.reduce((sum, p) => sum + p.X, 0) / points.length,
      y: minY,
      z: points.reduce((sum, p) => sum + p.Z, 0) / points.length
    }
    const normal = { x: 0, y: 1, z: 0 }
    const d = -(normal.x * centroid.x + normal.y * centroid.y + normal.z * centroid.z)

    return {
      normal,
      d,
      origin: centroid,
      u: { x: 1, y: 0, z: 0 },  // 未使用
      v: { x: 0, y: 0, z: 1 },  // 未使用
      isYPlane: true,
      directMapping: true  // 直接使用原始坐标
    }
  }

  // 检查是否是平面平行于 XY 平面（所有 Z 值相同或非常接近）
  const zValues = points.map(p => p.Z)
  const minZ = Math.min(...zValues)
  const maxZ = Math.max(...zValues)
  const isZPlane = (maxZ - minZ) < 1e-6

  if (isZPlane) {
    // 平面平行于 XY 平面，直接使用 X 和 Y 作为二维坐标
    const u = { x: 1, y: 0, z: 0 }
    const v = { x: 0, y: 1, z: 0 }
    const normal = { x: 0, y: 0, z: 1 }  // Z 轴方向
    const centroid = {
      x: points.reduce((sum, p) => sum + p.X, 0) / points.length,
      y: points.reduce((sum, p) => sum + p.Y, 0) / points.length,
      z: minZ
    }
    const d = -(normal.x * centroid.x + normal.y * centroid.y + normal.z * centroid.z)

    return {
      normal,
      d,
      origin: centroid,
      u,
      v,
      isYPlane: false
    }
  }

  // 检查是否是平面平行于 YZ 平面（所有 X 值相同或非常接近）
  const xValues = points.map(p => p.X)
  const minX = Math.min(...xValues)
  const maxX = Math.max(...xValues)
  const isXPlane = (maxX - minX) < 1e-6

  if (isXPlane) {
    // 平面平行于 YZ 平面，直接使用 Y 和 Z 作为二维坐标
    const u = { x: 0, y: 1, z: 0 }
    const v = { x: 0, y: 0, z: 1 }
    const normal = { x: 1, y: 0, z: 0 }  // X 轴方向
    const centroid = {
      x: minX,
      y: points.reduce((sum, p) => sum + p.Y, 0) / points.length,
      z: points.reduce((sum, p) => sum + p.Z, 0) / points.length
    }
    const d = -(normal.x * centroid.x + normal.y * centroid.y + normal.z * centroid.z)

    return {
      normal,
      d,
      origin: centroid,
      u,
      v,
      isYPlane: false
    }
  }

  // 计算质心
  const centroid = {
    x: points.reduce((sum, p) => sum + p.X, 0) / points.length,
    y: points.reduce((sum, p) => sum + p.Y, 0) / points.length,
    z: points.reduce((sum, p) => sum + p.Z, 0) / points.length
  }

  // 构建协方差矩阵
  let xx = 0, xy = 0, xz = 0, yy = 0, yz = 0, zz = 0
  
  for (const p of points) {
    const dx = p.X - centroid.x
    const dy = p.Y - centroid.y
    const dz = p.Z - centroid.z
    xx += dx * dx
    xy += dx * dy
    xz += dx * dz
    yy += dy * dy
    yz += dy * dz
    zz += dz * dz
  }

  // 使用特征值分解找到最小特征值对应的特征向量（即法向量）
  // 简化为求解协方差矩阵的特征向量
  const matrix = [
    [xx, xy, xz],
    [xy, yy, yz],
    [xz, yz, zz]
  ]

  // 使用幂迭代法找到最小特征值对应的特征向量
  // 实际上我们需要的是协方差矩阵最小特征值对应的特征向量
  // 这里使用简化的方法：直接计算
  
  // 计算矩阵的迹和行列式来估计特征值
  const trace = xx + yy + zz
  
  // 使用简化的方法：找到变化最小的方向
  // 如果点几乎在XY平面，法向量接近Z轴
  // 如果点几乎在XZ平面，法向量接近Y轴
  // 如果点几乎在YZ平面，法向量接近X轴
  
  let normal: { x: number; y: number; z: number }
  
  // 判断哪个方向的方差最小
  const varX = xx / points.length
  const varY = yy / points.length
  const varZ = zz / points.length
  
  // 找到两个方差较大的轴，法向量垂直于它们
  if (varX < varY && varX < varZ) {
    // X方向方差最小，法向量接近X轴
    normal = { x: 1, y: 0, z: 0 }
  } else if (varY < varX && varY < varZ) {
    // Y方向方差最小，法向量接近Y轴
    normal = { x: 0, y: 1, z: 0 }
  } else if (varZ < varX && varZ < varY) {
    // Z方向方差最小，法向量接近Z轴
    normal = { x: 0, y: 0, z: 1 }
  } else {
    // 使用协方差矩阵计算法向量
    // 简化的特征值计算
    const a = matrix[0][0]
    const b = matrix[1][1]
    const c = matrix[2][2]
    const d = matrix[0][1]
    const e = matrix[0][2]
    const f = matrix[1][2]
    
    // 使用近似方法找到法向量
    normal = {
      x: b * c - f * f + c * a - e * e + a * b - d * d,
      y: d * c - e * f + d * a - e * b,
      z: e * b - d * f + e * a - d * c
    }
    normal = normalize(normal)
  }

  // 计算平面方程的d值: ax + by + cz + d = 0
  const d = -(normal.x * centroid.x + normal.y * centroid.y + normal.z * centroid.z)

  // 构建平面局部坐标系
  // 选择u轴为平面上任意一个与法向量垂直的向量
  let u: { x: number; y: number; z: number }
  
  // 选择一个与法向量不平行的参考向量
  const ref = Math.abs(normal.x) < 0.9 ? { x: 1, y: 0, z: 0 } : { x: 0, y: 1, z: 0 }
  
  // u = ref - (ref · normal) * normal
  const refDotNormal = dotProduct(ref, normal)
  u = {
    x: ref.x - refDotNormal * normal.x,
    y: ref.y - refDotNormal * normal.y,
    z: ref.z - refDotNormal * normal.z
  }
  u = normalize(u)
  
  // v = normal × u
  const v = crossProduct(normal, u)

  return {
    normal,
    d,
    origin: centroid,
    u,
    v,
    isYPlane: false
  }
}

/**
 * 检查点是否共线或过于接近
 */
const checkPointsValidity = (points: Point3D[]): { valid: boolean; error?: string } => {
  if (points.length < 3) {
    return { valid: false, error: '至少需要3个点才能确定一个平面' }
  }

  // 检查是否有重复点
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const dx = points[i].X - points[j].X
      const dy = points[i].Y - points[j].Y
      const dz = points[i].Z - points[j].Z
      if (Math.sqrt(dx * dx + dy * dy + dz * dz) < 1e-6) {
        return { valid: false, error: '存在重复的点' }
      }
    }
  }

  // 检查是否共线
  if (points.length === 3) {
    const v1 = {
      x: points[1].X - points[0].X,
      y: points[1].Y - points[0].Y,
      z: points[1].Z - points[0].Z
    }
    const v2 = {
      x: points[2].X - points[0].X,
      y: points[2].Y - points[0].Y,
      z: points[2].Z - points[0].Z
    }
    const cross = crossProduct(v1, v2)
    if (vectorLength(cross) < 1e-10) {
      return { valid: false, error: '三个点共线，无法确定平面' }
    }
  }

  return { valid: true }
}

/**
 * 将三维点投影到二维平面
 */
const project3DTo2D = (point: Point3D, plane: Plane): Point2D => {
  // 如果是直接映射模式（XZ平面），直接返回原始坐标
  if (plane.directMapping) {
    return { x: point.X, y: point.Z }
  }

  // 将点平移到以平面质心为原点的坐标系
  const dx = point.X - plane.origin.x
  const dy = point.Y - plane.origin.y
  const dz = point.Z - plane.origin.z

  // 投影到平面的局部坐标系
  // 二维x坐标 = 向量 · u轴
  // 二维y坐标 = 向量 · v轴
  const x = dotProduct({ x: dx, y: dy, z: dz }, plane.u)
  const y = dotProduct({ x: dx, y: dy, z: dz }, plane.v)

  return { x, y }
}

/**
 * 解析三维点集并转换为二维多边形
 */
export const parse3DPoints = (input: string): Parse3DResult => {
  if (!input.trim()) {
    return { success: false, error: '' }
  }

  try {
    const data = JSON.parse(input)

    if (!Array.isArray(data)) {
      return { success: false, error: '输入必须是数组格式' }
    }

    if (data.length === 0) {
      return { success: false, error: '' }
    }

    // 检查是否是三维点格式 (X, Y, Z)
    const points3D: Point3D[] = []
    
    for (const p of data) {
      // 支持大写的 X, Y, Z 或小写的 x, y, z
      const x = p.X !== undefined ? p.X : p.x
      const y = p.Y !== undefined ? p.Y : p.y
      const z = p.Z !== undefined ? p.Z : p.z

      if (typeof x === 'number' && typeof y === 'number' && typeof z === 'number') {
        points3D.push({ X: x, Y: y, Z: z })
      } else {
        return { success: false, error: '所有点必须包含 X, Y, Z 数字属性' }
      }
    }

    if (points3D.length < 3) {
      return { success: false, error: '至少需要3个点才能绘制多边形' }
    }

    // 检查点的有效性
    const validity = checkPointsValidity(points3D)
    if (!validity.valid) {
      return { success: false, error: validity.error }
    }

    // 拟合平面
    const plane = fitPlane(points3D)
    if (!plane) {
      return { success: false, error: '无法拟合平面' }
    }

    // 将三维点投影到二维
    const points2D = points3D.map(p => project3DTo2D(p, plane))

    return {
      success: true,
      points2D,
      plane,
      originalPoints: points3D
    }
  } catch (e) {
    return { success: false, error: 'JSON 格式错误' }
  }
}

/**
 * 检查输入是否是三维点格式
 */
export const is3DFormat = (input: string): boolean => {
  try {
    const data = JSON.parse(input)
    if (!Array.isArray(data) || data.length === 0) {
      return false
    }
    const first = data[0]
    // 检查是否有大写或小写的 X, Y, Z
    return (first.X !== undefined || first.x !== undefined) &&
           (first.Y !== undefined || first.y !== undefined) &&
           (first.Z !== undefined || first.z !== undefined)
  } catch {
    return false
  }
}
