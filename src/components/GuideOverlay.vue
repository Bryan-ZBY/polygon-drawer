<script setup lang="ts">
import { ref, onMounted } from 'vue'

interface GuideStep {
  title: string
  content: string
  target?: string
}

const steps: GuideStep[] = [
  {
    title: '欢迎使用 Polygon Studio',
    content: '这是一个专业的多边形绘制与测量工具。让我们快速了解一下主要功能。',
  },
  {
    title: '输入面板',
    content: '在左侧输入面板中，您可以粘贴多边形数据（JSON格式）或边数据，系统会自动解析并绘制。',
    target: '.input-panel'
  },
  {
    title: '图形列表',
    content: '左下方的图形列表显示了所有已添加的多边形。您可以在这里管理图层顺序、锁定、显示/隐藏等。',
    target: '.list-panel'
  },
  {
    title: '画布操作',
    content: '使用鼠标滚轮缩放画布，左键或右键拖拽移动画布。右上角有视图控制按钮可以快速调整视图。',
    target: '.dark-canvas'
  },
  {
    title: '测距功能',
    content: '双击画布或按住 Ctrl + 左键开始测距，再次点击结束。支持智能吸附到顶点、边和垂直线。',
    target: '.dark-canvas'
  },
  {
    title: '快捷键',
    content: 'Ctrl+Z 撤销，Ctrl+Y 恢复，Delete 删除选中项。更多快捷键请查看帮助菜单。',
  }
]

const currentStep = ref(0)
const showGuide = ref(false)

onMounted(() => {
  // 检查是否是首次使用
  const hasSeenGuide = localStorage.getItem('polygon-drawer-guide')
  if (!hasSeenGuide) {
    showGuide.value = true
  }
})

const nextStep = () => {
  if (currentStep.value < steps.length - 1) {
    currentStep.value++
  } else {
    finishGuide()
  }
}

const prevStep = () => {
  if (currentStep.value > 0) {
    currentStep.value--
  }
}

const skipGuide = () => {
  showGuide.value = false
  localStorage.setItem('polygon-drawer-guide', 'skipped')
}

const finishGuide = () => {
  showGuide.value = false
  localStorage.setItem('polygon-drawer-guide', 'completed')
}

const restartGuide = () => {
  currentStep.value = 0
  showGuide.value = true
}

defineExpose({
  restartGuide
})
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="showGuide" class="guide-overlay">
        <div class="guide-backdrop" @click="skipGuide"></div>
        
        <div class="guide-card">
          <div class="guide-header">
            <h3>{{ steps[currentStep].title }}</h3>
            <button class="close-btn" @click="skipGuide">×</button>
          </div>
          
          <div class="guide-content">
            <p>{{ steps[currentStep].content }}</p>
          </div>
          
          <div class="guide-progress">
            <div 
              v-for="(step, index) in steps" 
              :key="index"
              class="progress-dot"
              :class="{ active: index === currentStep, completed: index < currentStep }"
            ></div>
          </div>
          
          <div class="guide-actions">
            <button 
              v-if="currentStep > 0" 
              class="btn-secondary"
              @click="prevStep"
            >
              上一步
            </button>
            <button 
              v-if="currentStep < steps.length - 1" 
              class="btn-primary"
              @click="nextStep"
            >
              下一步
            </button>
            <button 
              v-else 
              class="btn-primary"
              @click="finishGuide"
            >
              开始使用
            </button>
          </div>
          
          <div class="guide-skip">
            <button class="btn-text" @click="skipGuide">
              跳过引导
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.guide-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.guide-backdrop {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
}

.guide-card {
  position: relative;
  background: rgba(30, 30, 40, 0.95);
  border: 1px solid rgba(0, 245, 255, 0.3);
  border-radius: 16px;
  padding: 28px;
  width: 420px;
  max-width: 90vw;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5),
              0 0 0 1px rgba(0, 245, 255, 0.1) inset,
              0 0 30px rgba(0, 245, 255, 0.1);
  z-index: 1;
}

.guide-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.guide-header h3 {
  color: #00f5ff;
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.close-btn {
  width: 32px;
  height: 32px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.6);
  font-size: 20px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.guide-content {
  margin-bottom: 24px;
}

.guide-content p {
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
  line-height: 1.7;
  margin: 0;
}

.guide-progress {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-bottom: 24px;
}

.progress-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  transition: all 0.3s ease;
}

.progress-dot.active {
  background: #00f5ff;
  box-shadow: 0 0 10px rgba(0, 245, 255, 0.5);
  transform: scale(1.2);
}

.progress-dot.completed {
  background: rgba(0, 245, 255, 0.5);
}

.guide-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
}

.btn-primary {
  padding: 10px 24px;
  background: linear-gradient(135deg, #00f5ff 0%, #00c8ff 100%);
  border: none;
  border-radius: 8px;
  color: #000;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 15px rgba(0, 245, 255, 0.3);
}

.btn-secondary {
  padding: 10px 24px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
}

.guide-skip {
  text-align: center;
  margin-top: 16px;
}

.btn-text {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.4);
  font-size: 12px;
  cursor: pointer;
  transition: color 0.2s ease;
}

.btn-text:hover {
  color: rgba(255, 255, 255, 0.7);
}

/* 过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
