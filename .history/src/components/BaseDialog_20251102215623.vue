
<template>
  <el-dialog v-bind="$attrs" :model-value="visible" @close="close">
    <slot />
  </el-dialog>
</template>

<script setup lang="ts">
const props = defineProps<{ visible: boolean }>()
const emit = defineEmits(['update:visible', 'close'])
const close = () => emit('update:visible', false)
</script>
