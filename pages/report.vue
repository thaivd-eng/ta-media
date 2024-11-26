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
    'Tháng 1': 0,
    'Tháng 2': 0,
    'Tháng 3': 0,
    'Tháng 4': 0,
    'Tháng 5': 0,
    'Tháng 6': 0,
    'Tháng 7': 0,
    'Tháng 8': 0,
    'Tháng 9': 0,
    'Tháng 10': 0,
    'Tháng 11': 0,
    'Tháng 12': 0,
  };

  // filter videos by month in current year from videos
  let currentYear = new Date().getFullYear();
  videoData.value.forEach((v) => {
    // convert date string to Date object
    // format of createdAt: 'dd/mm/yyyy hh:mm:ss'
    let [y,m,d] = v.createdAt.split(' ')[0].split('/').reverse();
	let date = new Date(y, m - 1, d);

    if (date.getFullYear() == currentYear) {
      let month = date.getMonth() + 1;
      months[`Tháng ${month}`] += 1;
    }
  });

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
const videoData = ref(null);

async function fetchData() {
  let _projects = (await data.find('projects')).filter((p) => p.isDisabled != 1);
  let _videos = (await data.find('videos')).filter((v) => v.isDisabled != 1);
  let _versions = await data.find('versions');
  let _feedbacks = await data.find('feedbacks');

  projects.value = _projects.length;
  videos.value = _videos.length;
  versions.value = _versions.length;
  feedbacks.value = _feedbacks.length;

  videoData.value = _videos;
}
</script>

<template>
  <report-skeleton v-if="isLoading" />

  <div class="p-6 w-full min-h-screen flex flex-col gap-6" v-else>
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
