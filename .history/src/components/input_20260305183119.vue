<template>
<input type="text" v-model="text" @keyup.enter="addtag">
<span v-for="(tag,i) in tags" :key="i">
{{ tag }}
<button @click="deletetag(i)">x</button>
</span>

</template>
<script setup>
let text=ref('')
let tags = ref([])
const addtag=()=>{
    if(!text.value.trim()) return
    tags.value.push(text.value.trim())
    text.value=''
}
const deletetag = (index)=>{
    tags.value.splice(index,1)
}
</script>