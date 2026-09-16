<script setup>
const route = useRoute();

const userCookie = useCookie('user');
const user = computed(() => {
  if (!userCookie.value) return null;
  if (typeof userCookie.value === 'string') {
    try {
      return JSON.parse(userCookie.value);
    } catch {
      return { userName: userCookie.value, fullName: userCookie.value, role: 'student' };
    }
  }
  return userCookie.value;
});

const userRole = computed(() => {
  if (!user.value) return 'student';
  if (user.value.role) return user.value.role;
  if (user.value.userName === 'admin' || user.value.userName === 'tr1nh') return 'admin';
  return 'student';
});

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
      <!-- Logo Header with Real MediaAI Logo from Assets -->
      <NuxtLink to="/projects" class="flex items-center gap-3 px-2 py-1 group">
        <div class="size-12 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-center p-1.5 transition-transform duration-300 group-hover:scale-105 shrink-0 overflow-hidden">
          <img src="~/assets/images/logo.webp" alt="MediaAI Logo" class="size-full object-contain" />
        </div>
        <div class="min-w-0 flex-1">
          <h1 class="text-base font-black text-slate-900 tracking-tight leading-none">LH MediaAI</h1>
          <p class="text-[10px] font-bold text-blue-600 mt-1 leading-tight line-clamp-1">
            Nền tảng sáng tạo số & Đánh giá AI
          </p>
        </div>
      </NuxtLink>

      <!-- Main Navigation (Đồng bộ cho tất cả tài khoản) -->
      <div class="flex flex-col gap-5">
        <!-- Section: Quản lý & Cuộc thi -->
        <div>
          <p class="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">Cuộc thi & Bình chọn</p>
          <div class="flex flex-col gap-1">
            <!-- Cuộc thi -->
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
              <span>Danh sách Cuộc thi</span>
              <span v-if="isActive('/projects')" class="ml-auto size-1.5 rounded-full bg-blue-600"></span>
            </NuxtLink>

            <!-- Cổng Sinh viên -->
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
              <span>Cổng Sinh viên</span>
              <span v-if="isActive('/student')" class="ml-auto size-1.5 rounded-full bg-blue-600"></span>
            </NuxtLink>

            <!-- Báo cáo & Thống kê -->
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
          </div>
        </div>

        <!-- Section: Thông tin & Hỗ trợ (Đồng bộ đầy đủ cho mọi tài khoản) -->
        <div>
          <p class="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">Thông tin & Hỗ trợ</p>
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
              <span>Thông tin</span>
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
  </aside>
</template>
