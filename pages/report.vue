<script setup>
// import modules
import { BarChart } from 'vue-chart-3';
import { Chart, registerables } from 'chart.js';
import * as data from '~/utils/data-service';

Chart.register(...registerables);

// define head and page meta
useHead({ title: 'Báo cáo & Thống kê - MediaAI' });

definePageMeta({
  title: 'Thống kê',
  layout: 'dashboard'
});

// states + computed
const isLoading = ref(true);
const isRefreshing = ref(false);

const projectsList = ref([]);
const videoData = ref([]);

const projectsCount = ref(0);
const videosCount = ref(0);
const versionsCount = ref(0);
const feedbacksCount = ref(0);
const votesCount = ref(0);
const scoresCount = ref(0);

// Default to 'all' so that all created videos across months display immediately
const selectedYear = ref('all');

// Pagination for contest table (15 items per page)
const currentPage = ref(1);
const pageSize = 15;

// Robust date parsing for various formats (M/D/YYYY, DD/MM/YYYY, ISO, timestamps)
function parseVideoDate(createdAt) {
  if (!createdAt) return null;
  // If numeric timestamp
  if (typeof createdAt === 'number' || (!isNaN(createdAt) && String(createdAt).length >= 10 && !String(createdAt).includes('/'))) {
    const d = new Date(Number(createdAt));
    if (!isNaN(d.getTime())) return d;
  }
  const str = String(createdAt).trim();
  const clean = str.replace(',', '');
  const [datePart] = clean.split(' ');
  if (datePart && datePart.includes('/')) {
    const parts = datePart.split('/').map(Number);
    if (parts.length === 3) {
      let [p1, p2, p3] = parts;
      if (p3 > 1000) {
        if (p1 > 12) return new Date(p3, p2 - 1, p1); // DD/MM/YYYY
        if (p2 > 12) return new Date(p3, p1 - 1, p2); // MM/DD/YYYY
        return new Date(p3, p1 - 1, p2); // Default MM/DD/YYYY from Google Sheet
      }
    }
  }
  const direct = new Date(str);
  if (!isNaN(direct.getTime()) && direct.getFullYear() > 2000 && direct.getFullYear() < 2100) {
    return direct;
  }
  return null;
}

// Compute all available years dynamically from data
const availableYears = computed(() => {
  const set = new Set();
  const curYear = new Date().getFullYear();
  set.add(curYear);

  videoData.value.forEach((v) => {
    const d = parseVideoDate(v.createdAt);
    if (d) set.add(d.getFullYear());
  });

  return Array.from(set).sort((a, b) => b - a);
});

// Chart data reactive to selectedYear (monthly breakdown)
const chartData = computed(() => {
  const isAll = selectedYear.value === 'all';
  const targetYear = parseInt(selectedYear.value) || new Date().getFullYear();

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

  videoData.value.forEach((v) => {
    const d = parseVideoDate(v.createdAt);
    if (!d) return;
    if (isAll || d.getFullYear() === targetYear) {
      const month = d.getMonth() + 1;
      months[`Tháng ${month}`] += 1;
    }
  });

  return {
    labels: Object.keys(months),
    datasets: [
      {
        label: isAll ? 'Tất cả video đã tạo theo tháng' : `Video tạo trong năm ${targetYear}`,
        data: Object.values(months),
        backgroundColor: '#2563eb',
        hoverBackgroundColor: '#1d4ed8',
        borderRadius: 8,
      },
    ],
  };
});

// Total videos in selected chart period
const selectedPeriodTotal = computed(() => {
  if (selectedYear.value === 'all') {
    return videoData.value.length;
  }
  const targetYear = parseInt(selectedYear.value) || new Date().getFullYear();
  return videoData.value.filter((v) => {
    const d = parseVideoDate(v.createdAt);
    return d && d.getFullYear() === targetYear;
  }).length;
});

// Detailed stats per contest
const contestStats = computed(() => {
  return projectsList.value
    .map((p) => {
      const vids = videoData.value.filter((v) => String(v.projectId) === String(p.id));
      const videoCount = vids.length;
      const voteCount = vids.reduce((acc, v) => acc + (data.countVideoVotes(v.id) || 0), 0);
      const scores = vids.flatMap((v) => data.calculateVideoScores(v.id).scores);
      const scoreCount = scores.length;
      const avgScore = scores.length
        ? Math.round((scores.reduce((a, s) => a + (parseFloat(s.score) || 0), 0) / scores.length) * 10) / 10
        : null;

      return {
        id: p.id,
        name: p.name,
        description: p.description,
        thumbnailUrl: data.formatThumbnailUrl(p.thumbnailUrl),
        videoCount,
        voteCount,
        scoreCount,
        avgScore,
      };
    })
    .sort((a, b) => b.videoCount - a.videoCount);
});

// Pagination calculations
const totalPages = computed(() => Math.ceil(contestStats.value.length / pageSize) || 1);

const paginatedContestStats = computed(() => {
  const start = (currentPage.value - 1) * pageSize;
  return contestStats.value.slice(start, start + pageSize);
});

function setPage(p) {
  if (p >= 1 && p <= totalPages.value) {
    currentPage.value = p;
  }
}

async function fetchData() {
  try {
    // 1. Fetch from sheet
    let _projects = [];
    let _videos = [];
    let _versions = [];
    let _feedbacks = [];

    try {
      _projects = (await data.find('projects')).filter((p) => p.isDisabled != 1);
    } catch (e) {
      _projects = [];
    }

    try {
      _videos = (await data.find('videos')).filter((v) => v.isDisabled != 1);
    } catch (e) {
      _videos = [];
    }

    try {
      _versions = await data.find('versions');
    } catch (e) {
      _versions = [];
    }

    try {
      _feedbacks = await data.find('feedbacks');
    } catch (e) {
      _feedbacks = [];
    }

    // 2. Merge local videos & projects
    const localVideos = data.getLocalVideos();
    const combinedVideos = [...localVideos];
    (_videos || []).forEach((sv) => {
      if (!combinedVideos.some((cv) => String(cv.id) === String(sv.id))) {
        combinedVideos.push(sv);
      }
    });

    // 3. Local scores & votes
    const localScores = data.getLocalScores();
    const localVotes = data.getLocalVotes();

    projectsList.value = _projects;
    projectsCount.value = _projects.length;
    videosCount.value = combinedVideos.length;
    versionsCount.value = (_versions?.length || 0) + localVideos.length;
    feedbacksCount.value = (_feedbacks?.length || 0) + localScores.length;
    votesCount.value = localVotes.length;
    scoresCount.value = localScores.length;

    videoData.value = combinedVideos;
  } catch (err) {
    console.error('Error fetching report stats:', err);
  }
}

async function refreshData() {
  isRefreshing.value = true;
  await fetchData();
  setTimeout(() => {
    isRefreshing.value = false;
  }, 400);
}

// hook
onBeforeMount(async () => {
  await fetchData();
  isLoading.value = false;
});
</script>

<template>
  <report-skeleton v-if="isLoading" />

  <div class="max-w-7xl mx-auto p-4 sm:p-8 flex flex-col gap-6 w-full" v-else>
    <!-- Header banner (bỏ badge báo cáo thời gian thực, đồng bộ dữ liệu) -->
    <div class="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Thống kê hoạt động</h1>
        <p class="text-xs sm:text-sm text-slate-500 mt-1">
          Tổng quan số lượng cuộc thi, video dự thi, lượt bình chọn và đánh giá chuyên môn
        </p>
      </div>

      <div class="flex items-center gap-3 self-start sm:self-center">
        <!-- Refresh button -->
        <button
          type="button"
          @click="refreshData"
          :disabled="isRefreshing"
          class="px-4 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs flex items-center gap-2 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
          title="Làm mới số liệu mới nhất"
        >
          <span :class="['inline-block transition-transform', isRefreshing ? 'animate-spin' : '']">🔄</span>
          <span>{{ isRefreshing ? 'Đang tải...' : 'Làm mới' }}</span>
        </button>
      </div>
    </div>

    <!-- Stats Cards Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      <!-- Card 1: Cuộc thi -->
      <div class="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs hover:shadow-lg hover:-translate-y-0.5 hover:border-blue-200 transition-all flex flex-col justify-between group">
        <div class="flex items-center justify-between mb-4">
          <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Cuộc thi</span>
          <div class="size-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center transition-transform group-hover:scale-110">
            <IconCircleCheck class="size-5 fill-current" />
          </div>
        </div>
        <div>
          <div class="flex items-baseline gap-2">
            <span class="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">{{ projectsCount }}</span>
            <span class="text-xs font-semibold text-emerald-600">Đang chạy</span>
          </div>
          <p class="text-xs text-slate-500 mt-1 font-medium">Cuộc thi đang hoạt động</p>
        </div>
      </div>

      <!-- Card 2: Video dự thi -->
      <div class="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs hover:shadow-lg hover:-translate-y-0.5 hover:border-indigo-200 transition-all flex flex-col justify-between group">
        <div class="flex items-center justify-between mb-4">
          <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Video dự thi</span>
          <div class="size-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center transition-transform group-hover:scale-110">
            <IconCirclePlay class="size-5 fill-current" />
          </div>
        </div>
        <div>
          <div class="flex items-baseline gap-2">
            <span class="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">{{ videosCount }}</span>
            <span class="text-xs font-semibold text-blue-600">Tác phẩm</span>
          </div>
          <p class="text-xs text-slate-500 mt-1 font-medium">Tổng số bài thi đã nộp</p>
        </div>
      </div>

      <!-- Card 3: Bình chọn cộng đồng -->
      <div class="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs hover:shadow-lg hover:-translate-y-0.5 hover:border-rose-200 transition-all flex flex-col justify-between group">
        <div class="flex items-center justify-between mb-4">
          <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Bình chọn</span>
          <div class="size-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center transition-transform group-hover:scale-110">
            <IconThumbsUp class="size-5 fill-current" />
          </div>
        </div>
        <div>
          <div class="flex items-baseline gap-2">
            <span class="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">{{ votesCount }}</span>
            <span class="text-xs font-semibold text-rose-500">❤️ Lượt yêu thích</span>
          </div>
          <p class="text-xs text-slate-500 mt-1 font-medium">Bình chọn từ cộng đồng</p>
        </div>
      </div>

      <!-- Card 4: Nhận xét & Đánh giá -->
      <div class="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs hover:shadow-lg hover:-translate-y-0.5 hover:border-cyan-200 transition-all flex flex-col justify-between group">
        <div class="flex items-center justify-between mb-4">
          <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Đánh giá & BGK</span>
          <div class="size-11 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center transition-transform group-hover:scale-110">
            <IconCommentDots class="size-5 fill-current" />
          </div>
        </div>
        <div>
          <div class="flex items-baseline gap-2">
            <span class="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">{{ feedbacksCount }}</span>
            <span class="text-xs font-semibold text-cyan-600">⚖️ Điểm & Góp ý</span>
          </div>
          <p class="text-xs text-slate-500 mt-1 font-medium">Nhận xét & chấm điểm BGK</p>
        </div>
      </div>
    </div>

    <!-- Chart Card -->
    <div class="rounded-3xl border border-slate-200/80 p-6 sm:p-8 bg-white shadow-xs">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
        <div>
          <h2 class="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <span>Biểu đồ video tạo theo tháng</span>
            <span class="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-bold">
              {{ selectedPeriodTotal }} video
            </span>
          </h2>
          <p class="text-xs text-slate-500 mt-0.5">
            Thống kê số lượng video dự thi được khởi tạo qua từng tháng
          </p>
        </div>

        <!-- Year Selector Dropdown -->
        <div class="flex items-center gap-2 self-start sm:self-center">
          <span class="text-xs text-slate-500 font-medium">Thời gian:</span>
          <select
            v-model="selectedYear"
            class="px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white text-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
          >
            <option value="all">📊 Tất cả thời gian ({{ videoData.length }} video)</option>
            <option
              v-for="y in availableYears"
              :key="y"
              :value="String(y)"
            >
              📅 Năm {{ y }} {{ y === new Date().getFullYear() ? '(Hiện tại)' : '' }}
            </option>
          </select>
        </div>
      </div>

      <!-- Bar Chart Container -->
      <div class="w-full h-80 sm:h-96">
        <BarChart :chartData="chartData" />
      </div>
    </div>

    <!-- Contest Breakdown Table (15 items per page + pagination on bottom right) -->
    <div class="rounded-3xl border border-slate-200/80 p-6 sm:p-8 bg-white shadow-xs">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
        <div>
          <h2 class="text-base sm:text-lg font-bold text-slate-900">Chi tiết theo từng Cuộc thi</h2>
          <p class="text-xs text-slate-500">Phân bổ số lượng video, bình chọn và đánh giá của từng cuộc thi</p>
        </div>
        <span class="text-xs text-slate-400 font-medium self-start sm:self-center">
          Tổng cộng {{ contestStats.length }} cuộc thi (15 cuộc thi / trang)
        </span>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <th class="py-3 px-4">Cuộc thi</th>
              <th class="py-3 px-4 text-center">Video dự thi</th>
              <th class="py-3 px-4 text-center">Lượt bình chọn</th>
              <th class="py-3 px-4 text-center">Chấm điểm BGK</th>
              <th class="py-3 px-4 text-center">Điểm TB</th>
              <th class="py-3 px-4 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 text-xs font-medium">
            <tr
              v-for="c in paginatedContestStats"
              :key="c.id"
              class="hover:bg-slate-50/80 transition-colors"
            >
              <td class="py-3.5 px-4">
                <NuxtLink :to="'/project?id=' + c.id" class="flex items-center gap-3 group">
                  <div class="size-10 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200/60">
                    <img
                      v-if="c.thumbnailUrl"
                      :src="c.thumbnailUrl"
                      :alt="c.name"
                      referrerpolicy="no-referrer"
                      class="w-full h-full object-cover"
                    />
                    <div v-else class="w-full h-full flex items-center justify-center bg-blue-50 text-blue-600 font-bold text-xs">
                      🏆
                    </div>
                  </div>
                  <div>
                    <span class="font-bold text-slate-900 group-hover:text-blue-600 transition-colors block">
                      {{ c.name }}
                    </span>
                    <span v-if="c.description" class="text-[11px] text-slate-400 line-clamp-1">
                      {{ c.description }}
                    </span>
                  </div>
                </NuxtLink>
              </td>

              <td class="py-3.5 px-4 text-center">
                <span class="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-bold text-xs">
                  🎬 {{ c.videoCount }}
                </span>
              </td>

              <td class="py-3.5 px-4 text-center">
                <span class="px-2.5 py-1 rounded-full bg-rose-50 text-rose-600 font-bold text-xs">
                  ❤️ {{ c.voteCount }}
                </span>
              </td>

              <td class="py-3.5 px-4 text-center">
                <span class="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 font-bold text-xs">
                  ⚖️ {{ c.scoreCount }}
                </span>
              </td>

              <td class="py-3.5 px-4 text-center">
                <span v-if="c.avgScore !== null" class="font-bold text-amber-600">
                  ⭐ {{ c.avgScore }}/10
                </span>
                <span v-else class="text-slate-300">—</span>
              </td>

              <td class="py-3.5 px-4 text-right">
                <NuxtLink
                  :to="'/project?id=' + c.id"
                  class="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-600 font-bold text-[11px] transition-colors inline-block"
                >
                  Xem chi tiết →
                </NuxtLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination Controls at Bottom Right -->
      <div v-if="totalPages > 1" class="flex flex-col sm:flex-row items-center justify-between gap-3 pt-5 border-t border-slate-100 mt-4">
        <span class="text-xs text-slate-500 font-medium">
          Trang <span class="font-bold text-slate-800">{{ currentPage }}</span> / {{ totalPages }} 
          (Hiển thị {{ (currentPage - 1) * pageSize + 1 }} - {{ Math.min(currentPage * pageSize, contestStats.length) }} trong tổng số {{ contestStats.length }} cuộc thi)
        </span>

        <div class="flex items-center gap-1.5 self-end">
          <button
            type="button"
            @click="setPage(currentPage - 1)"
            :disabled="currentPage <= 1"
            class="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer flex items-center gap-1"
          >
            ‹ Trước
          </button>

          <button
            type="button"
            v-for="p in totalPages"
            :key="p"
            @click="setPage(p)"
            :class="[
              'size-8 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center',
              currentPage === p ? 'bg-blue-600 text-white shadow-xs' : 'border border-slate-200 text-slate-700 hover:bg-slate-100'
            ]"
          >
            {{ p }}
          </button>

          <button
            type="button"
            @click="setPage(currentPage + 1)"
            :disabled="currentPage >= totalPages"
            class="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer flex items-center gap-1"
          >
            Sau ›
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
