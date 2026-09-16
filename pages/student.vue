<script setup>
import * as data from '~/utils/data-service';
import swal from 'sweetalert2';
import { saveVideoFile, captureVideoThumbnail, formatBytes } from '~/utils/video-storage';

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
  thumbnailUrl: '',
  description: '',
});
const thumbnailPreview = ref('');
const fileInputRef = ref(null);
const isCustomThumbnail = ref(false);
const isExtractingThumb = ref(false);

// Video file upload state
const videoFileInputRef = ref(null);
const videoFile = ref(null);
const videoFileName = ref('');
const videoFileSize = ref(0);
const videoPreviewUrl = ref('');

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

// Image error tracking and initials generators
const failedProjectThumbnails = ref({});
const failedVideoThumbnails = ref({});

function getProjectInitials(name) {
  if (!name) return 'AI';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getProjectGradient(id) {
  const gradients = [
    'from-blue-600 via-indigo-600 to-violet-700',
    'from-violet-600 via-purple-600 to-indigo-800',
    'from-sky-500 via-blue-600 to-indigo-700',
    'from-indigo-600 via-blue-600 to-cyan-700',
    'from-emerald-600 via-teal-600 to-cyan-700',
    'from-rose-500 via-pink-600 to-purple-700',
  ];
  const num = parseInt(String(id).slice(-4)) || 0;
  return gradients[num % gradients.length];
}

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

    // 2. Fetch thumbnails
    let thumbnails = [];
    try {
      thumbnails = await data.find('thumbnails');
    } catch (e) {}

    // Map projects with thumbnails & fast Google CDN URL
    projects.value = (fetchedProjects || [])
      .filter((p) => p.isDisabled != 1)
      .map((p) => {
        let localThumb = null;
        if (process.client) {
          try {
            const saved = JSON.parse(localStorage.getItem('mediaai_thumbnails') || '{}');
            localThumb = saved[String(p.id)] || null;
          } catch (e) {}
        }
        if (localThumb) {
          p.thumbnailUrl = localThumb;
        } else if (!p.thumbnailUrl) {
          let t = (thumbnails || []).find((thumb) => String(thumb.projectId) === String(p.id));
          if (t) p.thumbnailUrl = t.thumbnailUrl || t.url;
        }
        p.thumbnailUrl = data.formatThumbnailUrl(p.thumbnailUrl);
        return p;
      });

    // 3. Fetch all videos & merge with local cache
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

    // Augment videos with scores & votes
    allVideos.value = combined.map(v => {
      const thumb = (thumbnails || []).find(t => String(t.videoId) === String(v.id));
      if (thumb && !v.thumbnailUrl) {
        v.thumbnailUrl = thumb.thumbnailUrl || thumb.url;
      }
      v.thumbnailUrl = data.formatThumbnailUrl(v.thumbnailUrl);
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
    thumbnailUrl: '',
    description: '',
  };
  thumbnailPreview.value = '';
  isCustomThumbnail.value = false;
  isExtractingThumb.value = false;

  videoFile.value = null;
  videoFileName.value = '';
  videoFileSize.value = 0;
  if (videoPreviewUrl.value) {
    URL.revokeObjectURL(videoPreviewUrl.value);
    videoPreviewUrl.value = '';
  }
  if (videoFileInputRef.value) videoFileInputRef.value.value = '';
  if (fileInputRef.value) fileInputRef.value.value = '';

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
      isCustomThumbnail.value = true;
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

async function removeThumbnail() {
  submission.value.thumbnailUrl = '';
  thumbnailPreview.value = '';
  isCustomThumbnail.value = false;
  if (fileInputRef.value) fileInputRef.value.value = '';

  // If a video is currently selected, re-extract thumbnail frame from the video
  if (videoFile.value) {
    isExtractingThumb.value = true;
    try {
      const thumb = await captureVideoThumbnail(videoFile.value);
      if (thumb) {
        submission.value.thumbnailUrl = thumb;
        thumbnailPreview.value = thumb;
      }
    } finally {
      isExtractingThumb.value = false;
    }
  }
}

// Video File Selection & Automatic Frame Extraction
function triggerVideoFileInput() {
  if (videoFileInputRef.value) videoFileInputRef.value.click();
}

async function handleVideoFileSelect(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  if (!file.type.startsWith('video/') && !file.name.match(/\.(mp4|webm|mov|mkv|avi)$/i)) {
    swal.fire({
      icon: 'warning',
      title: 'Tệp không hợp lệ',
      text: 'Vui lòng chọn tệp video (MP4, WEBM, MOV, MKV)',
    });
    return;
  }

  videoFile.value = file;
  videoFileName.value = file.name;
  videoFileSize.value = file.size;

  if (videoPreviewUrl.value) {
    URL.revokeObjectURL(videoPreviewUrl.value);
  }
  videoPreviewUrl.value = URL.createObjectURL(file);

  // Auto set video title from clean file name if currently blank
  if (!submission.value.name.trim()) {
    submission.value.name = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
  }

  // Automatic thumbnail capture: if user hasn't uploaded a custom image, extract frame from this video
  if (!isCustomThumbnail.value || !submission.value.thumbnailUrl) {
    isExtractingThumb.value = true;
    try {
      const thumb = await captureVideoThumbnail(file);
      if (thumb && !isCustomThumbnail.value) {
        submission.value.thumbnailUrl = thumb;
        thumbnailPreview.value = thumb;
      }
    } catch (err) {
      console.warn('Auto video frame capture error:', err);
    } finally {
      isExtractingThumb.value = false;
    }
  }
}

function removeVideoFile() {
  videoFile.value = null;
  videoFileName.value = '';
  videoFileSize.value = 0;
  if (videoPreviewUrl.value) {
    URL.revokeObjectURL(videoPreviewUrl.value);
    videoPreviewUrl.value = '';
  }
  if (videoFileInputRef.value) videoFileInputRef.value.value = '';

  // If thumbnail was auto-captured from video, clear it as well
  if (!isCustomThumbnail.value) {
    submission.value.thumbnailUrl = '';
    thumbnailPreview.value = '';
  }
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
  if (!videoFile.value) {
    swal.fire({
      icon: 'warning',
      title: 'Chưa tải video',
      text: 'Vui lòng chọn tệp video dự thi của bạn trước khi nộp bài.',
    });
    return;
  }

  isSubmitting.value = true;
  const user = currentUser.value;
  const videoId = Date.now();
  const selectedProj = projects.value.find(p => String(p.id) === String(submission.value.projectId));
  const projectName = selectedProj ? selectedProj.name : 'Cuộc thi';
  const uploaderName = user.fullName || user.userName || 'Sinh viên';
  const authorGroup = submission.value.authorGroup.trim() || uploaderName;

  // Format file name for Drive: [Tên dự án]_[Tên người upload]_[Tên video]
  const cleanOriginalName = videoFile.value.name.replace(/[\\/*?:"<>|]/g, '_');
  const formattedDriveFileName = `[${projectName}]_${uploaderName}_${cleanOriginalName}`;

  // If thumbnail is still empty, attempt quick capture
  if (!submission.value.thumbnailUrl && videoFile.value) {
    try {
      const thumb = await captureVideoThumbnail(videoFile.value);
      if (thumb) submission.value.thumbnailUrl = thumb;
    } catch (e) {}
  }

  // Save video file into IndexedDB for persistent local playback
  await saveVideoFile(videoId, videoFile.value);

  const newEntry = {
    id: videoId,
    name: submission.value.name.trim(),
    projectId: submission.value.projectId,
    projectName: projectName,
    authorGroup: authorGroup,
    studentId: user.studentId || '',
    className: user.className || '',
    description: submission.value.description.trim(),
    thumbnailUrl: submission.value.thumbnailUrl,
    createdBy: user.userName || 'student',
    uploaderName: uploaderName,
    folderId: selectedProj?.folderId || '',
    videoFileName: formattedDriveFileName,
    originalFileName: videoFile.value.name,
    videoFileSize: videoFile.value.size,
    videoUrl: videoPreviewUrl.value || '',
    driveFileName: formattedDriveFileName,
    versions: [
      {
        id: Date.now() + 1,
        name: 'v1',
        fileName: formattedDriveFileName,
        videoUrl: videoPreviewUrl.value || '',
        fileSize: videoFile.value.size,
        createdAt: new Date().toLocaleString('en-GB'),
      }
    ],
    done: 0,
    feedbacks: 0,
    avgScore: 0,
    scoreCount: 0,
    scores: [],
    voteCount: 0,
    hasVoted: false,
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
    html: `
      <div class="text-left text-sm space-y-2 mt-2">
        <p>Tác phẩm: <strong>${newEntry.name}</strong></p>
        <p>Cuộc thi: <strong>${newEntry.projectName}</strong></p>
        <p>Tệp video: <strong>${formattedDriveFileName}</strong> (${formatBytes(newEntry.videoFileSize)})</p>
        <div class="mt-3 p-3 rounded-xl bg-blue-50 border border-blue-100 text-blue-800 text-xs flex items-start gap-2">
          <span>📁</span>
          <span>Video đã được tự động liên kết vào thư mục dự án trên Google Drive của bạn.</span>
        </div>
      </div>
    `,
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

// ========================================================
// Community Tab: Search, Filter & Sort State
// ========================================================
const communitySort = ref('most-voted'); // 'most-voted' | 'newest' | 'highest-score' | 'oldest'
const communityFilterContest = ref('all');
const communitySearch = ref('');

const filteredCommunityVideos = computed(() => {
  let list = [...allVideos.value];

  // 1. Filter by Contest
  if (communityFilterContest.value !== 'all') {
    list = list.filter(v => String(v.projectId) === String(communityFilterContest.value));
  }

  // 2. Filter by Search keyword (name, authorGroup, studentId, className, projectName)
  if (communitySearch.value && communitySearch.value.trim()) {
    const q = communitySearch.value.trim().toLowerCase();
    list = list.filter(v => {
      const name = (v.name || '').toLowerCase();
      const author = (v.authorGroup || '').toLowerCase();
      const sid = (v.studentId || '').toLowerCase();
      const cls = (v.className || '').toLowerCase();
      const pName = (v.projectName || '').toLowerCase();
      return name.includes(q) || author.includes(q) || sid.includes(q) || cls.includes(q) || pName.includes(q);
    });
  }

  // 3. Sort
  if (communitySort.value === 'most-voted') {
    // Sắp xếp bài thi được thích / bình chọn nhiều nhất
    list.sort((a, b) => {
      const diff = (b.voteCount || 0) - (a.voteCount || 0);
      if (diff !== 0) return diff;
      return (b.id || 0) - (a.id || 0);
    });
  } else if (communitySort.value === 'newest') {
    // Sắp xếp bài mới nhất
    list.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (dateA && dateB && dateA !== dateB) return dateB - dateA;
      return (Number(b.id) || 0) - (Number(a.id) || 0);
    });
  } else if (communitySort.value === 'highest-score') {
    // Sắp xếp điểm BGK cao nhất
    list.sort((a, b) => {
      const diff = (b.avgScore || 0) - (a.avgScore || 0);
      if (diff !== 0) return diff;
      return (b.voteCount || 0) - (a.voteCount || 0);
    });
  } else if (communitySort.value === 'oldest') {
    // Sắp xếp bài cũ nhất
    list.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (dateA && dateB && dateA !== dateB) return dateA - dateB;
      return (Number(a.id) || 0) - (Number(b.id) || 0);
    });
  }

  return list;
});
</script>

<template>
  <div class="max-w-7xl mx-auto p-4 sm:p-8 flex flex-col gap-6">

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
                v-if="v.thumbnailUrl && !failedVideoThumbnails[v.id]"
                :src="data.formatThumbnailUrl(v.thumbnailUrl)"
                :alt="v.name"
                referrerpolicy="no-referrer"
                loading="lazy"
                @error="failedVideoThumbnails[v.id] = true"
                class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div v-else class="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 text-white p-4 text-center">
                <div class="size-11 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-blue-400 mb-2">
                  <IconCirclePlay class="size-6 fill-current" />
                </div>
                <span class="text-xs font-semibold text-slate-300 line-clamp-1">{{ v.name }}</span>
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
              v-if="p.thumbnailUrl && !failedProjectThumbnails[p.id]"
              :src="data.formatThumbnailUrl(p.thumbnailUrl)"
              :alt="p.name"
              referrerpolicy="no-referrer"
              loading="lazy"
              @error="failedProjectThumbnails[p.id] = true"
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <!-- Fallback Vibrant Card for contests without image or if image link fails -->
            <div
              v-else
              :class="['w-full h-full flex flex-col items-center justify-center text-white p-5 text-center select-none bg-gradient-to-br', getProjectGradient(p.id)]"
            >
              <div class="size-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white mb-2 shadow-inner font-black text-lg">
                {{ getProjectInitials(p.name) }}
              </div>
              <p class="text-xs font-bold text-white/95 line-clamp-1 max-w-[90%]">{{ p.name }}</p>
              <span class="text-[10px] text-white/75 mt-0.5">Cuộc thi sáng tạo video</span>
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
    <div v-else-if="activeTab === 'community'" class="flex flex-col gap-6">
      <!-- FILTER & SORT TOOLBAR -->
      <div class="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <!-- Search input -->
        <div class="relative flex-1 min-w-[240px]">
          <input
            v-model="communitySearch"
            type="text"
            placeholder="Tìm theo tên bài thi, tác giả, MSSV, lớp..."
            class="w-full pl-10 pr-9 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-rose-400 transition-all"
          />
          <svg class="size-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
          </svg>
          <button
            v-if="communitySearch"
            type="button"
            @click="communitySearch = ''"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-sm font-bold p-0.5 cursor-pointer"
          >
            ✕
          </button>
        </div>

        <!-- Contest Select Dropdown -->
        <div class="w-full md:w-56 shrink-0">
          <select
            v-model="communityFilterContest"
            class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-rose-400 transition-all cursor-pointer"
          >
            <option value="all">🏆 Tất cả cuộc thi ({{ allVideos.length }})</option>
            <option v-for="p in projects" :key="p.id" :value="p.id">
              {{ p.name }}
            </option>
          </select>
        </div>

        <!-- Sort Select Dropdown -->
        <div class="w-full md:w-52 shrink-0">
          <select
            v-model="communitySort"
            class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-rose-400 transition-all cursor-pointer"
          >
            <option value="most-voted">❤️ Thích nhiều nhất</option>
            <option value="newest">⏱️ Bài mới nhất</option>
            <option value="highest-score">⭐ Điểm BGK cao nhất</option>
            <option value="oldest">🕒 Bài cũ nhất</option>
          </select>
        </div>

        <!-- Counter -->
        <div class="text-xs text-slate-500 font-medium px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-100 shrink-0 text-center whitespace-nowrap">
          Hiển thị <span class="font-extrabold text-slate-800">{{ filteredCommunityVideos.length }}</span> / {{ allVideos.length }} bài thi
        </div>
      </div>

      <!-- Empty Filter State -->
      <div
        v-if="filteredCommunityVideos.length === 0"
        class="bg-white rounded-3xl border border-slate-200/80 p-12 text-center flex flex-col items-center justify-center max-w-md mx-auto w-full my-6 shadow-xs"
      >
        <div class="size-16 rounded-3xl bg-rose-50 text-rose-500 flex items-center justify-center text-2xl mb-3">
          🔍
        </div>
        <h4 class="font-bold text-slate-800 text-base mb-1">Không tìm thấy bài thi phù hợp</h4>
        <p class="text-xs text-slate-500 max-w-xs mb-4">
          Thử thay đổi từ khóa tìm kiếm hoặc chọn lại cuộc thi khác.
        </p>
        <button
          type="button"
          @click="communitySearch = ''; communityFilterContest = 'all'; communitySort = 'most-voted'"
          class="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
        >
          Đặt lại bộ lọc
        </button>
      </div>

      <!-- Videos Grid -->
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <project-item
          v-for="vid in filteredCommunityVideos"
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

          <!-- Authors (Full width) -->
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Tác giả / Nhóm tác giả <span class="text-rose-500">*</span>
            </label>
            <input
              type="text"
              v-model="submission.authorGroup"
              class="w-full px-4 py-3 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
              placeholder="Họ tên thí sinh hoặc nhóm thực hiện"
              required
            />
          </div>

          <!-- Thumbnail Upload -->
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <label class="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Ảnh bìa (Thumbnail)
              </label>
              <div v-if="thumbnailPreview" class="flex items-center gap-1.5">
                <span
                  v-if="isCustomThumbnail"
                  class="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md flex items-center gap-1"
                >
                  🖼️ Ảnh bìa tải lên
                </span>
                <span
                  v-else
                  class="text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md flex items-center gap-1"
                >
                  🎬 Lấy từ video
                </span>
              </div>
            </div>

            <input
              type="file"
              ref="fileInputRef"
              accept="image/*"
              class="hidden"
              @change="handleThumbnailUpload"
            />

            <!-- Thumbnail Preview -->
            <div v-if="thumbnailPreview" class="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 aspect-video group shadow-xs">
              <img :src="thumbnailPreview" alt="preview" class="w-full h-full object-cover" />
              <div class="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  type="button"
                  @click="triggerFileInput"
                  class="px-3 py-1.5 rounded-xl bg-white/95 hover:bg-white text-slate-800 text-xs font-bold shadow transition-all cursor-pointer"
                >
                  Đổi ảnh
                </button>
                <button
                  v-if="videoFile && isCustomThumbnail"
                  type="button"
                  @click="removeThumbnail"
                  class="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow transition-all cursor-pointer"
                >
                  Lấy từ video
                </button>
                <button
                  type="button"
                  @click="removeThumbnail"
                  class="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow transition-all cursor-pointer"
                >
                  Gỡ ảnh
                </button>
              </div>
            </div>

            <!-- Upload trigger card (Minimal) -->
            <div
              v-else
              @click="triggerFileInput"
              class="border-2 border-dashed border-slate-200 hover:border-blue-500 rounded-2xl p-4 text-center cursor-pointer bg-slate-50/50 hover:bg-blue-50/30 transition-all flex items-center justify-center gap-2"
            >
              <span class="text-lg">📷</span>
              <span class="text-xs font-bold text-slate-600 hover:text-blue-600">Tải ảnh bìa (Tùy chọn)</span>
            </div>

            <div v-if="isExtractingThumb" class="flex items-center gap-2 text-xs text-blue-600 font-medium mt-1.5">
              <span class="loading loading-spinner loading-xs"></span>
              <span>Đang lấy ảnh bìa từ video...</span>
            </div>
          </div>

          <!-- Video File Upload (Placed Directly Below Thumbnail - Minimal) -->
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <label class="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Tệp Video dự thi <span class="text-rose-500">*</span>
              </label>
              <span v-if="videoFile" class="text-[11px] font-medium text-slate-500">
                {{ formatBytes(videoFileSize) }}
              </span>
            </div>

            <input
              type="file"
              ref="videoFileInputRef"
              accept="video/mp4,video/webm,video/quicktime,video/x-matroska,video/*"
              class="hidden"
              @change="handleVideoFileSelect"
            />

            <!-- Empty Dropzone (Clean & Compact) -->
            <div
              v-if="!videoFile"
              @click="triggerVideoFileInput"
              class="border-2 border-dashed border-blue-300 hover:border-blue-600 rounded-2xl p-5 text-center cursor-pointer bg-blue-50/30 hover:bg-blue-50/60 transition-all flex flex-col items-center justify-center gap-2 group"
            >
              <div class="size-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/25 group-hover:scale-105 transition-transform text-lg">
                🎥
              </div>
              <p class="text-xs font-bold text-blue-600">Bấm để chọn tệp video dự thi</p>
            </div>

            <!-- Video Selected Card & Playable Preview (Clean) -->
            <div v-else class="rounded-2xl border border-slate-200 bg-slate-50/60 p-3 space-y-2.5">
              <div class="flex items-center justify-between gap-3">
                <div class="flex items-center gap-2.5 min-w-0">
                  <div class="size-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 font-bold text-base">
                    🎬
                  </div>
                  <div class="min-w-0">
                    <p class="text-xs font-bold text-slate-800 truncate" :title="videoFileName">
                      {{ videoFileName }}
                    </p>
                    <p class="text-[11px] text-slate-500">
                      {{ formatBytes(videoFileSize) }}
                    </p>
                  </div>
                </div>

                <div class="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    @click="triggerVideoFileInput"
                    class="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition-all cursor-pointer"
                  >
                    Đổi video
                  </button>
                  <button
                    type="button"
                    @click="removeVideoFile"
                    class="px-2.5 py-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-medium transition-all cursor-pointer"
                  >
                    Gỡ
                  </button>
                </div>
              </div>

              <!-- Playable Video Preview -->
              <div v-if="videoPreviewUrl" class="rounded-xl overflow-hidden bg-black aspect-video max-h-48 flex items-center justify-center shadow-inner">
                <video :src="videoPreviewUrl" controls class="w-full h-full max-h-48 object-contain"></video>
              </div>
            </div>
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
