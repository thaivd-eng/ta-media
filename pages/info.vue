<script setup>
definePageMeta({
  title: "Thông tin",
  layout: "dashboard",
});
</script>

<template>
  <div class="max-w-5xl mx-auto p-4 sm:p-8 flex flex-col gap-8">
    
    <!-- Header: Giao diện sáng, tinh tế, đồng bộ không dùng khung xanh to -->
    <div class="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-xs flex flex-col gap-3">
      <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-bold w-fit">
        <span class="size-2 rounded-full bg-blue-600"></span>
        <span>Dự án LH MediaAI</span>
      </div>

      <h1 class="text-xl sm:text-3xl font-black text-slate-900 tracking-tight leading-snug">
        LH MediaAI - Nền tảng tổ chức cuộc thi sáng tạo số tích hợp AI hỗ trợ đánh giá kỹ thuật video
      </h1>

      <p class="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-3xl">
        Nền tảng trực tuyến giúp số hóa toàn bộ quá trình tổ chức và vận hành các cuộc thi sáng tạo nội dung số, kết nối Ban Tổ chức, Thí sinh, Ban Giám khảo và Khán giả trong cùng một môi trường tập trung, minh bạch và hiệu quả.
      </p>

      <div class="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-100">
        <NuxtLink
          to="/projects"
          class="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm transition-all shadow-xs"
        >
          Khám phá Cuộc thi →
        </NuxtLink>
        <NuxtLink
          to="/student"
          class="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm transition-all"
        >
          Cổng Sinh viên
        </NuxtLink>
        <NuxtLink
          to="/report"
          class="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm transition-all"
        >
          Báo cáo & Thống kê
        </NuxtLink>
      </div>
    </div>

    <!-- 4 Nhóm người dùng trên hệ thống -->
    <div class="flex flex-col gap-3">
      <div>
        <h2 class="text-lg sm:text-xl font-black text-slate-900">Đối tượng phục vụ trong hệ thống</h2>
        <p class="text-xs sm:text-sm text-slate-500">Môi trường kết nối chặt chẽ giữa 4 nhóm người dùng trong cùng một nền tảng</p>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- 1. Ban Tổ chức -->
        <div class="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col gap-2">
          <div class="size-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl">
            🏛️
          </div>
          <h3 class="font-bold text-slate-800 text-sm">Ban Tổ chức</h3>
          <p class="text-xs text-slate-500 leading-relaxed">
            Khởi tạo cuộc thi, thiết lập thể lệ, tiêu chí đánh giá và theo dõi tiến độ tổng thể.
          </p>
        </div>

        <!-- 2. Thí sinh / Sinh viên -->
        <div class="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col gap-2">
          <div class="size-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl">
            🎓
          </div>
          <h3 class="font-bold text-slate-800 text-sm">Thí sinh / Sinh viên</h3>
          <p class="text-xs text-slate-500 leading-relaxed">
            Đăng ký dự thi, nộp video bài thi nhanh chóng, tự động lưu trữ và theo dõi điểm số.
          </p>
        </div>

        <!-- 3. Ban Giám khảo -->
        <div class="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col gap-2">
          <div class="size-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl">
            ⚖️
          </div>
          <h3 class="font-bold text-slate-800 text-sm">Ban Giám khảo</h3>
          <p class="text-xs text-slate-500 leading-relaxed">
            Xem tác phẩm trên trình phát chuyên dụng, chấm điểm theo bộ tiêu chí và nhận xét chi tiết.
          </p>
        </div>

        <!-- 4. Khán giả -->
        <div class="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col gap-2">
          <div class="size-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center text-xl">
            🌟
          </div>
          <h3 class="font-bold text-slate-800 text-sm">Khán giả & Cộng đồng</h3>
          <p class="text-xs text-slate-500 leading-relaxed">
            Theo dõi các tác phẩm sáng tạo và trực tiếp tham gia bình chọn giải thưởng yêu thích.
          </p>
        </div>
      </div>
    </div>

    <!-- Các Tính năng chính hiện có trên hệ thống -->
    <div class="flex flex-col gap-4">
      <div>
        <h2 class="text-lg sm:text-xl font-black text-slate-900">Các tính năng chính trên hệ thống LH MediaAI</h2>
        <p class="text-xs sm:text-sm text-slate-500">Các chức năng cốt lõi đang vận hành phục vụ việc tổ chức, dự thi và đánh giá</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
        <!-- Tính năng 1 -->
        <div class="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex gap-4">
          <div class="size-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-2xl shrink-0">
            📁
          </div>
          <div class="flex flex-col gap-1.5">
            <h3 class="font-bold text-slate-900 text-base">Quản lý cuộc thi & Thể lệ trực tuyến</h3>
            <p class="text-xs sm:text-sm text-slate-500 leading-relaxed">
              Tạo mới và công khai các cuộc thi sáng tạo số với đầy đủ mô tả thể lệ, mốc thời gian và danh mục bài dự thi. Hỗ trợ hiển thị trực quan và phân trang thông minh.
            </p>
          </div>
        </div>

        <!-- Tính năng 2 -->
        <div class="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex gap-4">
          <div class="size-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-2xl shrink-0">
            🎬
          </div>
          <div class="flex flex-col gap-1.5">
            <h3 class="font-bold text-slate-900 text-base">Cổng nộp bài thi & Tự động lưu Drive</h3>
            <p class="text-xs sm:text-sm text-slate-500 leading-relaxed">
              Thí sinh nộp tệp video trực tiếp từ máy tính. Hệ thống tự động trích xuất khung hình thumbnail và phân loại tệp video vào thư mục riêng của từng tài khoản trên Google Drive bảo mật.
            </p>
          </div>
        </div>

        <!-- Tính năng 3 -->
        <div class="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex gap-4">
          <div class="size-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-2xl shrink-0">
            📝
          </div>
          <div class="flex flex-col gap-1.5">
            <h3 class="font-bold text-slate-900 text-base">Không gian chấm điểm & Phản hồi theo timeline</h3>
            <p class="text-xs sm:text-sm text-slate-500 leading-relaxed">
              Giao diện xem video chuyên dụng cho Giám khảo, nhập điểm số theo từng tiêu chuẩn kỹ thuật/nghệ thuật và để lại nhận xét cụ thể gắn với mốc thời gian (timeline feedback) của video.
            </p>
          </div>
        </div>

        <!-- Tính năng 4 -->
        <div class="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex gap-4">
          <div class="size-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center text-2xl shrink-0">
            ❤️
          </div>
          <div class="flex flex-col gap-1.5">
            <h3 class="font-bold text-slate-900 text-base">Hệ thống bình chọn cộng đồng (Voting)</h3>
            <p class="text-xs sm:text-sm text-slate-500 leading-relaxed">
              Cho phép khán giả và người dùng tham gia bình chọn trực tiếp cho bài thi yêu thích. Số lượt bình chọn được cập nhật tức thì và độc lập với điểm chấm chuyên môn.
            </p>
          </div>
        </div>

        <!-- Tính năng 5 -->
        <div class="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex gap-4 md:col-span-2">
          <div class="size-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl shrink-0">
            📊
          </div>
          <div class="flex flex-col gap-1.5">
            <h3 class="font-bold text-slate-900 text-base">Báo cáo & Thống kê trực quan thời gian thực</h3>
            <p class="text-xs sm:text-sm text-slate-500 leading-relaxed">
              Trực quan hóa dữ liệu toàn bộ cuộc thi với biểu đồ phát triển bài thi theo từng tháng, bảng thống kê chi tiết lượt nộp, điểm số trung bình và xếp hạng các tác phẩm của từng cuộc thi.
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Nguyên tắc cốt lõi: Human-in-the-loop -->
    <div class="bg-slate-50 rounded-3xl p-6 sm:p-8 border border-slate-200/80 flex flex-col gap-3">
      <div class="flex items-center gap-2 text-indigo-700 font-black text-sm uppercase tracking-wide">
        <span>🤖</span>
        <span>Nguyên tắc cốt lõi: Human-in-the-loop</span>
      </div>
      <h3 class="text-base sm:text-lg font-bold text-slate-900">
        AI hỗ trợ phân tích dữ liệu tham khảo — Quyền quyết định thuộc về Ban Giám khảo
      </h3>
      <p class="text-xs sm:text-sm text-slate-600 leading-relaxed">
        Trong hệ thống LH MediaAI, công nghệ AI đóng vai trò như một <strong>trợ lý phân tích kỹ thuật</strong> hỗ trợ phát hiện các yếu tố khách quan trong video (như rung lắc, chuyển động khung hình, chất lượng hình ảnh). Mọi dữ liệu do AI gợi ý chỉ mang tính chất tham khảo; <strong>quyền đánh giá chuyên môn, chấm điểm và quyết định kết quả cuối cùng hoàn toàn thuộc về Ban Giám khảo và con người</strong>.
      </p>
    </div>

    <!-- Hỗ trợ & Liên hệ -->
    <div class="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
      <div>
        <h4 class="font-bold text-slate-800 text-sm">Bạn cần giải đáp hoặc hỗ trợ thêm thông tin?</h4>
        <p class="text-xs text-slate-500">Xem chuyên mục câu hỏi thường gặp hoặc gửi phản hồi trực tiếp cho ban quản trị.</p>
      </div>
      <div class="flex items-center gap-2.5 shrink-0">
        <NuxtLink
          to="/faq"
          class="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
        >
          Câu hỏi thường gặp
        </NuxtLink>
        <NuxtLink
          to="/contact"
          class="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors shadow-xs"
        >
          Liên hệ hỗ trợ
        </NuxtLink>
      </div>
    </div>

  </div>
</template>
