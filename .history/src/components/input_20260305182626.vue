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
    tags.value.push(text)
    text.value=''
}
const deletetag = (index)=>{
    tags.value.splice(index,1)
}
</script>