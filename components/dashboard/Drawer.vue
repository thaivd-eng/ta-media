<script setup>
const route = useRoute();

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

const isStudent = computed(() => user.value?.role === 'student');

const isActive = (path) => {
  if (path === '/projects') {
    return route.path === '/projects' || route.path.startsWith('/project');
  }
  return route.path === path;
};
</script>

<template>
  <aside class="w-72 min-h-full bg-white border-r border-slate-200/80 flex flex-col justify-between select-none shadow-sm">
    <div class="p-5 flex flex-col gap-6">
      <!-- Logo Header -->
      <NuxtLink :to="isStudent ? '/student' : '/projects'" class="flex items-center gap-3 px-2 py-1 group">
        <div class="size-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/25 p-2 transition-transform duration-300 group-hover:scale-105">
          <img src="~/assets/images/logo.webp" alt="logo" class="size-full object-contain filter brightness-0 invert" />
        </div>
        <div class="min-w-0 flex-1">
          <h1 class="text-lg font-extrabold text-slate-900 tracking-tight leading-none">MediaAI</h1>
          <p class="text-[10px] font-semibold text-blue-600 mt-1 leading-tight line-clamp-2">
            Trợ lý Giám định & Đánh giá Tiêu chuẩn Kỹ thuật Nội dung Số
          </p>
        </div>
      </NuxtLink>

      <!-- Main Navigation -->
      <div class="flex flex-col gap-5">
        <!-- ============================================ -->
        <!-- MENU DÀNH CHO SINH VIÊN -->
        <!-- ============================================ -->
        <div v-if="isStudent">
          <p class="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">Cổng Sinh Viên</p>
          <div class="flex flex-col gap-1">
            <!-- Student Portal -->
            <NuxtLink
              to="/student"
              :class="[
                'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                isActive('/student')
                  ? 'bg-blue-50 text-blue-600 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-blue-600 hover:bg-slate-50'
              ]"
            >
              <div class="size-5 flex items-center justify-center text-base">
                🎓
              </div>
              <span>Trang sinh viên</span>
              <span v-if="isActive('/student')" class="ml-auto size-1.5 rounded-full bg-blue-600"></span>
            </NuxtLink>

            <!-- Contests -->
            <NuxtLink
              to="/projects"
              :class="[
                'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                isActive('/projects')
                  ? 'bg-blue-50 text-blue-600 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-blue-600 hover:bg-slate-50'
              ]"
            >
              <div :class="['size-5 flex items-center justify-center transition-colors', isActive('/projects') ? 'text-blue-600' : 'text-slate-400']">
                <IconCirclePlay class="size-5 fill-current" />
              </div>
              <span>Các Cuộc thi</span>
              <span v-if="isActive('/projects')" class="ml-auto size-1.5 rounded-full bg-blue-600"></span>
            </NuxtLink>
          </div>
        </div>

        <!-- ============================================ -->
        <!-- MENU DÀNH CHO ADMIN & GIÁM KHẢO -->
        <!-- ============================================ -->
        <div v-else>
          <p class="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">Hệ thống Quản trị</p>
          <div class="flex flex-col gap-1">
            <NuxtLink
              to="/projects"
              :class="[
                'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                isActive('/projects')
                  ? 'bg-blue-50 text-blue-600 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-blue-600 hover:bg-slate-50'
              ]"
            >
              <div :class="['size-5 flex items-center justify-center transition-colors', isActive('/projects') ? 'text-blue-600' : 'text-slate-400 group-hover:text-blue-600']">
                <IconCirclePlay class="size-5 fill-current" />
              </div>
              <span>Quản lý Cuộc thi</span>
              <span v-if="isActive('/projects')" class="ml-auto size-1.5 rounded-full bg-blue-600"></span>
            </NuxtLink>

            <NuxtLink
              to="/report"
              :class="[
                'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                isActive('/report')
                  ? 'bg-blue-50 text-blue-600 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-blue-600 hover:bg-slate-50'
              ]"
            >
              <div :class="['size-5 flex items-center justify-center transition-colors', isActive('/report') ? 'text-blue-600' : 'text-slate-400']">
                <IconChartPie class="size-5 fill-current" />
              </div>
              <span>Báo cáo & Thống kê</span>
              <span v-if="isActive('/report')" class="ml-auto size-1.5 rounded-full bg-blue-600"></span>
            </NuxtLink>

            <NuxtLink
              to="/student"
              :class="[
                'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                isActive('/student')
                  ? 'bg-blue-50 text-blue-600 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-blue-600 hover:bg-slate-50'
              ]"
            >
              <div class="size-5 flex items-center justify-center text-base">
                🎓
              </div>
              <span>Xem Cổng Sinh viên</span>
              <span v-if="isActive('/student')" class="ml-auto size-1.5 rounded-full bg-blue-600"></span>
            </NuxtLink>
          </div>
        </div>

        <!-- Section Hỗ trợ chung -->
        <div>
          <p class="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">Tài khoản & Hỗ trợ</p>
          <div class="flex flex-col gap-1">
            <NuxtLink
              to="/info"
              :class="[
                'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                isActive('/info')
                  ? 'bg-blue-50 text-blue-600 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-blue-600 hover:bg-slate-50'
              ]"
            >
              <div :class="['size-5 flex items-center justify-center transition-colors', isActive('/info') ? 'text-blue-600' : 'text-slate-400']">
                <IconCircleInfo class="size-5 fill-current" />
              </div>
              <span>Thông tin tài khoản</span>
            </NuxtLink>

            <NuxtLink
              to="/faq"
              :class="[
                'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                isActive('/faq')
                  ? 'bg-blue-50 text-blue-600 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-blue-600 hover:bg-slate-50'
              ]"
            >
              <div :class="['size-5 flex items-center justify-center transition-colors', isActive('/faq') ? 'text-blue-600' : 'text-slate-400']">
                <IconCircleQuestion class="size-5 fill-current" />
              </div>
              <span>Câu hỏi thường gặp</span>
            </NuxtLink>

            <NuxtLink
              to="/contact"
              :class="[
                'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                isActive('/contact')
                  ? 'bg-blue-50 text-blue-600 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-blue-600 hover:bg-slate-50'
              ]"
            >
              <div :class="['size-5 flex items-center justify-center transition-colors', isActive('/contact') ? 'text-blue-600' : 'text-slate-400']">
                <IconAddressContact class="size-5 fill-current" />
              </div>
              <span>Liên hệ hỗ trợ</span>
            </NuxtLink>

            <NuxtLink
              v-if="!isStudent"
              to="/issues"
              :class="[
                'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                isActive('/issues')
                  ? 'bg-blue-50 text-blue-600 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-blue-600 hover:bg-slate-50'
              ]"
            >
              <div :class="['size-5 flex items-center justify-center transition-colors', isActive('/issues') ? 'text-blue-600' : 'text-slate-400']">
                <IconBug class="size-5 fill-current" />
              </div>
              <span>Báo cáo vấn đề</span>
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>

    <!-- Sidebar Footer -->
    <div class="p-4 border-t border-slate-100 bg-slate-50/50">
      <div class="flex items-center gap-2 px-3 py-2 text-xs text-slate-500 font-medium">
        <span class="size-2 rounded-full bg-emerald-500 animate-pulse"></span>
        <span v-if="isStudent">Cổng sinh viên trực tuyến</span>
        <span v-else>Hệ thống hoạt động ổn định</span>
      </div>
    </div>
  </aside>
</template>
