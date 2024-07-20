<template>
  <div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 animate-pulse">
    <div v-for="i in 4" class="relative rounded w-full flex flex-col aspect-[4/3] overflow-hidden">
      <div class="w-full h-full bg-base-300"></div>
      <div class="absolute bottom-0 w-full h-12 bg-base-content/10"></div>
    </div>
  </div>
</template>
