import { useDark, useToggle } from '@vueuse/core'

// 创建一个响应式的 isDark 变量，它会自动同步 <html> 元素的 'dark' 类
// 并且会根据用户操作系统的偏好（prefers-color-scheme）设置初始值
export const isDark = useDark()

// 创建一个切换函数，调用它即可在 true/false 之间切换 isDark 的值
export const toggleDark = useToggle(isDark)
