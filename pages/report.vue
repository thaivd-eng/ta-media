<script setup>
// import modules
import { BarChart } from 'vue-chart-3';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

// define head and page meta
useHead({ title: 'Thống kê' });

definePageMeta({
  title: 'Thống kê',
  layout: 'dashboard'
});

// states + computed
const chartData = computed(() => {
  const months = {
    'Tháng 1': 2,
    'Tháng 2': 4,
    'Tháng 3': 8,
    'Tháng 4': 10,
    'Tháng 5': 6,
    'Tháng 6': 5,
    'Tháng 7': 4,
    'Tháng 8': 3,
    'Tháng 9': 7,
    'Tháng 10': 1,
    'Tháng 11': 9,
    'Tháng 12': 5,
  };

  let chartData = {
    labels: Object.keys(months),
    datasets: [
      {
        label: 'videos',
        data: Object.values(months),
        backgroundColor: '#ffc90c',
      },
    ],
  }

  return chartData;
});
</script>

<template>
  <div class="p-6 w-full h-screen flex flex-col gap-6">
    <!-- stats -->
    <div class="flex flex-col gap-6 lg:flex-row">
      <div class="rounded border aspect-square w-full flex flex-col justify-center items-center gap-3 bg-base-100">
        <IconUser class="size-12 fill-primary" />
        <span class="text-4xl font-bold">50</span>
        <span>Người dùng</span>
      </div>
      <div class="rounded border aspect-square w-full flex flex-col justify-center items-center gap-3 bg-base-100">
        <IconCircleCheck class="size-12 fill-primary" />
        <span class="text-4xl font-bold">30</span>
        <span>Dự án</span>
      </div>
      <div class="rounded border aspect-square w-full flex flex-col justify-center items-center gap-3 bg-base-100">
        <IconCirclePlay class="size-12 fill-primary" />
        <span class="text-4xl font-bold">100</span>
        <span>Videos</span>
      </div>
      <div class="rounded border aspect-square w-full flex flex-col justify-center items-center gap-3 bg-base-100">
        <IconCommentDots class="size-12 fill-primary" />
        <span class="text-4xl font-bold">150</span>
        <span>Phản hồi</span>
      </div>
    </div>

    <!-- chart -->
    <div class="rounded border p-6 w-full bg-base-100">
      <h2 class="mb-3 text-xl font-bold text-center">Số video đã tạo trong tháng</h2>
      <BarChart :chartData="chartData" />
    </div>
  </div>
</template>