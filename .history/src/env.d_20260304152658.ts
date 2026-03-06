/// <reference types="vite/client" />

// 引入 pinia-plugin-persistedstate 的类型扩展
import "pinia";
declare module "pinia" {
  export interface DefineStoreOptionsBase<S, Store> {
    persist?:
      | boolean
      | import("pinia-plugin-persistedstate").PersistedStateOptions;
  }
}

// vue-virtual-scroller 没有类型声明
declare module "vue-virtual-scroller" {
  import type { DefineComponent } from "vue";
  export const DynamicScroller: DefineComponent<any, any, any>;
  export const DynamicScrollerItem: DefineComponent<any, any, any>;
  export const RecycleScroller: DefineComponent<any, any, any>;
}

declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

// 处理某些编辑器/TS 服务没有正确解析 element-plus 类型的临时兜底声明
// 若语言服务正常可删除
declare module "element-plus" {
  export * from "element-plus/es";
}
