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
  <div class="app">
    <form class="form-login" @submit.prevent="requestPasswordReset"> <!-- Updated submit handler -->
      <h1 class="text-2xl font-bold text-center">Đặt lại mật khẩu</h1> <!-- Updated title -->
      <label class="form-control w-full">
        <div class="label">
          <span class="label-text">Tên đăng nhập (UserName)</span> <!-- Clarified label -->
        </div>
        <input type="text" class="input input-bordered w-full" v-model="userName" required />
      </label>
      
      <!-- Removed password input field -->
      
      <div class="p-3"></div>
      
      <!-- Removed login/register links as they are not relevant for reset password -->
      
      <button type="submit" class="btn btn-primary">
        <span class="loading loading-spinner loading-xs" v-if="isLoading"></span>
        <span v-if="isLoading">Đang xử lý...</span>
        <span v-else>Yêu cầu đặt lại mật khẩu</span> <!-- Updated button text -->
      </button>

      <nuxt-link to="/login" class="link link-secondary text-center mt-2">Quay lại Đăng nhập</nuxt-link>
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
