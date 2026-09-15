<script setup>
import Swal from 'sweetalert2';
import * as data from '~/utils/data-service';

useHead({ title: 'Đăng nhập - MediaAI' });

const userName = ref('');
const password = ref('');
const isLoading = ref(false);
const router = useRouter();

function signIn() {
  if (isLoading.value) return;
  isLoading.value = true;

  data
    .signIn(userName.value, password.value)
    .then((res) => {
      const role = res?.user?.role;
      if (role === 'student') {
        router.push('/student');
      } else {
        router.push('/projects');
      }
    })
    .catch(error => {
      Swal.fire({
        icon: 'error',
        title: 'Đăng nhập thất bại',
        text: error.message || error || 'Có lỗi xảy ra khi xác thực'
      });
      isLoading.value = false;
    });
}

</script>

<template>
  <div class="min-h-screen w-full bg-gradient-to-br from-blue-50 via-indigo-50/50 to-slate-100 flex items-center justify-center p-4 relative overflow-hidden">
    <!-- Decorative background elements -->
    <div class="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-blue-400/20 blur-3xl pointer-events-none"></div>
    <div class="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-indigo-500/15 blur-3xl pointer-events-none"></div>

    <div class="w-full max-w-md relative z-10">
      <!-- Main Card -->
      <div class="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl shadow-blue-900/10 border border-slate-200/80 p-8 sm:p-10">
        <!-- Brand Header -->
        <div class="text-center mb-8">
          <div class="size-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-600/30 p-2.5">
            <img src="~/assets/images/logo.webp" alt="logo" class="size-full object-contain filter brightness-0 invert" />
          </div>
          <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            MediaAI
          </h1>
          <p class="text-slate-500 text-sm mt-1.5 font-medium">
            Trợ lý Giám định & Đánh giá Tiêu chuẩn Kỹ thuật Nội dung Số
          </p>
        </div>

        <!-- Login Form -->
        <form @submit.prevent="signIn" class="space-y-4">
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Tên tài khoản
            </label>
            <div class="relative">
              <input
                type="text"
                v-model="userName"
                placeholder="Nhập tên đăng nhập"
                class="w-full px-4 py-3 rounded-xl border border-slate-300 bg-slate-50/50 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all text-sm font-medium"
                required />
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Mật khẩu
            </label>
            <div class="relative">
              <input
                type="password"
                v-model="password"
                placeholder="••••••••"
                class="w-full px-4 py-3 rounded-xl border border-slate-300 bg-slate-50/50 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all text-sm font-medium"
                required />
            </div>
          </div>

          <div class="flex items-center justify-between text-xs pt-1">
            <NuxtLink to="/register" class="text-blue-600 hover:text-blue-700 font-semibold transition-colors">
              Chưa có tài khoản?
            </NuxtLink>
            <NuxtLink to="/reset-password" class="text-slate-500 hover:text-slate-700 font-medium transition-colors">
              Quên mật khẩu?
            </NuxtLink>
          </div>

          <div class="pt-2">
            <button
              type="submit"
              :disabled="isLoading"
              class="w-full py-3.5 px-4 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-600/30 active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer">
              <span class="loading loading-spinner loading-sm" v-if="isLoading"></span>
              <span>{{ isLoading ? 'Đang xử lý...' : 'Đăng nhập' }}</span>
            </button>
          </div>
        </form>

      </div>

      <!-- Footer Note -->
      <p class="text-center text-xs text-slate-500 mt-6 font-medium">
        © {{ new Date().getFullYear() }} MediaAI – Trợ lý Giám định & Đánh giá Tiêu chuẩn Kỹ thuật Nội dung Số.
      </p>
    </div>
  </div>
</template>
