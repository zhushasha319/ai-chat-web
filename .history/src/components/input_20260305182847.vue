<template>
<input type="text" v-bind="text" @keyup.enter="addtag">
<span v-for="(tag,i) in tags" :key="i">
{{ tag }}
<button>x</button>
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