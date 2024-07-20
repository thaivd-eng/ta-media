<script setup>
import * as data from "~/utils/contact-data";

definePageMeta({
  title: "Thông tin",
  layout: "dashboard",
});

const isLoading = ref(true);
const html = ref("");

onBeforeMount(async () => {
  let result = await data.findAbout();
  html.value = result[0].html;
  isLoading.value = false;
});
</script>

<template>
  <div class="mx-auto p-6 container">
    <div class="w-full min-h-screen flex items-center justify-center gap-3" v-if="isLoading">
      <span class="loading loading-ring loading-sm"></span>
      <p>Đang tải dữ liệu...</p>
    </div>

    <div v-html="html"></div>
  </div>
</template>
