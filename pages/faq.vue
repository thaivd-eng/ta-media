<script setup>
definePageMeta({
  title: "Câu hỏi thường gặp",
  layout: "dashboard",
});

const searchQuery = ref("");
const selectedCategory = ref("all");

const categories = [
  { id: "all", label: "Tất cả câu hỏi" },
  { id: "submit", label: "Nộp bài dự thi" },
  { id: "scoring", label: "Đánh giá & AI" },
  { id: "voting", label: "Bình chọn cộng đồng" },
];

const faqs = [
  {
    category: "submit",
    question: "Làm thế nào để nộp video dự thi trên LH MediaAI?",
    answer: "Bạn chỉ cần đăng nhập tài khoản, vào mục 'Cổng sinh viên' hoặc chọn cuộc thi đang mở từ 'Danh sách Cuộc thi', nhấn nút 'Nộp bài dự thi', chọn tệp video từ máy tính và điền thông tin tác phẩm. Hệ thống sẽ tự động trích xuất ảnh bìa và tải video lên thư mục riêng của bạn trên Google Drive.",
  },
  {
    category: "submit",
    question: "Hệ thống hỗ trợ những định dạng video nào và dung lượng bao nhiêu?",
    answer: "LH MediaAI hỗ trợ các định dạng video chuẩn bao gồm MP4, WEBM, MOV và MKV. Dung lượng khuyến nghị cho mỗi bài thi là dưới 35MB để đảm bảo tốc độ tải lên nhanh chóng, ổn định và phát mượt mà trên nền tảng.",
  },
  {
    category: "scoring",
    question: "Công nghệ AI trong hệ thống có thay thế Ban Giám khảo chấm điểm không?",
    answer: "Hoàn toàn không. Theo nguyên tắc Human-in-the-loop, AI chỉ đóng vai trò như một trợ lý phân tích kỹ thuật (chất lượng hình ảnh, độ phân giải, âm thanh, bố cục khung hình) nhằm cung cấp dữ liệu tham khảo khách quan. Quyền chấm điểm chuyên môn và quyết định kết quả cuối cùng 100% thuộc về Ban Giám khảo và Ban Tổ chức.",
  },
  {
    category: "voting",
    question: "Quy chế bình chọn cộng đồng (Voting) hoạt động như thế nào?",
    answer: "Khán giả và sinh viên có thể xem trực tiếp video tại mục 'Bình chọn cho bạn bè' và nhấn biểu tượng trái tim để bình chọn cho tác phẩm yêu thích. Lượt bình chọn được cập nhật theo thời gian thực và được tính độc lập cho hạng mục giải thưởng Cộng đồng, không làm ảnh hưởng đến điểm chuyên môn của Ban Giám khảo.",
  },
  {
    category: "scoring",
    question: "Tôi có thể xem lại điểm số và nhận xét bài thi của mình ở đâu?",
    answer: "Bạn hãy vào mục 'Cổng sinh viên' > tab 'Bài dự thi của tôi', tìm đến tác phẩm và bấm nút 'Xem chi tiết'. Tại đây, bạn sẽ thấy điểm số trung bình, số lượt bình chọn cũng như nhận xét chi tiết gắn với từng mốc thời gian (timeline feedback) từ Ban Giám khảo.",
  },
  {
    category: "submit",
    question: "Video của tôi được lưu trữ ở đâu và có bảo mật không?",
    answer: "Tất cả bài thi được lưu trữ tự động trên dịch vụ đám mây Google Drive của hệ thống, được phân loại chặt chẽ theo thư mục cuộc thi và thư mục riêng của từng tài khoản người nộp. Dữ liệu được bảo mật an toàn và lưu trữ xuyên suốt quá trình diễn ra cuộc thi.",
  },
];

const filteredFaqs = computed(() => {
  return faqs.filter((item) => {
    const matchCat = selectedCategory.value === "all" || item.category === selectedCategory.value;
    const query = searchQuery.value.trim().toLowerCase();
    const matchQuery = !query || item.question.toLowerCase().includes(query) || item.answer.toLowerCase().includes(query);
    return matchCat && matchQuery;
  });
});
</script>

<template>
  <div class="max-w-4xl mx-auto p-4 sm:p-8 flex flex-col gap-6">
    
    <!-- Header: Giao diện sáng sủa, không dùng khung xanh to -->
    <div class="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-xs flex flex-col gap-2">
      <div class="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-wider">
        <span>❓</span>
        <span>Hỗ trợ & Hướng dẫn</span>
      </div>
      <h1 class="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Câu hỏi thường gặp (FAQ)</h1>
      <p class="text-xs sm:text-sm text-slate-500 leading-relaxed">
        Giải đáp chi tiết các thắc mắc phổ biến về quy trình nộp bài, lưu trữ Drive, đánh giá kỹ thuật và bình chọn trên nền tảng LH MediaAI.
      </p>

      <!-- Search Box -->
      <div class="mt-3 relative">
        <input
          type="text"
          v-model="searchQuery"
          placeholder="Tìm kiếm câu hỏi hoặc từ khóa..."
          class="w-full px-4 py-2.5 pl-10 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
        />
        <svg class="size-4 text-slate-400 absolute left-3.5 top-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
      </div>

      <!-- Filter Categories -->
      <div class="flex flex-wrap gap-2 pt-2">
        <button
          v-for="cat in categories"
          :key="cat.id"
          type="button"
          @click="selectedCategory = cat.id"
          :class="[
            'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer',
            selectedCategory === cat.id
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          ]"
        >
          {{ cat.label }}
        </button>
      </div>
    </div>

    <!-- Accordion List -->
    <div v-if="filteredFaqs.length > 0" class="flex flex-col gap-3">
      <div
        v-for="(item, idx) in filteredFaqs"
        :key="idx"
        class="collapse collapse-plus bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:border-blue-200 transition-colors"
      >
        <input type="radio" name="faq-accordion" :checked="idx === 0" />
        <div class="collapse-title text-sm sm:text-base font-bold text-slate-900 pr-12">
          {{ item.question }}
        </div>
        <div class="collapse-content text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100">
          <p class="pt-3">{{ item.answer }}</p>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="bg-white rounded-2xl p-12 text-center border border-slate-200/80 flex flex-col items-center gap-2">
      <div class="size-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-xl">
        🔍
      </div>
      <p class="text-sm font-bold text-slate-800">Không tìm thấy câu hỏi phù hợp</p>
      <p class="text-xs text-slate-500">Vui lòng thử tìm kiếm bằng từ khóa khác hoặc liên hệ bộ phận hỗ trợ.</p>
    </div>

    <!-- Bottom Contact Notice -->
    <div class="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <span class="text-xl">💬</span>
        <p class="text-xs sm:text-sm text-slate-600">Bạn vẫn chưa tìm thấy câu trả lời cần thiết?</p>
      </div>
      <NuxtLink
        to="/contact"
        class="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs shrink-0"
      >
        Liên hệ hỗ trợ ngay →
      </NuxtLink>
    </div>

  </div>
</template>
