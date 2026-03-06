<template>
<input type="text">
<span>

</span>

</template>
<script>
let text=ref('')
let tags = ref([])
const addtag=()=>{
    tags.push(text)
}
</script>