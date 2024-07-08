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
    "January": 2,
    "February": 4,
    "March": 8,
    "April": 10,
    "May": 6,
    "June": 5,
    "July": 4,
    "August": 3,
    "September": 7,
    "October": 1,
    "November": 9,
    "December": 5,
  };

  let chartData = {
    labels: Object.keys(months),
    datasets: [
      {
        label: "videos",
        data: Object.values(months),
        backgroundColor: "#3182CE",
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
        <span class="text-3xl font-bold">50</span>
        <span>Người dùng</span>
      </div>
      <div class="rounded border aspect-square w-full flex flex-col justify-center items-center gap-3 bg-base-100">
        <IconCircleCheck class="size-12 fill-primary" />
        <span class="text-3xl font-bold">30</span>
        <span>Dự án</span>
      </div>
      <div class="rounded border aspect-square w-full flex flex-col justify-center items-center gap-3 bg-base-100">
        <IconCirclePlay class="size-12 fill-primary" />
        <span class="text-3xl font-bold">100</span>
        <span>Videos</span>
      </div>
      <div class="rounded border aspect-square w-full flex flex-col justify-center items-center gap-3 bg-base-100">
        <IconCommentDots class="size-12 fill-primary" />
        <span class="text-3xl font-bold">150</span>
        <span>Phản hồi</span>
      </div>
    </div>

    <!-- chart -->
    <div class="rounded border p-6 w-full bg-base-100">
      <h2 class="mb-3 text-xl font-bold text-center">Video created by month</h2>
      <BarChart :chartData="chartData" />
    </div>
  </div>
</template>