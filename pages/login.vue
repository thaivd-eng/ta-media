<script setup>
import Swal from 'sweetalert2';
import * as data from '~/utils/data-service';

useHead({ title: 'Đăng nhập' });

const userName = ref('');
const password = ref('');
const isLoading = ref(false);
const router = useRouter();

function signIn() {
  if (isLoading.value) return;
  isLoading.value = true;

  data
    .signIn(userName.value, password.value)
    .then(res => router.push('/projects'))
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
    <form class="form-login" @submit.prevent="signIn">
      <h1 class="text-2xl font-bold text-center">Đăng nhập</h1>
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
      <div class="flex justify-between items-center">
        <nuxt-link to="/register" class="link link-secondary text-center">Chưa có tài khoản?</nuxt-link>
        <nuxt-link to="/reset-password" class="link link-secondary text-center">Quên mật khẩu</nuxt-link>
      </div>
      <button type="submit" class="btn btn-primary">
        <span class="loading loading-spinner loading-xs" v-if="isLoading"></span>
        <span v-if="isLoading">Đang xử lý...</span>
        <span v-else>Đăng nhập</span>
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
