<script setup>
import * as data from "~/utils/contact-data";

definePageMeta({
  title: "FAQ",
  layout: "dashboard",
});

const isLoading = ref(true);
const faq = ref([]);

onBeforeMount(async () => {
  faq.value = await data.findFAQ();
  isLoading.value = false;
});
</script>

<template>
  <div class="max-w-4xl mx-auto p-4 sm:p-8 flex flex-col gap-6">
    <div class="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
      <h1 class="text-xl font-extrabold text-slate-900 tracking-tight">Câu hỏi thường gặp</h1>
      <p class="text-xs sm:text-sm text-slate-500 mt-1">Giải đáp các thắc mắc phổ biến trong quá trình sử dụng hệ thống phản hồi video</p>
    </div>

    <div class="w-full py-20 flex flex-col items-center justify-center gap-3 text-slate-400" v-if="isLoading">
      <span class="loading loading-spinner text-blue-600 loading-md"></span>
      <p class="text-xs font-medium">Đang tải câu hỏi thường gặp...</p>
    </div>

    <div class="flex flex-col gap-3" v-else>
      <div
        v-for="(item, idx) in faq"
        :key="idx"
        class="collapse collapse-plus bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:border-blue-200 transition-colors"
      >
        <input type="radio" name="my-accordion-faq" :checked="idx === 0" />
        <div class="collapse-title text-sm sm:text-base font-bold text-slate-800 pr-12">
          {{ item.title }}
        </div>
        <div class="collapse-content text-xs sm:text-sm text-slate-600 leading-relaxed pt-1 border-t border-slate-100">
          <p class="pt-2">{{ item.body }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
