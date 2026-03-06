/**
 * @template vue3-component
 * @type modal
 * @basecomponent BaseDialog
 * @needs props, emits, v-model, lifecycle, expose
 * @note: only generate skeleton, no business logic
 
<script setup lang="ts">
const props = defineProps<{ visible: boolean; title?: string }>()
const emit = defineEmits(['update:visible', 'open', 'close', 'confirm'])
const close = () => {
  emit('update:visible', false)
  emit('close')
}
const open = () => {
  emit('update:visible', true)
  emit('open')
}
const confirm = () => {
  emit('confirm')
}
</script>

