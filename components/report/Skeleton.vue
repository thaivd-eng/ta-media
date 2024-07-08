<template>
  <div class="p-6 w-full h-screen flex flex-col gap-6">
    <!-- fake stats -->
    <div class="flex flex-col gap-6 lg:flex-row">
      <div v-for="item in 4" class="rounded aspect-square w-full bg-base-200"></div>
    </div>

    <!-- fake chart -->
    <div class="rounded w-full h-full bg-base-200"></div>
  </div>
</template>