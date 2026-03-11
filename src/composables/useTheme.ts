import { ref, onMounted } from 'vue'

export type Theme = 'dark' | 'light' | 'system'

export function useTheme(onThemeChange?: (theme: 'dark' | 'light') => void) {
  const theme = ref<Theme>('dark')
  const systemTheme = ref<'dark' | 'light'>('dark')
  
  // 监听系统主题变化
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  
  const updateSystemTheme = () => {
    systemTheme.value = mediaQuery.matches ? 'dark' : 'light'
    if (theme.value === 'system') {
      applyTheme(systemTheme.value)
    }
  }
  
  // 应用主题
  const applyTheme = (newTheme: 'dark' | 'light') => {
    document.documentElement.setAttribute('data-theme', newTheme)
    
    // 更新 Canvas 背景色
    const canvas = document.querySelector('.dark-canvas') as HTMLCanvasElement
    if (canvas) {
      canvas.style.background = newTheme === 'dark' ? '#000000' : '#f5f5f5'
    }
    
    // 触发回调
    if (onThemeChange) {
      onThemeChange(newTheme)
    }
  }
  
  // 设置主题
  const setTheme = (newTheme: Theme) => {
    theme.value = newTheme
    localStorage.setItem('polygon-drawer-theme', newTheme)
    
    if (newTheme === 'system') {
      applyTheme(systemTheme.value)
    } else {
      applyTheme(newTheme)
    }
  }
  
  // 切换主题
  const toggleTheme = () => {
    const themes: Theme[] = ['dark', 'light', 'system']
    const currentIndex = themes.indexOf(theme.value)
    const nextIndex = (currentIndex + 1) % themes.length
    const nextTheme = themes[nextIndex]
    if (nextTheme) {
      setTheme(nextTheme)
    }
  }
  
  // 获取当前实际主题
  const getCurrentTheme = (): 'dark' | 'light' => {
    if (theme.value === 'system') {
      return systemTheme.value
    }
    return theme.value
  }
  
  // 初始化
  onMounted(() => {
    // 从 localStorage 读取主题设置
    const savedTheme = localStorage.getItem('polygon-drawer-theme') as Theme | null
    if (savedTheme && ['dark', 'light', 'system'].includes(savedTheme)) {
      theme.value = savedTheme
    }
    
    // 监听系统主题变化
    mediaQuery.addEventListener('change', updateSystemTheme)
    updateSystemTheme()
    
    // 应用初始主题
    if (theme.value === 'system') {
      applyTheme(systemTheme.value)
    } else {
      applyTheme(theme.value)
    }
  })
  
  return {
    theme,
    systemTheme,
    setTheme,
    toggleTheme,
    getCurrentTheme
  }
}
