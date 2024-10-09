<script setup>
onMounted(() => {
  updateActiveItem();
});

function updateActiveItem() {
  let route = useRoute();
  let path = route.path;

  document.querySelectorAll(".sidebar__item").forEach((item) => {
    let href = item.getAttribute("href");
    if (path != href) return;
    item.classList.add("sidebar__item--actived");
  });
}
</script>

<template>
  <div class="menu bg-primary text-primary-content min-h-full w-80 p-4 pt-0">
    <div class="sidebar hide-scrollbar">
      <div class="sidebar__header">
        <img src="~/assets/images/logo.webp" alt="logo" class="rounded size-8" />
        <h1 class="text-xl font-medium">Video Feedback</h1>
      </div>

      <div class="sidebar__items">
        <div class="sidebar__item--head">
          <span class="">Menu</span>
        </div>
        <NuxtLink class="sidebar__item" to="/projects">
          <div class="sidebar__icon"><IconCirclePlay /></div>
          <span class="sidebar__title">Dự án</span>
        </NuxtLink>
        <NuxtLink class="sidebar__item" to="/report">
          <div class="sidebar__icon"><IconChartPie /></div>
          <span class="sidebar__title">Báo cáo</span>
        </NuxtLink>
      </div>

      <div class="sidebar__items">
        <div class="sidebar__item--head">
          <span class="">Hỗ trợ</span>
        </div>
        <NuxtLink class="sidebar__item" to="/info">
          <div class="sidebar__icon"><IconCircleInfo /></div>
          <span class="sidebar__title">Thông tin</span>
        </NuxtLink>
        <NuxtLink class="sidebar__item" to="/contact">
          <div class="sidebar__icon"><IconAddressContact /></div>
          <span class="sidebar__title">Liên hệ</span>
        </NuxtLink>
        <NuxtLink class="sidebar__item" to="/faq">
          <div class="sidebar__icon"><IconCircleQuestion /></div>
          <span class="sidebar__title">FAQ</span>
        </NuxtLink>
        <NuxtLink class="sidebar__item" to="/issues">
          <div class="sidebar__icon"><IconBug /></div>
          <span class="sidebar__title">Vấn đề</span>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hide-scrollbar {
  -ms-overflow-style: none; /* IE and Edge */
  scrollbar-width: none; /* Firefox */
}
.hide-scrollbar::-webkit-scrollbar {
  display: none;
}

.sidebar__container {
  @apply fixed inset-0 z-20 shrink-0 w-full flex overflow-y-scroll lg:w-72;
}
.sidebar {
  @apply shrink-0 w-72 h-full bg-primary text-primary-content fill-primary-content overflow-y-scroll;
}
.sidebar__backdrop {
  @apply w-full h-full bg-black/50 lg:hidden;
}
.sidebar__header {
  @apply p-6 pt-4 flex items-center gap-3;
}
.sidebar__items {
  @apply p-4 flex flex-col;
}
.sidebar__item {
  @apply rounded flex items-center px-4 py-2 gap-2.5 cursor-pointer hover:bg-primary-content/20;
}
.sidebar__item--actived {
  @apply bg-primary-content/10;
}
.sidebar__item--head {
  @apply flex items-center p-4 gap-2.5;
}
.sidebar__item--head > span {
  @apply text-sm text-primary-content uppercase hover:bg-transparent;
}
.sidebar__icon {
  @apply size-6 flex justify-center items-center;
}
.sidebar__icon > svg {
  @apply h-5 fill-primary-content;
}
</style>
