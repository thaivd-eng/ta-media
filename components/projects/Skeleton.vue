<template>
  <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 animate-pulse">
    <div v-for="i in 6" :key="i" class="rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-xs">
      <div class="w-full aspect-video bg-slate-200/70"></div>
      <div class="p-4 border-t border-slate-100 flex items-center justify-between">
        <div class="space-y-2 flex-1">
          <div class="h-4 bg-slate-200/80 rounded-md w-3/4"></div>
          <div class="h-3 bg-slate-100 rounded-md w-1/2"></div>
        </div>
        <div class="size-6 bg-slate-100 rounded-full"></div>
      </div>
    </div>
  </div>
</template>
