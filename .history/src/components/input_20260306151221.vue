<template>
<input type="text" v-model="text" @keyup.enter="addtag">
<span v-for="(tag,i) in tags" :key="i">
{{ tag }}
<button @click="deletetag(i)">x</button>
</span>

</template>
<script setup>
function debounce(delay){
    let timer=null
    function _d(){
        if(timer) clearTimeout(timer)
        timer = setTimeout(() => {
            
        }, delay);
    }
}
</script>