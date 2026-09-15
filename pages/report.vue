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
        label: 'Video mới tạo',
        data: Object.values(months),
        backgroundColor: '#2563eb',
        hoverBackgroundColor: '#1d4ed8',
        borderRadius: 8,
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
const videoData = ref([]);

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

  <div class="max-w-7xl mx-auto p-4 sm:p-8 flex flex-col gap-6 w-full" v-else>
    <!-- Header banner -->
    <div class="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <h1 class="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Thống kê hoạt động</h1>
        <p class="text-xs sm:text-sm text-slate-500 mt-1">Tổng quan số lượng cuộc thi, video và phản hồi trên toàn hệ thống</p>
      </div>

      <div class="px-3.5 py-1.5 rounded-xl bg-blue-50 text-blue-700 text-xs font-bold self-start sm:self-center">
        Năm {{ new Date().getFullYear() }}
      </div>
    </div>

    <!-- Stats Cards Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      <!-- Card 1 -->
      <div class="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs hover:shadow-md hover:border-blue-200 transition-all flex flex-col justify-between">
        <div class="flex items-center justify-between mb-4">
          <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Cuộc thi</span>
          <div class="size-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <IconCircleCheck class="size-5 fill-current" />
          </div>
        </div>
        <div>
          <span class="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">{{ projects }}</span>
          <p class="text-xs text-slate-500 mt-1 font-medium">Cuộc thi đang hoạt động</p>
        </div>
      </div>

      <!-- Card 2 -->
      <div class="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs hover:shadow-md hover:border-blue-200 transition-all flex flex-col justify-between">
        <div class="flex items-center justify-between mb-4">
          <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Video</span>
          <div class="size-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <IconCirclePlay class="size-5 fill-current" />
          </div>
        </div>
        <div>
          <span class="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">{{ videos }}</span>
          <p class="text-xs text-slate-500 mt-1 font-medium">Tổng số video được tải</p>
        </div>
      </div>

      <!-- Card 3 -->
      <div class="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs hover:shadow-md hover:border-blue-200 transition-all flex flex-col justify-between">
        <div class="flex items-center justify-between mb-4">
          <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Phiên bản</span>
          <div class="size-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
            <IconCodeBranch class="size-5 fill-current" />
          </div>
        </div>
        <div>
          <span class="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">{{ versions }}</span>
          <p class="text-xs text-slate-500 mt-1 font-medium">Phiên bản đã cập nhật</p>
        </div>
      </div>

      <!-- Card 4 -->
      <div class="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs hover:shadow-md hover:border-blue-200 transition-all flex flex-col justify-between">
        <div class="flex items-center justify-between mb-4">
          <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Phản hồi</span>
          <div class="size-10 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
            <IconCommentDots class="size-5 fill-current" />
          </div>
        </div>
        <div>
          <span class="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">{{ feedbacks }}</span>
          <p class="text-xs text-slate-500 mt-1 font-medium">Nhận xét & đánh giá</p>
        </div>
      </div>
    </div>

    <!-- Chart Card -->
    <div class="rounded-3xl border border-slate-200/80 p-6 sm:p-8 bg-white shadow-xs">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
        <div>
          <h2 class="text-base sm:text-lg font-bold text-slate-900">Biểu đồ video tạo theo tháng</h2>
          <p class="text-xs text-slate-500">Thống kê số lượng video được khởi tạo qua từng tháng trong năm</p>
        </div>
      </div>
      <div class="w-full h-80 sm:h-96">
        <BarChart :chartData="chartData" />
      </div>
    </div>
  </div>
</template>
