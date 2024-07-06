<script setup>
const title = computed(() => useRoute().meta.title);
</script>

<template>
  <div class="text-gray-700">
    <div class="drawer lg:drawer-open">
      <input id="my-drawer" type="checkbox" class="drawer-toggle" />
      <div class="drawer-content">
        <NavBar>
          <template #nav-leading>
            <div class="flex-none">
              <label for="my-drawer" class="btn btn-square btn-ghost lg:hidden">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                  class="inline-block h-5 w-5 stroke-current">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
                </svg>
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
        <ul class="menu bg-base-200 text-base-content min-h-full w-80 p-4">
          <li><NuxtLink to="#">Home</NuxtLink></li>
          <li><NuxtLink to="#">Report</NuxtLink></li>
          <li><NuxtLink to="#">About</NuxtLink></li>
          <li><NuxtLink to="#">Logout</NuxtLink></li>
        </ul>
      </div>
    </div>
  </div>
</template>