<script setup>
const emits = defineEmits(['click']);

function onClick() {
  emits('click');
}
</script>

<template>
  <button @click="onClick" class="fixed right-6 bottom-6 shadow-lg rounded-full p-3 aspect-square bg-primary">
    <IconPlus />
  </button>
</template>