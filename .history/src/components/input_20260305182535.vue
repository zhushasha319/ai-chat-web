<template>
<input type="text">
<span>

</span>

</template>
<script>
let text=ref('')
let tags = ref([])
const addtag=()=>{
    if(!text) return
    tags.push(text)
}
const deletetag = (index)=>{
    tags.splice()
}
</script>