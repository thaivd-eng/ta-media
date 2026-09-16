<script setup>
import Swal from 'sweetalert2';
import * as data from '~/utils/data-service';

const emits = defineEmits(['createVersion']);

const store = useVideoStore();
const video = computed(() => store.video);
const versions = computed(() => store.versions || []);
const currentVersion = computed(() => store.currentVersion);
const currentVersionIndex = computed(() => {
  if (!versions.value || !currentVersion.value) return 0;
  return versions.value.findIndex(v => v.id == currentVersion.value.id);
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

function goBack() {
  useRouter().back();
}

function createVersion() {
  emits('createVersion');
}

function changeVersion(version) {
  store.setCurrentVersion(version);
}

function toggleDone() {
  if (!currentVersion.value) return;
  let newStatus = currentVersion.value.status == 1 ? 0 : 1;
  let newData = Object.assign({}, currentVersion.value, { status: newStatus });
  store.setCurrentVersion(newData);
  data.toggleDone(newData);

  Swal.fire({
    icon: newStatus === 1 ? 'success' : 'info',
    title: newStatus === 1 ? 'Đã đánh dấu hoàn thành' : 'Đã chuyển về trạng thái đang xử lý',
    timer: 1200,
    showConfirmButton: false,
  });
}

function removeVersion() {
  if (!currentVersion.value) return;
  Swal.fire({
    title: 'Xoá phiên bản này?',
    text: 'Bạn không thể hoàn tác hành động này!',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Xoá',
    cancelButtonText: 'Huỷ',
    confirmButtonColor: '#ef4444',
  }).then((result) => {
    if (result.isConfirmed) {
      store.removeVersion(currentVersion.value.id);
      Swal.fire({
        icon: 'success',
        title: 'Đã xóa phiên bản',
        timer: 1200,
        showConfirmButton: false,
      });
    }
  });
}
</script>

<template>
  <header class="bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4 sticky top-0 z-30">
    <!-- Left: Back button, Title, Version picker -->
    <div class="flex items-center gap-3 flex-1 min-w-0">
      <button
        class="size-9 rounded-xl bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 flex items-center justify-center transition-colors shrink-0"
        @click="goBack"
        title="Quay lại"
      >
        <IconAngleLeft class="size-5 fill-current" />
      </button>

      <div class="truncate">
        <h1 class="text-sm sm:text-base font-bold text-slate-800 truncate">
          {{ video ? video.name : 'Đang phát video...' }}
        </h1>
      </div>

      <!-- Version Picker Dropdown -->
      <div class="dropdown dropdown-bottom" v-if="currentVersion">
        <div
          tabindex="0"
          role="button"
          class="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-blue-200/60"
        >
          <span>v{{ currentVersionIndex >= 0 ? currentVersionIndex + 1 : 1 }}</span>
          <span class="text-[10px] text-blue-500">▼</span>
        </div>
        <ul tabindex="0" class="dropdown-content menu bg-white rounded-2xl z-50 w-48 p-2 shadow-xl shadow-slate-900/10 border border-slate-200/80 mt-1">
          <li class="menu-title text-[10px] uppercase font-bold text-slate-400 px-3 py-1">Danh sách phiên bản</li>
          <li v-for="(version, i) in versions" :key="version.id">
            <a
              @click="changeVersion(version)"
              :class="['text-xs font-semibold py-2 px-3 rounded-xl flex items-center justify-between', version.id === currentVersion.id ? 'bg-blue-50 text-blue-600' : 'text-slate-700 hover:bg-slate-50']"
            >
              <span>Phiên bản {{ i + 1 }}</span>
              <span v-if="version.status == 1" class="size-2 rounded-full bg-emerald-500"></span>
            </a>
          </li>
          <li class="border-t border-slate-100 mt-1 pt-1">
            <a @click="createVersion" class="text-xs font-semibold text-blue-600 hover:bg-blue-50 py-2 px-3 rounded-xl flex items-center gap-1.5">
              <IconPlus class="size-3.5 fill-current" />
              <span>Tải lên bản mới</span>
            </a>
          </li>
        </ul>
      </div>
    </div>

    <!-- Right: Actions & User Avatar -->
    <div class="flex items-center gap-2 sm:gap-3 shrink-0">
      <!-- Toggle Done Status -->
      <button
        v-if="currentVersion"
        @click="toggleDone"
        :class="[
          'px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border',
          currentVersion.status == 1
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
        ]"
        :title="currentVersion.status == 1 ? 'Bấm để hủy duyệt' : 'Bấm để duyệt hoàn thành'"
      >
        <IconCircleCheck :class="['size-4', currentVersion.status == 1 ? 'fill-emerald-600' : 'fill-slate-400']" />
        <span class="hidden sm:inline">{{ currentVersion.status == 1 ? 'Đã hoàn thành' : 'Đánh dấu duyệt' }}</span>
      </button>

      <!-- Delete Version -->
      <button
        v-if="currentVersion"
        class="size-9 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-colors"
        @click="removeVersion"
        title="Xoá phiên bản này"
      >
        <IconTrash class="size-4 fill-current" />
      </button>

      <!-- User Avatar Menu -->
      <div class="dropdown dropdown-end">
        <div tabindex="0" role="button" class="size-9 rounded-full overflow-hidden bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-bold text-xs ring-2 ring-blue-500/20 cursor-pointer">
          <img
            v-if="user && user.avatarUrl"
            alt="avatar"
            :src="user.avatarUrl"
            class="w-full h-full object-cover" />
          <span v-else>{{ user && user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U' }}</span>
        </div>
        <ul tabindex="0" class="dropdown-content menu bg-white rounded-2xl z-50 w-52 p-2 shadow-xl shadow-slate-900/10 border border-slate-200/80 mt-2">
          <li class="px-3 py-2 border-b border-slate-100 mb-1">
            <p class="text-xs font-semibold text-slate-800 p-0 m-0">{{ user ? (user.fullName || user.userName) : 'Tài khoản' }}</p>
            <p class="text-[11px] text-slate-400 p-0 m-0 truncate">{{ user ? user.email : '' }}</p>
          </li>
          <li>
            <NuxtLink to="/info" class="flex items-center gap-2 py-2 px-3 rounded-xl text-slate-700 hover:bg-blue-50 hover:text-blue-600 font-medium text-xs">
              <IconCircleInfo class="size-4" />
              <span>Thông tin</span>
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
