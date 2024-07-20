<script setup>
// import modules
import { BarChart } from 'vue-chart-3';
import { Chart, registerables } from 'chart.js';
import * as data from '~/utils/data-service';

Chart.register(...registerables);

// define head and page meta
useHead({ title: 'Thống kê' });

definePageMeta({
  title: 'Thống kê',
  layout: 'dashboard'
});

// states + computed
const isLoading = ref(true);
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

// hook
onBeforeMount(async () => {
  await fetchData();
  isLoading.value = false;
});

const projects = ref(0);
const videos = ref(0);
const versions = ref(0);
const feedbacks = ref(0);

async function fetchData() {
  let _projects = await data.find('projects');
  let _videos = await data.find('videos');
  let _versions = await data.find('versions');
  let _feedbacks = await data.find('feedbacks');

  projects.value = _projects.length;
  videos.value = _videos.length;
  versions.value = _versions.length;
  feedbacks.value = _feedbacks.length;
}
</script>

<template>
  <report-skeleton v-if="isLoading" />

  <div class="p-6 w-full h-screen flex flex-col gap-6" v-else>
    <!-- stats -->
    <div class="flex flex-col gap-6 lg:flex-row">
      <div class="rounded border aspect-square w-full flex flex-col justify-center items-center gap-3 bg-base-100">
        <IconCircleCheck class="size-12 fill-primary" />
        <span class="text-4xl font-bold">{{ projects }}</span>
        <span>Dự án</span>
      </div>
      <div class="rounded border aspect-square w-full flex flex-col justify-center items-center gap-3 bg-base-100">
        <IconCirclePlay class="size-12 fill-primary" />
        <span class="text-4xl font-bold">{{ videos }}</span>
        <span>Videos</span>
      </div>
      <div class="rounded border aspect-square w-full flex flex-col justify-center items-center gap-3 bg-base-100">
        <IconCodeBranch class="size-12 fill-primary" />
        <span class="text-4xl font-bold">{{ versions }}</span>
        <span>Phiên bản</span>
      </div>
      <div class="rounded border aspect-square w-full flex flex-col justify-center items-center gap-3 bg-base-100">
        <IconCommentDots class="size-12 fill-primary" />
        <span class="text-4xl font-bold">{{ feedbacks }}</span>
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
