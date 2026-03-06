/**
 * 防抖节流工具 - 直接导出 lodash-es 的实现
 * 
 * 使用 lodash-es 而非自定义实现的原因：
 * 1. 经过大量生产环境验证，稳定可靠
 * 2. 支持更多配置选项（leading/trailing/maxWait）
 * 3. 类型定义完善，TypeScript 友好
 * 4. tree-shaking 友好，只打包用到的函数
 */

export { debounce, throttle } from 'lodash-es'

// 类型重新导出，方便使用
export type { DebouncedFunc, ThrottleSettings, DebounceSettings } from 'lodash-es'
