<script setup>
import Swal from 'sweetalert2';
import * as data from '~/utils/data-service';

useHead({ title: 'Đăng ký tài khoản' });

const userName = ref('');
const password = ref('');
const phone = ref('');
const email = ref('');
const fullName = ref('');
const isLoading = ref(false);
const router = useRouter();

function register() {
  if (isLoading.value) return;
  isLoading.value = true;

	let body = {
		userName: userName.value,
		password: password.value,
		phone: phone.value,
		email: email.value,
		avatarUrl: '',
		fullName: fullName.value,
		role: '',
		createdAt: new Date(),
		isDisabled: 0
	};

  data
    .register(body)
    .then(res => {
			Swal.fire({
        icon: 'success',
        title: 'Thành công',
        text: 'Đã đăng ký tài khoản thành công'
      });
			router.push('/login');
		})
    .catch(error => {
      Swal.fire({
        icon: 'error',
        title: 'Oops...',
        text: error
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

    <div class="w-full max-w-lg relative z-10 my-8">
      <!-- Main Card -->
      <div class="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl shadow-blue-900/10 border border-slate-200/80 p-8 sm:p-10">
        <!-- Brand Header -->
        <div class="text-center mb-8">
          <div class="size-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-600/30 p-2.5">
            <img src="~/assets/images/logo.webp" alt="logo" class="size-full object-contain filter brightness-0 invert" />
          </div>
          <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Tạo tài khoản mới
          </h1>
          <p class="text-slate-500 text-sm mt-1.5 font-medium">
            Đăng ký để tham gia và cộng tác phản hồi video
          </p>
        </div>

        <!-- Register Form -->
        <form @submit.prevent="register" class="space-y-4">
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Họ và tên <span class="text-rose-500">*</span>
            </label>
            <input
              type="text"
              v-model="fullName"
              placeholder="VD: Nguyễn Văn A"
              class="w-full px-4 py-3 rounded-xl border border-slate-300 bg-slate-50/50 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all text-sm font-medium"
              required
            />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Tên đăng nhập <span class="text-rose-500">*</span>
              </label>
              <input
                type="text"
                v-model="userName"
                placeholder="username"
                class="w-full px-4 py-3 rounded-xl border border-slate-300 bg-slate-50/50 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all text-sm font-medium"
                required
              />
            </div>

            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Số điện thoại
              </label>
              <input
                type="tel"
                v-model="phone"
                placeholder="0912 345 678"
                class="w-full px-4 py-3 rounded-xl border border-slate-300 bg-slate-50/50 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all text-sm font-medium"
                required
              />
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Địa chỉ Email <span class="text-rose-500">*</span>
            </label>
            <input
              type="email"
              v-model="email"
              placeholder="name@example.com"
              class="w-full px-4 py-3 rounded-xl border border-slate-300 bg-slate-50/50 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all text-sm font-medium"
              required
            />
          </div>

          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Mật khẩu <span class="text-rose-500">*</span>
            </label>
            <input
              type="password"
              v-model="password"
              placeholder="••••••••"
              class="w-full px-4 py-3 rounded-xl border border-slate-300 bg-slate-50/50 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all text-sm font-medium"
              required
            />
          </div>

          <div class="pt-2">
            <button
              type="submit"
              :disabled="isLoading"
              class="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm shadow-lg shadow-blue-500/25 hover:shadow-blue-500/35 transition-all duration-200 active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span v-if="isLoading" class="loading loading-spinner loading-sm"></span>
              <span>{{ isLoading ? 'Đang khởi tạo...' : 'Đăng ký tài khoản' }}</span>
            </button>
          </div>
        </form>

        <!-- Footer Link -->
        <div class="mt-6 pt-6 border-t border-slate-100 text-center">
          <p class="text-slate-500 text-xs font-medium">
            Đã có tài khoản?
            <NuxtLink to="/login" class="text-blue-600 hover:text-blue-700 font-bold hover:underline ml-1">
              Đăng nhập ngay
            </NuxtLink>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
