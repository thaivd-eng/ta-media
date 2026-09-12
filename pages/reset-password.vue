<script setup>
import Swal from 'sweetalert2';
import * as data from '~/utils/data-service'; // Assuming data-service has requestResetPassword

useHead({ title: 'Đặt lại mật khẩu' }); // Changed page title

const userName = ref('');
const isLoading = ref(false);

// Renamed and modified function for requesting password reset
async function requestPasswordReset() {
  if (isLoading.value) return;
  isLoading.value = true;

  try {
    await data.resetPassword(userName.value); // Call a new service function
    Swal.fire({
      icon: 'success',
      title: 'Thành công!',
      text: 'Yêu cầu đặt lại mật khẩu đã được gửi. Vui lòng kiểm tra email của bạn.',
    });
    userName.value = ''; // Clear username after successful request
  } catch (error) {
    Swal.fire({
      icon: 'error',
      title: 'Oops...',
      text: error || 'Đã có lỗi xảy ra khi gửi yêu cầu. Vui lòng thử lại.',
    });
  } finally {
    isLoading.value = false;
  }
}
</script>

<template>
  <div class="min-h-screen w-full bg-gradient-to-br from-blue-50 via-indigo-50/50 to-slate-100 flex items-center justify-center p-4 relative overflow-hidden">
    <!-- Decorative background elements -->
    <div class="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-blue-400/20 blur-3xl pointer-events-none"></div>
    <div class="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-indigo-500/15 blur-3xl pointer-events-none"></div>

    <div class="w-full max-w-md relative z-10 my-8">
      <!-- Main Card -->
      <div class="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl shadow-blue-900/10 border border-slate-200/80 p-8 sm:p-10">
        <!-- Brand Header -->
        <div class="text-center mb-8">
          <div class="size-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-600/30 p-2.5">
            <img src="~/assets/images/logo.webp" alt="logo" class="size-full object-contain filter brightness-0 invert" />
          </div>
          <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Quên mật khẩu
          </h1>
          <p class="text-slate-500 text-sm mt-1.5 font-medium">
            Nhập tên đăng nhập để nhận hướng dẫn khôi phục
          </p>
        </div>

        <!-- Reset Form -->
        <form @submit.prevent="requestPasswordReset" class="space-y-5">
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Tên đăng nhập (Username) <span class="text-rose-500">*</span>
            </label>
            <input
              type="text"
              v-model="userName"
              placeholder="Nhập username của bạn"
              class="w-full px-4 py-3 rounded-xl border border-slate-300 bg-slate-50/50 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all text-sm font-medium"
              required
            />
          </div>

          <div>
            <button
              type="submit"
              :disabled="isLoading"
              class="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm shadow-lg shadow-blue-500/25 hover:shadow-blue-500/35 transition-all duration-200 active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span v-if="isLoading" class="loading loading-spinner loading-sm"></span>
              <span>{{ isLoading ? 'Đang gửi yêu cầu...' : 'Gửi yêu cầu đặt lại mật khẩu' }}</span>
            </button>
          </div>
        </form>

        <!-- Footer Link -->
        <div class="mt-6 pt-6 border-t border-slate-100 text-center">
          <NuxtLink to="/login" class="text-blue-600 hover:text-blue-700 font-bold text-xs hover:underline inline-flex items-center gap-1.5">
            <IconAngleLeft class="size-3.5 fill-current" />
            <span>Quay lại trang Đăng nhập</span>
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>
