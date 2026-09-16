<script setup>
import swal from "sweetalert2";

definePageMeta({
  title: "Liên hệ",
  layout: "dashboard",
});

const form = ref({
  name: "",
  email: "",
  topic: "Hỗ trợ nộp bài dự thi",
  message: "",
});

const isSending = ref(false);

function handleSubmit() {
  if (!form.value.name.trim() || !form.value.email.trim() || !form.value.message.trim()) {
    swal.fire({
      icon: "warning",
      title: "Thiếu thông tin",
      text: "Vui lòng nhập đầy đủ họ tên, email và nội dung cần hỗ trợ.",
    });
    return;
  }

  isSending.value = true;
  setTimeout(() => {
    isSending.value = false;
    swal.fire({
      icon: "success",
      title: "Gửi tin nhắn thành công!",
      text: "Cảm ơn bạn đã liên hệ. Ban quản trị LH MediaAI sẽ phản hồi sớm nhất qua email của bạn.",
      confirmButtonColor: "#2563eb",
      confirmButtonText: "Đóng",
    });
    form.value.name = "";
    form.value.email = "";
    form.value.message = "";
  }, 800);
}
</script>

<template>
  <div class="max-w-5xl mx-auto p-4 sm:p-8 flex flex-col gap-6">
    
    <!-- Header: Giao diện sáng, tinh tế, không dùng khung xanh to -->
    <div class="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-xs flex flex-col gap-2">
      <div class="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-wider">
        <span>📬</span>
        <span>Hỗ trợ người dùng</span>
      </div>
      <h1 class="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Liên hệ với chúng tôi</h1>
      <p class="text-xs sm:text-sm text-slate-500 leading-relaxed">
        Ban quản trị nền tảng LH MediaAI luôn sẵn sàng giải đáp thắc mắc, tiếp nhận góp ý và hỗ trợ kỹ thuật cho thí sinh, ban giám khảo và ban tổ chức.
      </p>
    </div>

    <!-- Main Grid: Info + Form -->
    <div class="grid grid-cols-1 lg:grid-cols-5 gap-6">
      
      <!-- Cột trái: Thông tin liên lạc (2 cột trên 5) -->
      <div class="lg:col-span-2 flex flex-col gap-4">
        <!-- Email -->
        <div class="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-start gap-4 hover:border-blue-200 transition-colors">
          <div class="size-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl shrink-0">
            ✉️
          </div>
          <div class="min-w-0">
            <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider">Email hỗ trợ</h3>
            <a href="mailto:lhub304@gmail.com" class="text-sm font-bold text-slate-800 hover:text-blue-600 transition-colors block truncate mt-0.5">
              lhub304@gmail.com
            </a>
            <p class="text-[11px] text-slate-400 mt-0.5">Phản hồi trong vòng 24h làm việc</p>
          </div>
        </div>

        <!-- Điện thoại -->
        <div class="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-start gap-4 hover:border-blue-200 transition-colors">
          <div class="size-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl shrink-0">
            📞
          </div>
          <div class="min-w-0">
            <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider">Hotline kỹ thuật</h3>
            <a href="tel:0564218927" class="text-sm font-bold text-slate-800 hover:text-emerald-600 transition-colors block mt-0.5">
              0564.218.927
            </a>
            <p class="text-[11px] text-slate-400 mt-0.5">Thứ 2 - Thứ 7 (07:30 - 17:00)</p>
          </div>
        </div>

        <!-- Địa chỉ -->
        <div class="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-start gap-4 hover:border-blue-200 transition-colors">
          <div class="size-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl shrink-0">
            📍
          </div>
          <div class="min-w-0">
            <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider">Địa chỉ</h3>
            <p class="text-xs sm:text-sm font-semibold text-slate-800 mt-0.5 leading-relaxed">
              Số 10, Huỳnh Văn Nghệ, Bửu Long, TP. Biên Hòa, Đồng Nai
            </p>
            <p class="text-[11px] text-slate-400 mt-0.5">Trường Đại học Lạc Hồng (LHU)</p>
          </div>
        </div>

        <!-- Fanpage -->
        <div class="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-start gap-4 hover:border-blue-200 transition-colors">
          <div class="size-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl shrink-0">
            🌐
          </div>
          <div class="min-w-0">
            <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider">Kênh Facebook</h3>
            <a href="https://www.facebook.com/lhub304" target="_blank" rel="noopener" class="text-sm font-bold text-blue-600 hover:underline block truncate mt-0.5">
              facebook.com/lhub304
            </a>
            <p class="text-[11px] text-slate-400 mt-0.5">Cập nhật tin tức cuộc thi mới nhất</p>
          </div>
        </div>
      </div>

      <!-- Cột phải: Form gửi yêu cầu (3 cột trên 5) -->
      <div class="lg:col-span-3 bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-xs flex flex-col gap-4">
        <div>
          <h2 class="text-base sm:text-lg font-bold text-slate-900">Gửi tin nhắn trực tiếp</h2>
          <p class="text-xs text-slate-500 mt-0.5">Điền thông tin vào mẫu bên dưới, chúng tôi sẽ phản hồi sớm nhất có thể.</p>
        </div>

        <form class="space-y-4" @submit.prevent="handleSubmit">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Họ và tên <span class="text-rose-500">*</span>
              </label>
              <input
                type="text"
                v-model="form.name"
                placeholder="Ví dụ: Nguyễn Văn A"
                class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                required
              />
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Địa chỉ Email <span class="text-rose-500">*</span>
              </label>
              <input
                type="email"
                v-model="form.email"
                placeholder="email@vidu.com"
                class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                required
              />
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Chủ đề cần hỗ trợ
            </label>
            <select
              v-model="form.topic"
              class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all cursor-pointer font-medium"
            >
              <option value="Hỗ trợ nộp bài dự thi">Hỗ trợ nộp bài dự thi & tải video</option>
              <option value="Tài khoản & Đăng nhập">Tài khoản & Đăng nhập</option>
              <option value="Bình chọn & Điểm số">Bình chọn & Đánh giá điểm số</option>
              <option value="Hợp tác tổ chức cuộc thi">Hợp tác & Đăng cai tổ chức cuộc thi</option>
              <option value="Góp ý phát triển">Góp ý & Báo lỗi hệ thống</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Nội dung tin nhắn <span class="text-rose-500">*</span>
            </label>
            <textarea
              v-model="form.message"
              rows="4"
              placeholder="Nhập chi tiết thắc mắc hoặc nội dung bạn cần hỗ trợ..."
              class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all resize-none"
              required
            ></textarea>
          </div>

          <div class="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100">
            <p class="text-[11px] text-slate-400">
              🔒 Cam kết bảo mật thông tin cá nhân người gửi.
            </p>
            <button
              type="submit"
              :disabled="isSending"
              class="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span v-if="isSending" class="loading loading-spinner loading-xs"></span>
              <span>{{ isSending ? 'Đang gửi...' : 'Gửi tin nhắn' }}</span>
              <span v-if="!isSending">→</span>
            </button>
          </div>
        </form>
      </div>

    </div>

  </div>
</template>
