<script setup>
import * as data from '~/utils/data-service';

const title = computed(() => {
  const route = useRoute();
  return route.meta.title || 'Tổng quan';
});

const userCookie = useCookie('user');
const user = computed(() => {
  if (!userCookie.value) return null;
  if (typeof userCookie.value === 'string') {
    try {
      return JSON.parse(userCookie.value);
    } catch {
      return null;
    }
  }
  return userCookie.value;
});

function signOut() {
  data.signOut();
}
</script>

<template>
  <header class="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-8 py-3 flex items-center justify-between">
    <div class="flex items-center gap-3">
      <!-- Mobile menu trigger -->
      <label for="my-drawer" class="btn btn-sm btn-circle btn-ghost lg:hidden text-slate-600 hover:bg-slate-100">
        <IconBarsStaggered class="size-5" />
      </label>

      <!-- Page Title -->
      <div>
        <h2 class="text-lg sm:text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
          {{ title }}
        </h2>
      </div>
    </div>

    <!-- Right section -->
    <div class="flex items-center gap-3">
      <!-- User Profile Dropdown -->
      <div class="dropdown dropdown-end">
        <div tabindex="0" role="button" class="flex items-center gap-3 p-1.5 pr-3 rounded-full hover:bg-slate-100 transition-all cursor-pointer border border-transparent hover:border-slate-200">
          <div class="size-9 rounded-full overflow-hidden bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-bold text-sm shadow-sm ring-2 ring-blue-500/20">
            <img
              v-if="user && user.avatarUrl"
              alt="avatar"
              :src="user.avatarUrl"
              class="w-full h-full object-cover" />
            <span v-else>{{ user && user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U' }}</span>
          </div>
          <div class="hidden md:flex flex-col text-left">
            <span class="text-xs font-bold text-slate-800 leading-tight">{{ user ? (user.fullName || user.userName) : 'Tài khoản' }}</span>
            <span class="text-[10px] font-semibold text-blue-600 flex items-center gap-1 mt-0.5">
              <span v-if="user?.role === 'judge'">⚖️ Giám khảo</span>
              <span v-else-if="user?.role === 'admin'">🛡️ Quản trị viên</span>
              <span v-else-if="user?.role === 'student'">🎓 Sinh viên {{ user?.studentId ? `(${user.studentId})` : '' }}</span>
              <span v-else>Thành viên</span>
            </span>
          </div>
        </div>

        <ul tabindex="0" class="dropdown-content menu bg-white rounded-2xl z-50 w-56 p-2 shadow-xl shadow-slate-900/10 border border-slate-200/80 mt-2">
          <li class="px-3 py-2 border-b border-slate-100 mb-1">
            <p class="text-xs font-semibold text-slate-800 p-0 m-0">{{ user ? (user.fullName || user.userName) : 'Tài khoản' }}</p>
            <p class="text-[11px] text-slate-400 p-0 m-0 truncate">{{ user ? user.email : '' }}</p>
          </li>
          <li>
            <NuxtLink to="/info" class="flex items-center gap-2 py-2 px-3 rounded-xl text-slate-700 hover:bg-blue-50 hover:text-blue-600 font-medium text-xs">
              <IconCircleInfo class="size-4" />
              <span>Thông tin tài khoản</span>
            </NuxtLink>
          </li>
          <li>
            <button @click="signOut" class="flex items-center gap-2 py-2 px-3 rounded-xl text-rose-600 hover:bg-rose-50 font-medium text-xs">
              <IconAngleLeft class="size-4 rotate-180" />
              <span>Đăng xuất</span>
            </button>
          </li>
        </ul>
      </div>
    </div>
  </header>
</template>
