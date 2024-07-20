<template>
  <div class="p-6 w-full h-screen flex flex-col gap-6 animate-pulse">
    <div class="flex flex-col gap-6 lg:flex-row">
      <div class="rounded border p-6 aspect-square w-full flex flex-col justify-center items-center gap-3 bg-base-300" v-for="item in 4">
        <div class="rounded-full size-12 bg-base-content/20"></div>
        <span class="text-4xl font-bold text-base-content/20">{{ item }}0</span>
        <div class="w-full h-4 bg-base-content/20"></div>
      </div>
    </div>

    <div class="rounded border p-6 w-full h-screen bg-base-300"></div>
  </div>
</template>
