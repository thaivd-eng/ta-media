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
  <div class="app">
    <form class="form-login" @submit.prevent="register">
      <h1 class="text-2xl font-bold text-center">Đăng ký tài khoản</h1>
      <label class="form-control w-full">
        <div class="label">
          <span class="label-text">Họ và tên</span>
        </div>
        <input type="text" class="input input-bordered w-full" v-model="fullName" required />
      </label>
      <label class="form-control w-full">
        <div class="label">
          <span class="label-text">Số điện thoại</span>
        </div>
        <input type="text" class="input input-bordered w-full" v-model="phone" required />
      </label>
      <label class="form-control w-full">
        <div class="label">
          <span class="label-text">Email</span>
        </div>
        <input type="email" class="input input-bordered w-full" v-model="email" required />
      </label>
      <label class="form-control w-full">
        <div class="label">
          <span class="label-text">UserName</span>
        </div>
        <input type="text" class="input input-bordered w-full" v-model="userName" required />
      </label>
      <label class="form-control w-full">
        <div class="label">
          <span class="label-text">Mật khẩu</span>
        </div>
        <input type="password" class="input input-bordered w-full" v-model="password" required />
      </label>
      <div class="p-3"></div>
      <button type="submit" class="btn btn-primary">
        <span class="loading loading-spinner loading-xs" v-if="isLoading"></span>
        <span v-if="isLoading">Đang xử lý...</span>
        <span v-else>Đăng ký</span>
      </button>
    </form>
  </div>
</template>

<style scoped>
.app {
  @apply rounded border p-6 w-full min-h-screen flex justify-center items-center;
}

.form-login {
  @apply rounded border p-6 max-w-sm w-full flex flex-col gap-3 bg-base-100;
}
</style>
