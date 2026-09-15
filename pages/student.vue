<script setup>
import * as data from '~/utils/data-service';
import swal from 'sweetalert2';

useHead({ title: 'Cổng thông tin Sinh viên - MediaAI' });

definePageMeta({
  title: 'Cổng thông tin Sinh viên',
  layout: 'dashboard',
});

const userCookie = useCookie('user');
const currentUser = computed(() => {
  if (!userCookie.value) return { userName: 'student', fullName: 'Sinh viên', role: 'student', studentId: '', className: '' };
  if (typeof userCookie.value === 'string') {
    try {
      return JSON.parse(userCookie.value);
    } catch {
      return { userName: userCookie.value, fullName: userCookie.value, role: 'student' };
    }
  }
  return userCookie.value;
});

const isLoading = ref(true);
const projects = ref([]);
const allVideos = ref([]);
const myVideos = ref([]);

// Active tab on student portal: 'my-submissions' | 'contests' | 'community'
const activeTab = ref('my-submissions');

// Submission modal state
const showModalSubmit = ref(false);
const isSubmitting = ref(false);
const submission = ref({
  projectId: '',
  name: '',
  authorGroup: '',
  studentId: '',
  className: '',
  thumbnailUrl: '',
  videoUrl: '',
  description: '',
});
const thumbnailPreview = ref('');
const fileInputRef = ref(null);

// Edit submission modal state
const showModalEdit = ref(false);
const editingVideo = ref({
  id: null,
  name: '',
  authorGroup: '',
  className: '',
  description: '',
  videoUrl: '',
});

onBeforeMount(async () => {
  await fetchData();
});

async function fetchData() {
  isLoading.value = true;
  try {
    // 1. Fetch contests / projects
    let fetchedProjects = [];
    try {
      fetchedProjects = await data.find('projects');
    } catch (e) {
      fetchedProjects = [];
    }
    projects.value = (fetchedProjects || []).filter(p => p.isDisabled != 1);

    // 2. Fetch all videos & merge with local cache
    let sheetVideos = [];
    try {
      sheetVideos = await data.find('videos');
    } catch (e) {
      sheetVideos = [];
    }
    const localVideos = data.getLocalVideos();
    const combined = [...localVideos];
    (sheetVideos || []).filter(v => v.isDisabled != 1).forEach(sv => {
      if (!combined.some(cv => String(cv.id) === String(sv.id))) {
        combined.push(sv);
      }
    });

    // 3. Thumbnails
    let thumbnails = [];
    try {
      thumbnails = await data.find('thumbnails');
    } catch (e) {}

    // Augment videos with scores & votes
    allVideos.value = combined.map(v => {
      const thumb = thumbnails.find(t => String(t.videoId) === String(v.id));
      if (thumb && !v.thumbnailUrl) {
        v.thumbnailUrl = thumb.thumbnailUrl || thumb.url;
      }
      const scoreData = data.calculateVideoScores(v.id);
      v.avgScore = scoreData.avgScore;
      v.scoreCount = scoreData.count;
      v.scores = scoreData.scores;
      v.voteCount = data.countVideoVotes(v.id);
      v.hasVoted = data.hasUserVoted(v.id, currentUser.value?.userName);
      
      // Match contest name
      const p = projects.value.find(proj => String(proj.id) === String(v.projectId));
      v.projectName = p ? p.name : 'Cuộc thi';

      return v;
    });

    // 4. Filter my submissions
    const curUserName = currentUser.value?.userName;
    const curStudentId = currentUser.value?.studentId;
    const curFullName = (currentUser.value?.fullName || '').toLowerCase();

    myVideos.value = allVideos.value.filter(v => {
      return (
        (v.createdBy && v.createdBy === curUserName) ||
        (curStudentId && v.studentId === curStudentId) ||
        (v.authorGroup && curFullName && v.authorGroup.toLowerCase().includes(curFullName))
      );
    });

  } catch (err) {
    console.error('Error fetching student data:', err);
  } finally {
    isLoading.value = false;
  }
}

// Student Stats
const scoredCount = computed(() => myVideos.value.filter(v => v.scoreCount > 0).length);
const highestScore = computed(() => {
  const scored = myVideos.value.filter(v => v.scoreCount > 0);
  if (!scored.length) return 0;
  return Math.max(...scored.map(v => v.avgScore));
});
const totalMyVotes = computed(() => myVideos.value.reduce((acc, v) => acc + (v.voteCount || 0), 0));

// Open submission modal
function openSubmitModal(projectId = null) {
  const user = currentUser.value;
  submission.value = {
    projectId: projectId || (projects.value[0]?.id || ''),
    name: '',
    authorGroup: user.fullName || user.userName || '',
    studentId: user.studentId || '',
    className: user.className || '',
    thumbnailUrl: '',
    videoUrl: '',
    description: '',
  };
  thumbnailPreview.value = '';
  showModalSubmit.value = true;
}

// File Upload with Canvas Compression
function triggerFileInput() {
  if (fileInputRef.value) fileInputRef.value.click();
}

function handleThumbnailUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    swal.fire({ icon: 'warning', title: 'Tệp không hợp lệ', text: 'Vui lòng chọn tệp hình ảnh (PNG, JPG, WEBP)' });
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 960;
      const MAX_HEIGHT = 540;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width = Math.round((width * MAX_HEIGHT) / height);
          height = MAX_HEIGHT;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
      submission.value.thumbnailUrl = compressedDataUrl;
      thumbnailPreview.value = compressedDataUrl;
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function removeThumbnail() {
  submission.value.thumbnailUrl = '';
  thumbnailPreview.value = '';
  if (fileInputRef.value) fileInputRef.value.value = '';
}

// Submit contest entry
async function submitEntry() {
  if (!submission.value.name.trim()) {
    swal.fire({ icon: 'warning', title: 'Thiếu thông tin', text: 'Vui lòng nhập tên tác phẩm dự thi' });
    return;
  }
  if (!submission.value.projectId) {
    swal.fire({ icon: 'warning', title: 'Chọn cuộc thi', text: 'Vui lòng chọn cuộc thi bạn muốn tham gia' });
    return;
  }

  isSubmitting.value = true;
  const user = currentUser.value;
  const videoId = Date.now();
  const selectedProj = projects.value.find(p => String(p.id) === String(submission.value.projectId));

  const newEntry = {
    id: videoId,
    name: submission.value.name.trim(),
    projectId: submission.value.projectId,
    authorGroup: submission.value.authorGroup.trim() || user.fullName || user.userName,
    studentId: submission.value.studentId.trim() || user.studentId || '',
    className: submission.value.className.trim() || user.className || '',
    description: submission.value.description.trim(),
    thumbnailUrl: submission.value.thumbnailUrl,
    createdBy: user.userName || 'student',
    folderId: selectedProj?.folderId || '',
    videoUrl: submission.value.videoUrl.trim(),
    versions: submission.value.videoUrl ? [{ id: Date.now() + 1, name: 'v1', videoUrl: submission.value.videoUrl.trim() }] : [],
    done: 0,
    feedbacks: 0,
    avgScore: 0,
    scoreCount: 0,
    scores: [],
    voteCount: 0,
    hasVoted: false,
    projectName: selectedProj ? selectedProj.name : 'Cuộc thi',
    createdAt: new Date().toLocaleString('en-GB'),
  };

  data.saveLocalVideo(newEntry);
  myVideos.value.unshift(newEntry);
  allVideos.value.unshift(newEntry);

  try {
    await data.createVideo(newEntry);
  } catch (err) {
    console.warn('Backend sync warning:', err);
  }

  isSubmitting.value = false;
  showModalSubmit.value = false;

  swal.fire({
    icon: 'success',
    title: 'Nộp bài thành công!',
    text: `Tác phẩm "${newEntry.name}" đã được nộp vào cuộc thi "${newEntry.projectName}". Bạn có thể theo dõi kết quả chấm điểm tại đây.`,
    confirmButtonText: 'Đã hiểu',
    confirmButtonColor: '#2563eb',
  });
}

// Community vote handler
async function handleVote(video) {
  try {
    const isNowVoted = await data.toggleVote({
      projectId: video.projectId,
      videoId: video.id,
      userName: currentUser.value.userName,
    });
    video.hasVoted = isNowVoted;
    video.voteCount = data.countVideoVotes(video.id);

    const toast = swal.mixin({
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 2000,
      timerProgressBar: true,
    });

    if (isNowVoted) {
      toast.fire({ icon: 'success', title: `❤️ Đã bình chọn cho "${video.name}"!` });
    } else {
      toast.fire({ icon: 'info', title: `Đã hủy bình chọn cho "${video.name}".` });
    }
  } catch (err) {
    swal.fire({ icon: 'error', title: 'Lỗi', text: err?.message || 'Không thể thực hiện bình chọn' });
  }
}

// Edit submission
function openEditModal(video) {
  editingVideo.value = {
    id: video.id,
    name: video.name,
    authorGroup: video.authorGroup || '',
    className: video.className || '',
    description: video.description || '',
    videoUrl: video.videoUrl || '',
  };
  showModalEdit.value = true;
}

function updateSubmission() {
  const target = myVideos.value.find(v => v.id === editingVideo.value.id);
  if (target) {
    target.name = editingVideo.value.name;
    target.authorGroup = editingVideo.value.authorGroup;
    target.className = editingVideo.value.className;
    target.description = editingVideo.value.description;
    target.videoUrl = editingVideo.value.videoUrl;

    data.update('videos', target);
    data.saveLocalVideo(target);
  }
  showModalEdit.value = false;
  swal.fire({ icon: 'success', title: 'Đã cập nhật bài thi', timer: 1200, showConfirmButton: false });
}
</script>

<template>
  <div class="max-w-7xl mx-auto p-4 sm:p-8 flex flex-col gap-6">
    <!-- Welcome Header & Profile Summary Banner -->
    <div class="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-blue-900/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
      <!-- Background decorative circle -->
      <div class="absolute -top-24 -right-24 size-64 rounded-full bg-white/10 blur-2xl pointer-events-none"></div>

      <div class="flex items-center gap-4 sm:gap-5 z-10">
        <!-- Student Avatar Badge -->
        <div class="size-16 sm:size-20 rounded-3xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-3xl sm:text-4xl shadow-lg shrink-0">
          🎓
        </div>
        <div>
          <div class="flex items-center gap-2 flex-wrap mb-1">
            <span class="px-3 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-bold tracking-wide uppercase">
              Cổng Sinh Viên
            </span>
            <span v-if="currentUser.studentId" class="px-3 py-0.5 rounded-full bg-emerald-400/20 text-emerald-100 border border-emerald-300/30 text-[11px] font-bold">
              MSSV: {{ currentUser.studentId }}
            </span>
            <span v-if="currentUser.className" class="px-3 py-0.5 rounded-full bg-blue-300/20 text-blue-100 border border-blue-200/30 text-[11px] font-bold">
              {{ currentUser.className }}
            </span>
          </div>
          <h1 class="text-2xl sm:text-3xl font-black tracking-tight">
            Xin chào, {{ currentUser.fullName || currentUser.userName }}!
          </h1>
          <p class="text-blue-100 text-xs sm:text-sm mt-1 max-w-xl">
            Không gian cá nhân dành cho sinh viên: Nộp bài dự thi, theo dõi điểm số Ban Giám khảo và nhận bình chọn cộng đồng.
          </p>
        </div>
      </div>

      <!-- Action: Submit New Project Button -->
      <button
        type="button"
        @click="openSubmitModal()"
        class="z-10 px-6 py-3.5 rounded-2xl bg-white hover:bg-blue-50 text-blue-700 font-extrabold text-xs sm:text-sm flex items-center gap-2.5 shadow-lg shadow-black/10 hover:shadow-xl transition-all active:scale-95 cursor-pointer whitespace-nowrap"
      >
        <IconPlus class="size-4 fill-current" />
        <span>Nộp bài dự thi mới</span>
      </button>
    </div>

    <!-- Quick Stats Cards (Thống kê cá nhân của sinh viên) -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      <!-- Card 1: My Submissions -->
      <div class="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
        <div class="size-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl shrink-0">
          🎬
        </div>
        <div>
          <div class="text-2xl font-black text-slate-800">{{ myVideos.length }}</div>
          <div class="text-xs text-slate-400 font-semibold">Bài thi đã nộp</div>
        </div>
      </div>

      <!-- Card 2: Scored Submissions -->
      <div class="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
        <div class="size-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl shrink-0">
          🟢
        </div>
        <div>
          <div class="text-2xl font-black text-slate-800">{{ scoredCount }} / {{ myVideos.length }}</div>
          <div class="text-xs text-slate-400 font-semibold">Đã được BGK chấm</div>
        </div>
      </div>

      <!-- Card 3: Highest Score -->
      <div class="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
        <div class="size-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl shrink-0">
          🌟
        </div>
        <div>
          <div class="text-2xl font-black text-slate-800">{{ highestScore > 0 ? `${highestScore} / 10` : '--' }}</div>
          <div class="text-xs text-slate-400 font-semibold">Điểm TB cao nhất</div>
        </div>
      </div>

      <!-- Card 4: Total Community Votes Received -->
      <div class="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
        <div class="size-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center text-xl shrink-0">
          ❤️
        </div>
        <div>
          <div class="text-2xl font-black text-slate-800">{{ totalMyVotes }}</div>
          <div class="text-xs text-slate-400 font-semibold">Lượt bình chọn nhận được</div>
        </div>
      </div>
    </div>

    <!-- Navigation Tabs -->
    <div class="bg-white p-2 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between gap-2 overflow-x-auto">
      <div class="flex items-center gap-1.5 sm:gap-2">
        <button
          type="button"
          @click="activeTab = 'my-submissions'"
          :class="[
            'px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap',
            activeTab === 'my-submissions'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          ]"
        >
          <span>📁 Bài dự thi của tôi</span>
          <span
            :class="[
              'px-2 py-0.5 rounded-full text-[11px]',
              activeTab === 'my-submissions' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
            ]"
          >
            {{ myVideos.length }}
          </span>
        </button>

        <button
          type="button"
          @click="activeTab = 'contests'"
          :class="[
            'px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap',
            activeTab === 'contests'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          ]"
        >
          <span>🏆 Các Cuộc thi đang mở</span>
          <span
            :class="[
              'px-2 py-0.5 rounded-full text-[11px]',
              activeTab === 'contests' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
            ]"
          >
            {{ projects.length }}
          </span>
        </button>

        <button
          type="button"
          @click="activeTab = 'community'"
          :class="[
            'px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap',
            activeTab === 'community'
              ? 'bg-rose-500 text-white shadow-md shadow-rose-500/25'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          ]"
        >
          <span>❤️ Bình chọn cho bạn bè</span>
          <span
            :class="[
              'px-2 py-0.5 rounded-full text-[11px]',
              activeTab === 'community' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
            ]"
          >
            {{ allVideos.length }} bài thi
          </span>
        </button>
      </div>
    </div>

    <!-- Skeleton Loading -->
    <projects-skeleton v-if="isLoading" />

    <!-- ======================================================== -->
    <!-- TAB 1: BÀI DỰ THI CỦA TÔI -->
    <!-- ======================================================== -->
    <div v-else-if="activeTab === 'my-submissions'">
      <!-- Empty State -->
      <div
        v-if="myVideos.length === 0"
        class="bg-white rounded-3xl border border-slate-200/80 p-12 text-center flex flex-col items-center justify-center max-w-md mx-auto w-full my-8 shadow-xs"
      >
        <div class="size-16 rounded-3xl bg-blue-50 flex items-center justify-center text-blue-600 mb-4 ring-8 ring-blue-50/50 text-2xl">
          🎬
        </div>
        <h3 class="text-lg font-bold text-slate-800 mb-1">Bạn chưa nộp bài thi nào</h3>
        <p class="text-xs sm:text-sm text-slate-500 max-w-sm mb-6">
          Hãy chọn một cuộc thi đang mở và nộp video dự thi để ban giám khảo đánh giá và bạn bè cùng bình chọn!
        </p>
        <button
          type="button"
          @click="openSubmitModal()"
          class="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-md shadow-blue-600/20 transition-all cursor-pointer"
        >
          <IconPlus class="size-4 fill-current" />
          <span>Nộp bài ngay</span>
        </button>
      </div>

      <!-- Submissions Grid -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="v in myVideos"
          :key="v.id"
          class="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col overflow-hidden"
        >
          <!-- Thumbnail & Video Link -->
          <div class="relative w-full aspect-video bg-slate-100 overflow-hidden group">
            <NuxtLink :to="'/video?id=' + v.id" class="w-full h-full block">
              <img
                v-if="v.thumbnailUrl"
                :src="v.thumbnailUrl"
                :alt="v.name"
                class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div v-else class="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 text-slate-400">
                <IconCirclePlay class="size-8 text-blue-500 mb-1" />
                <span class="text-xs font-semibold">Xem video</span>
              </div>
            </NuxtLink>

            <!-- Status Badge -->
            <div class="absolute top-3 right-3 z-10 pointer-events-none">
              <span
                v-if="v.scoreCount > 0"
                class="px-2.5 py-1 rounded-full bg-emerald-600 text-white text-[11px] font-bold shadow-md flex items-center gap-1.5"
              >
                <span>Điểm TB: {{ v.avgScore }}/10 ({{ v.scoreCount }} GK)</span>
              </span>
              <span
                v-else
                class="px-2.5 py-1 rounded-full bg-amber-500 text-white text-[11px] font-medium shadow-md flex items-center gap-1"
              >
                <span class="size-1.5 rounded-full bg-amber-100 animate-ping"></span>
                <span>Chờ chấm điểm</span>
              </span>
            </div>

            <!-- Community Vote count -->
            <div class="absolute top-3 left-3 z-10 pointer-events-none">
              <span class="px-2.5 py-1 rounded-full bg-white/95 text-rose-600 text-xs font-bold shadow-md flex items-center gap-1">
                <svg class="size-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
                <span>{{ v.voteCount || 0 }} vote</span>
              </span>
            </div>
          </div>

          <!-- Video Info & Judge Feedback -->
          <div class="p-5 flex flex-col flex-1 justify-between gap-3">
            <div>
              <div class="text-[11px] font-bold text-blue-600 uppercase tracking-wide truncate">
                {{ v.projectName }}
              </div>
              <NuxtLink :to="'/video?id=' + v.id" class="font-extrabold text-slate-900 text-base hover:text-blue-600 transition-colors line-clamp-2 mt-0.5">
                {{ v.name }}
              </NuxtLink>
              <p v-if="v.description" class="text-xs text-slate-500 line-clamp-2 mt-1">
                {{ v.description }}
              </p>

              <!-- Judge Comments preview if scored -->
              <div v-if="v.scores && v.scores.length > 0" class="mt-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                <span class="font-bold text-slate-700">Nhận xét của Giám khảo:</span>
                <p class="text-slate-600 italic mt-0.5 line-clamp-2">
                  "{{ v.scores[v.scores.length - 1]?.comment || 'Đã hoàn thành đánh giá bài thi.' }}"
                </p>
              </div>
            </div>

            <!-- Actions Bar -->
            <div class="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
              <button
                type="button"
                @click="openEditModal(v)"
                class="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <IconPenToSquare class="size-3.5 fill-current" />
                <span>Chỉnh sửa</span>
              </button>

              <NuxtLink
                :to="'/video?id=' + v.id"
                class="px-4 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs flex items-center gap-1.5 transition-colors"
              >
                <span>Xem chi tiết</span>
                <span>→</span>
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- TAB 2: CÁC CUỘC THI ĐANG MỞ -->
    <!-- ======================================================== -->
    <div v-else-if="activeTab === 'contests'">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="p in projects"
          :key="p.id"
          class="bg-white rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col overflow-hidden"
        >
          <div class="w-full aspect-video bg-slate-100 overflow-hidden relative group">
            <img
              v-if="p.thumbnailUrl"
              :src="p.thumbnailUrl"
              :alt="p.name"
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div v-else class="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600">
              <IconCirclePlay class="size-10" />
            </div>
            <div class="absolute top-3 right-3">
              <span class="px-2.5 py-1 rounded-full bg-emerald-500/90 text-white text-[11px] font-bold shadow-md">
                Đang mở nộp bài
              </span>
            </div>
          </div>

          <div class="p-5 flex flex-col flex-1 justify-between gap-4">
            <div>
              <h3 class="font-bold text-slate-900 text-base">{{ p.name }}</h3>
              <p v-if="p.description" class="text-xs text-slate-500 mt-1 line-clamp-2">{{ p.description }}</p>
            </div>

            <div class="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
              <NuxtLink
                :to="'/project?id=' + p.id"
                class="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Xem chi tiết
              </NuxtLink>

              <button
                type="button"
                @click="openSubmitModal(p.id)"
                class="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <IconPlus class="size-3.5 fill-current" />
                <span>Nộp bài ngay</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- TAB 3: BÌNH CHỌN CHO BẠN BÈ (COMMUNITY VOTING) -->
    <!-- ======================================================== -->
    <div v-else-if="activeTab === 'community'">
      <div class="bg-gradient-to-r from-rose-50 to-pink-50 p-6 rounded-3xl border border-rose-200/80 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 class="text-lg font-black text-slate-900">Bình chọn giải “Bài dự thi được yêu thích nhất”</h3>
          <p class="text-xs text-slate-600 mt-0.5">Mỗi tài khoản được bình chọn 1 lần cho từng bài thi. Hãy ủng hộ các tác phẩm bạn yêu thích!</p>
        </div>
        <div class="px-4 py-2 rounded-2xl bg-rose-500 text-white font-black text-sm shadow-md shadow-rose-500/25 shrink-0">
          ❤️ Bình chọn Cộng đồng
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <project-item
          v-for="vid in allVideos"
          :key="vid.id"
          :video="vid"
          :can-score="false"
          :can-manage="false"
          @click-vote="handleVote"
        />
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- MODAL: NỘP BÀI DỰ THI DÀNH CHO SINH VIÊN -->
    <!-- ======================================================== -->
    <div v-if="showModalSubmit" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div class="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
          <div class="flex items-center gap-3">
            <div class="size-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-xs text-xl">
              🎓
            </div>
            <div>
              <h3 class="text-xl font-extrabold text-slate-900">Nộp bài dự thi sinh viên</h3>
              <p class="text-xs text-slate-500 mt-0.5">Gửi tác phẩm của bạn để tham gia tranh giải</p>
            </div>
          </div>
          <button type="button" @click="showModalSubmit = false" class="btn btn-sm btn-circle btn-ghost text-slate-400">
            ✕
          </button>
        </div>

        <form class="space-y-4" @submit.prevent="submitEntry">
          <!-- Contest Select -->
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Chọn cuộc thi tham gia <span class="text-rose-500">*</span>
            </label>
            <select
              v-model="submission.projectId"
              class="w-full px-4 py-3 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
              required
            >
              <option value="" disabled>-- Chọn cuộc thi --</option>
              <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.name }}</option>
            </select>
          </div>

          <!-- Title -->
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Tên tác phẩm / Video <span class="text-rose-500">*</span>
            </label>
            <input
              type="text"
              v-model="submission.name"
              class="w-full px-4 py-3 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
              required
            />
          </div>

          <!-- Authors & MSSV -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Nhóm tác giả / Thí sinh <span class="text-rose-500">*</span>
              </label>
              <input
                type="text"
                v-model="submission.authorGroup"
                class="w-full px-4 py-3 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                required
              />
            </div>
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Mã sinh viên (MSSV)
              </label>
              <input
                type="text"
                v-model="submission.studentId"
                class="w-full px-4 py-3 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <!-- Class -->
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Lớp / Khoa
            </label>
            <input
              type="text"
              v-model="submission.className"
              class="w-full px-4 py-3 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
            />
          </div>

          <!-- Video Drive Link -->
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Đường dẫn Google Drive Video
            </label>
            <input
              type="url"
              v-model="submission.videoUrl"
              class="w-full px-4 py-3 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
            />
            <p class="text-[11px] text-slate-400 mt-1">Dán liên kết Google Drive video của bạn ở quyền truy cập công khai.</p>
          </div>

          <!-- Thumbnail Upload -->
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Ảnh bìa tác phẩm (Poster / Thumbnail)
            </label>
            <input
              type="file"
              ref="fileInputRef"
              accept="image/*"
              class="hidden"
              @change="handleThumbnailUpload"
            />

            <!-- Preview -->
            <div v-if="thumbnailPreview" class="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 aspect-video group">
              <img :src="thumbnailPreview" alt="preview" class="w-full h-full object-cover" />
              <div class="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  type="button"
                  @click="triggerFileInput"
                  class="px-3 py-1.5 rounded-xl bg-white/90 hover:bg-white text-slate-800 text-xs font-bold transition-all cursor-pointer"
                >
                  Đổi ảnh khác
                </button>
                <button
                  type="button"
                  @click="removeThumbnail"
                  class="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all cursor-pointer"
                >
                  Gỡ ảnh
                </button>
              </div>
            </div>

            <div
              v-else
              @click="triggerFileInput"
              class="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-6 text-center cursor-pointer bg-slate-50/50 hover:bg-blue-50/30 transition-all flex flex-col items-center justify-center gap-2"
            >
              <div class="size-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                <span>📷</span>
              </div>
              <p class="text-xs font-bold text-slate-700">Tải ảnh bìa trực tiếp từ máy tính</p>
              <p class="text-[11px] text-slate-400">Tự động tối ưu hóa và nén ảnh chất lượng cao</p>
            </div>
          </div>

          <!-- Description -->
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Mô tả & Thông điệp tác phẩm
            </label>
            <textarea
              v-model="submission.description"
              rows="3"
              class="w-full px-4 py-3 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all resize-none"
            ></textarea>
          </div>

          <!-- Actions -->
          <div class="modal-action pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              @click="showModalSubmit = false"
              class="px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs sm:text-sm font-semibold cursor-pointer transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              :disabled="isSubmitting"
              class="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-600/25 transition-all flex items-center gap-2 cursor-pointer"
            >
              <span v-if="isSubmitting" class="loading loading-spinner loading-xs"></span>
              <span>{{ isSubmitting ? 'Đang gửi...' : 'Nộp bài dự thi' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- MODAL: CHỈNH SỬA THÔNG TIN BÀI DỰ THI -->
    <!-- ======================================================== -->
    <div v-if="showModalEdit" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div class="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-2xl max-w-lg w-full">
        <div class="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
          <div class="size-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <IconPenToSquare class="size-5 fill-current" />
          </div>
          <div>
            <h3 class="text-lg font-bold text-slate-900">Chỉnh sửa bài dự thi</h3>
            <p class="text-xs text-slate-500">Cập nhật thông tin tác phẩm của bạn</p>
          </div>
        </div>

        <form class="space-y-4" @submit.prevent="updateSubmission">
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Tên tác phẩm <span class="text-rose-500">*</span>
            </label>
            <input
              type="text"
              v-model="editingVideo.name"
              class="w-full px-4 py-3 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all font-medium"
              required
            />
          </div>

          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Nhóm tác giả
            </label>
            <input
              type="text"
              v-model="editingVideo.authorGroup"
              class="w-full px-4 py-3 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all font-medium"
            />
          </div>

          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Đường dẫn Google Drive Video
            </label>
            <input
              type="url"
              v-model="editingVideo.videoUrl"
              class="w-full px-4 py-3 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all font-medium"
            />
          </div>

          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Mô tả tác phẩm
            </label>
            <textarea
              v-model="editingVideo.description"
              rows="3"
              class="w-full px-4 py-3 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all font-medium resize-none"
            ></textarea>
          </div>

          <div class="modal-action pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              @click="showModalEdit = false"
              class="px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs sm:text-sm font-semibold cursor-pointer transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              class="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold shadow-md shadow-blue-600/20 transition-all cursor-pointer"
            >
              Lưu thay đổi
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
