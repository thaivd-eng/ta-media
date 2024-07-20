<template>
  <div class="drawer lg:drawer-open">
    <input id="my-drawer" type="checkbox" class="drawer-toggle" />
    <div class="drawer-content flex flex-col">
      <dashboard-nav-bar />
      <slot></slot>
    </div>

    <div class="drawer-side">
      <label for="my-drawer" aria-label="close sidebar" class="drawer-overlay"></label>
      <dashboard-drawer />
    </div>
  </div>
</template>
