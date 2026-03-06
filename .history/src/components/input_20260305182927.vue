<template>
<input type="text" v-bind="text" @keyup.enter="addtag">
<span v-for="(tag,i) in tags" :key="i">
{{ tag }}
<button @click="deletetag(i)">x</button>
</span>

</template>
<script>
let text=ref('')
let tags = ref([])
const addtag=()=>{
    if(!text.value.trim()) return
    tags.value.push(text.value.tr)
    text.value=''
}
const deletetag = (index)=>{
    tags.value.splice(index,1)
}
</script>