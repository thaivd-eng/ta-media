<script setup>
import * as data from "~/utils/contact-data";

definePageMeta({
  title: "Liên hệ",
  layout: "dashboard",
});

const isLoading = ref(true);
const html = ref("");

onBeforeMount(async () => {
  let result = await data.findContact();
  html.value = result[0].html;
  isLoading.value = false;
});
</script>

<template>
  <div class="max-w-4xl mx-auto p-4 sm:p-8">
    <div class="w-full py-20 flex flex-col items-center justify-center gap-3 text-slate-400" v-if="isLoading">
      <span class="loading loading-spinner text-blue-600 loading-md"></span>
      <p class="text-xs font-medium">Đang tải thông tin liên hệ...</p>
    </div>

    <div v-else class="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-10 shadow-xs">
      <div class="prose prose-slate max-w-none leading-relaxed text-sm sm:text-base" v-html="html"></div>
    </div>
  </div>
</template>
