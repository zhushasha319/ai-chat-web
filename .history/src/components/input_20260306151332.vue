<template>
<input type="text" v-model="text" @keyup.enter="addtag">
<span v-for="(tag,i) in tags" :key="i">
{{ tag }}
<button @click="deletetag(i)">x</button>
</span>

</template>
<script setup>
function throttle(interval){
    let now=null
    function _t(){
        if(now)
    }
}
</script>