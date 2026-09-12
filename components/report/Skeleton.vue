<template>
  <div class="max-w-7xl mx-auto p-4 sm:p-8 flex flex-col gap-6 w-full animate-pulse">
    <!-- Stat skeletons -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      <div v-for="item in 4" :key="item" class="p-6 rounded-2xl border border-slate-200/80 bg-white flex flex-col gap-4 shadow-xs">
        <div class="flex items-center justify-between">
          <div class="size-12 rounded-xl bg-slate-100"></div>
          <div class="w-12 h-4 bg-slate-100 rounded-md"></div>
        </div>
        <div class="space-y-2">
          <div class="w-16 h-8 bg-slate-200 rounded-lg"></div>
          <div class="w-24 h-4 bg-slate-100 rounded-md"></div>
        </div>
      </div>
    </div>

    <!-- Chart skeleton -->
    <div class="p-6 rounded-3xl border border-slate-200/80 bg-white shadow-xs h-96 flex flex-col gap-4">
      <div class="w-48 h-6 bg-slate-200 rounded-lg"></div>
      <div class="flex-1 bg-slate-100 rounded-2xl"></div>
    </div>
  </div>
</template>
