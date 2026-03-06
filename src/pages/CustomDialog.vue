/** * @basecomponent BaseDialog * @desc 通用弹窗组件 * @props {title: string,
visible: boolean} * @emit onConfirm, onCancel */ //“Create a Vue3 component
using Composition API and TypeScript, with props, emits, and Element Plus
<template>
  <BaseDialog
    :visible="visible"
    :title="title"
    @close="handleCancel"
    @update:visible="
      (val) => {
        if (!val) handleCancel();
      }
    "
  >
    <div class="custom-dialog-content">
      <slot />
    </div>
    <template #footer>
      <el-button @click="handleCancel">取消</el-button>
      <el-button type="primary" @click="handleConfirm">确认</el-button>
    </template>
  </BaseDialog>
</template>
<script lang="ts" setup>
import { ref } from "vue";
import BaseDialog from "@/components/BaseDialog.vue";
const props = defineProps<{
  title: string;
  visible: boolean;
}>();
const emit = defineEmits<{
  (e: "confirm"): void;
  (e: "cancel"): void;
}>();
const visible = ref(props.visible);
function handleConfirm() {
  emit("confirm");
}
function handleCancel() {
  emit("cancel");
}
</script>
<style scoped>
.custom-dialog-content {
  margin-bottom: 20px;
}
</style>
