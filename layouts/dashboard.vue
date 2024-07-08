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
        <ul class="menu bg-base-200 text-base-content min-h-full w-80 p-4">
          <li><NuxtLink to="/">Dự án</NuxtLink></li>
          <li><NuxtLink to="/report">Báo cáo</NuxtLink></li>
          <li><NuxtLink to="#">Liên hệ</NuxtLink></li>
          <li><NuxtLink to="#">Đăng xuất</NuxtLink></li>
        </ul>
      </div>
    </div>
  </div>
</template>