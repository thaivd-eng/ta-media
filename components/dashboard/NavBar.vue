<script setup>
import * as data from '~/utils/data-service';

const title = computed(() => {
  const route = useRoute();
  return route.meta.title;
});

function signOut() {
  data.signOut();
}
</script>

<template>
  <div class="navbar bg-base-100">
    <div class="flex-none">
      <label for="my-drawer" class="btn btn-square btn-ghost lg:hidden">
        <icon-bars-staggered class="inline-block size-4 stroke-current" />
      </label>
    </div>

    <div class="flex-1">
      <a class="btn btn-ghost text-xl">{{ title }}</a>
    </div>

    <div class="flex-none">
      <div class="dropdown dropdown-end">
        <button tabindex="0" role="button" class="btn btn-square btn-ghost">
          <icon-ellipsis class="inline-block size-4 stroke-current" />
        </button>
        <ul tabindex="0" class="dropdown-content menu bg-base-100 rounded-box z-[1] w-52 p-2 shadow">
          <li><a>Tài khoản</a></li>
          <li><a @click="signOut">Đăng xuất</a></li>
        </ul>
      </div>
    </div>
  </div>
</template>
