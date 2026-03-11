# Polygon Drawer - 多边形绘制与测量工具

<div align="center">

![Vue.js](https://img.shields.io/badge/Vue.js-3.5-4FC08D?style=flat-square&logo=vue.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript)
![Vite](https://img.shields.io/badge/Vite-7.3-646CFF?style=flat-square&logo=vite)

一个基于 Vue 3 + TypeScript + Canvas 的高性能多边形绘制与测量工具

</div>

---

## 📖 项目概述

Polygon Drawer 是一个专业的几何图形绘制与测量工具，支持多边形生成、编辑、测距等功能。项目采用现代化的前端技术栈，实现了流畅的交互体验和精确的图形计算。

### 核心特性

- 🎯 **智能多边形生成** - 基于非重叠算法的多边形自动生成
- 📏 **精确测距系统** - 支持吸附、垂直测量、实时距离显示
- 🖱️ **流畅交互体验** - 拖拽、缩放、选中、编辑一气呵成
- 🎨 **现代化UI设计** - 暗色主题、毛玻璃效果、精致动画
- 💾 **状态持久化** - 自动保存面板位置和用户偏好

---

## 🚀 功能实现

### 1. 多边形管理

#### 1.1 多边形生成
- **算法实现**: 采用基于网格的非重叠多边形生成算法
- **随机分布**: 在画布区域内随机生成不重叠的多边形
- **颜色分配**: 每个多边形分配唯一的标识颜色
- **顶点控制**: 支持 3-8 个顶点的多边形生成

#### 1.2 多边形编辑
- **重命名**: 双击或点击编辑按钮修改多边形名称
- **显示/隐藏**: 独立控制每个多边形的可见性
- **删除**: 支持单个删除和一键清空
- **选中态**: 点击选中多边形，显示详细信息

#### 1.3 边操作
- **边选中**: 点击多边形边可单独选中
- **边高亮**: 选中边以粉色发光效果显示
- **边信息**: 显示边的长度、起点/终点坐标
- **测距起点**: 双击边可从边上任意点开始测距

### 2. 测距系统

#### 2.1 基础测距
- **启动方式**: 双击画布或 `Ctrl + 左键`
- **实时预览**: 拖动时实时显示距离和辅助线
- **确认机制**: 松开按键后点击确认终点
- **测距线管理**: 自动保存历史测距记录

#### 2.2 智能吸附
- **顶点吸附**: 自动吸附到多边形顶点（15像素阈值）
- **边吸附**: 吸附到边线上的最近点（10像素阈值）
- **测距线吸附**: 吸附到已有测距线上的点
- **轴吸附**: 水平/垂直轴自动对齐

#### 2.3 垂直测量
- **垂足计算**: 从测距起点向目标线段作垂线
- **垂直提示**: 接近垂直时显示"⊥ 垂线"提示
- **交点吸附**: 自动吸附到垂直交点位置
- **高亮显示**: 垂直吸附时显示红色高亮效果

#### 2.4 测距线交互
- **双击测距线**: 以测距线上点为起点开始新测距
- **选中显示**: 显示测距线长度、端点坐标
- **端点标记**: 绿色起点、红色终点标识

### 3. 视图控制

#### 3.1 画布操作
- **平移**: 右键拖拽或中键拖拽移动画布
- **缩放**: 鼠标滚轮缩放，支持精确缩放控制
- **网格**: 显示/隐藏坐标网格辅助线
- **自适应**: 自动调整视图以适应所有图形

#### 3.2 坐标系统
- **世界坐标**: 以画布中心为原点的笛卡尔坐标系
- **屏幕坐标**: 以左上角为原点的像素坐标系
- **坐标转换**: 实时双向坐标转换
- **鼠标跟踪**: 实时显示鼠标所在世界坐标

---

## 🏗️ 技术架构

### 项目结构

```
polygon-drawer/
├── src/
│   ├── components/          # Vue 组件
│   │   ├── DraggablePanel.vue   # 可拖拽面板容器
│   │   ├── GeometryList.vue     # 图形列表组件
│   │   ├── RealtimeInput.vue    # 多边形输入组件
│   │   └── InputPanel.vue       # 输入面板组件
│   ├── utils/               # 工具函数
│   │   ├── canvasRenderer.ts    # Canvas 渲染核心
│   │   ├── geometry3d.ts        # 3D 几何计算
│   │   └── geometryGenerator.ts # 几何图形生成器
│   ├── types/               # TypeScript 类型定义
│   │   └── index.ts
│   ├── App.vue              # 主应用组件
│   └── main.ts              # 应用入口
├── public/                  # 静态资源
├── index.html               # HTML 模板
├── package.json             # 项目配置
├── tsconfig.json            # TypeScript 配置
└── vite.config.ts           # Vite 构建配置
```

### 核心技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Vue.js | 3.5.29 | 前端框架，Composition API |
| TypeScript | 5.9.3 | 类型安全开发 |
| Vite | 7.3.1 | 构建工具，HMR 热更新 |
| Canvas API | - | 2D 图形渲染 |

---

## 💡 实现思路

### 1. 渲染架构

#### 1.1 双缓冲渲染
```typescript
// 使用 requestAnimationFrame 实现流畅动画
const scheduleDraw = () => {
  needsRedraw.value = true
  if (!animationFrameId.value) {
    animationFrameId.value = requestAnimationFrame(() => {
      drawAll()
      animationFrameId.value = null
    })
  }
}
```

#### 1.2 分层绘制
绘制顺序：网格 → 多边形 → 测距线 → 吸附点 → 选中高亮 → UI 覆盖层

#### 1.3 坐标转换系统
- **世界坐标系**: 以画布中心为原点，Y轴向上
- **屏幕坐标系**: 以左上角为原点，Y轴向下
- **转换公式**: 
  ```
  screenX = centerX + worldX * scale + offsetX
  screenY = centerY + worldY * scale + offsetY
  ```

### 2. 交互设计

#### 2.1 事件处理流程
```
鼠标按下 → 检测点击目标 → 执行对应操作 → 鼠标移动 → 更新状态 → 鼠标释放 → 确认操作
```

#### 2.2 状态管理
- **ViewState**: 视图状态（缩放、偏移）
- **Geometry**: 几何图形数据
- **Measurement**: 测距线数据
- **Selection**: 选中状态

#### 2.3 吸附算法
```typescript
// 点到线段距离计算
const pointToSegmentDistance = (p: Point, a: Point, b: Point) => {
  const t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / 
            (Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2))
  const clampedT = Math.max(0, Math.min(1, t))
  return {
    closestPoint: {
      x: a.x + clampedT * (b.x - a.x),
      y: a.y + clampedT * (b.y - a.y)
    },
    distance: Math.sqrt(Math.pow(p.x - closestPoint.x, 2) + 
                        Math.pow(p.y - closestPoint.y, 2))
  }
}
```

### 3. 性能优化

#### 3.1 渲染优化
- **脏检查**: 仅在有状态变化时重绘
- **离屏渲染**: 预计算复杂图形
- **裁剪**: 只绘制视口内的图形

#### 3.2 内存管理
- **对象池**: 复用临时对象
- **防抖**: 频繁事件的节流处理
- **WeakMap**: 避免循环引用

---

## 🎨 实现效果

### 1. 视觉设计

#### 1.1 暗色主题
- **背景色**: `#0f1419` - 深邃的暗蓝黑色
- **面板色**: `rgba(20, 25, 35, 0.85)` - 半透明毛玻璃
- **强调色**: `#00f5ff` - 青色高亮

#### 1.2 毛玻璃效果
```css
.glass-panel {
  background: rgba(20, 25, 35, 0.85);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.08);
}
```

#### 1.3 动画效果
- **悬停上浮**: `transform: translateY(-1px)`
- **发光阴影**: `box-shadow: 0 0 20px rgba(0, 245, 255, 0.15)`
- **平滑过渡**: `transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1)`

### 2. 交互反馈

#### 2.1 悬停效果
- 卡片轻微上浮并加深阴影
- 按钮放大并显示背景
- 操作按钮从半透明变为不透明

#### 2.2 选中效果
- 青色边框发光
- 背景渐变高亮
- 详细信息面板显示

#### 2.3 吸附反馈
- 顶点吸附：黄色圆圈
- 边吸附：绿色圆圈 + 垂直线
- 垂直吸附：红色高亮 + 直角符号

---

## 🔧 实现步骤

### 第一步：基础架构搭建
1. 初始化 Vue 3 + TypeScript 项目
2. 配置 Vite 构建工具
3. 设置 Canvas 画布和基础渲染循环

### 第二步：多边形系统
1. 实现多边形数据结构和类型定义
2. 开发多边形生成算法
3. 实现多边形渲染和样式控制

### 第三步：交互系统
1. 实现鼠标事件处理（点击、拖拽、缩放）
2. 开发坐标转换系统
3. 实现多边形选中、拖拽编辑

### 第四步：测距系统
1. 实现基础测距功能
2. 开发吸附算法
3. 添加垂直测量和测距线管理

### 第五步：UI 组件
1. 开发可拖拽面板组件
2. 实现图形列表和输入面板
3. 添加信息面板和状态显示

### 第六步：优化完善
1. 性能优化和内存管理
2. 添加动画和过渡效果
3. 实现状态持久化

---

## 🔍 实现细节

### 1. 非重叠多边形生成

#### 算法原理
```typescript
const generateNonOverlappingPolygon = (center: Point, radius: number): Point[] => {
  const points: Point[] = []
  const numPoints = 3 + Math.floor(Math.random() * 6) // 3-8 个顶点
  
  for (let i = 0; i < numPoints; i++) {
    const angle = (i / numPoints) * Math.PI * 2 + Math.random() * 0.5
    const r = radius * (0.5 + Math.random() * 0.5)
    points.push({
      x: center.x + Math.cos(angle) * r,
      y: center.y + Math.sin(angle) * r
    })
  }
  
  return points
}
```

#### 碰撞检测
使用圆形包围盒进行快速碰撞检测，确保新生成的多边形与已有多边形不重叠。

### 2. 射线法点包含检测

```typescript
const isPointInPolygon = (point: Point, polygon: Point[]): boolean => {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y
    const xj = polygon[j].x, yj = polygon[j].y
    
    if (((yi > point.y) !== (yj > point.y)) &&
        (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
      inside = !inside
    }
  }
  return inside
}
```

### 3. 垂足计算

```typescript
const getPerpendicularFoot = (p: Point, a: Point, b: Point): Point => {
  const dx = b.x - a.x
  const dy = b.y - a.y
  
  if (dx === 0 && dy === 0) return a
  
  const t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)
  
  return {
    x: a.x + t * dx,
    y: a.y + t * dy
  }
}
```

---

## 📚 使用指南

### 快捷键

| 操作 | 快捷键 |
|------|--------|
| 开始/结束测距 | `双击` 或 `Ctrl + 左键` |
| 平移画布 | `右键拖拽` |
| 缩放画布 | `鼠标滚轮` |
| 删除选中 | `Delete` |

### 操作说明

1. **生成多边形**: 在左侧面板输入数量，点击生成
2. **选中图形**: 单击多边形或边
3. **测距**: 双击起点，再双击终点
4. **编辑名称**: 点击图形列表中的编辑按钮
5. **拖拽面板**: 按住面板标题栏拖动

---

## 📝 开发计划

- [ ] 支持更多图形类型（圆、椭圆、贝塞尔曲线）
- [ ] 添加图层管理系统
- [ ] 实现导出 SVG/PNG 功能
- [ ] 支持撤销/重做操作
- [ ] 添加网格对齐功能

---

## 📄 许可证

MIT License © 2024 Polygon Drawer

---

<div align="center">

**Made with ❤️ using Vue 3 + TypeScript**

</div>
