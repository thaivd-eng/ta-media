<script setup>
const title = computed(() => useRoute().meta.title);
</script>

<template>
  <div>
    <div class="drawer lg:drawer-open">
      <input id="my-drawer" type="checkbox" class="drawer-toggle" />
      <div class="drawer-content h-screen overflow-y-scroll">
        <NavBar>
          <template #nav-leading>
            <div class="flex-none">
              <label for="my-drawer" class="btn btn-square btn-ghost lg:hidden">
                <IconBars class="inline-block h-5 w-5 stroke-current" />
              </label>
            </div>
            <div class="flex-1">
              <a class="btn btn-ghost text-xl">{{ title }}</a>
            </div>
          </template>
        </NavBar>

        <slot></slot>
      </div>

      <div class="drawer-side">
        <label for="my-drawer" aria-label="close sidebar" class="drawer-overlay"></label>
        <dashboard-drawer />
      </div>
    </div>
  </div>
</template>