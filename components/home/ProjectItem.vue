<script setup>
const props = defineProps({
  name: String,
  image: String,
  link: String
});
</script>

<template>
  <NuxtLink :to="props.link" class="rounded border w-full flex flex-col aspect-[4/3]">
    <div class="grow flex justify-center items-center bg-base-200">
      <IconCirclePlay class="size-12 fill-base-content" />
    </div>
    <span class="border-t p-3 bg-base-100">{{ props.name }}</span>
  </NuxtLink>
</template>