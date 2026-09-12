<template>
  <div class="drawer lg:drawer-open min-h-screen bg-slate-50">
    <input id="my-drawer" type="checkbox" class="drawer-toggle" />
    <div class="drawer-content flex flex-col min-h-screen bg-slate-50">
      <dashboard-nav-bar />
      <main class="flex-1 w-full overflow-y-auto">
        <slot></slot>
      </main>
    </div>

    <div class="drawer-side z-40">
      <label for="my-drawer" aria-label="close sidebar" class="drawer-overlay bg-slate-900/40 backdrop-blur-sm"></label>
      <dashboard-drawer />
    </div>
  </div>
</template>
