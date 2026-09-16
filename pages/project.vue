<script setup>
import * as data from '~/utils/data-service';
import swal from 'sweetalert2';
import { saveVideoFile, captureVideoThumbnail, formatBytes } from '~/utils/video-storage';

useHead({ title: 'Chi tiết Cuộc thi' });

definePageMeta({
  title: 'Cuộc thi Video',
  layout: 'dashboard',
});

const userCookie = useCookie('user');
const currentUser = computed(() => {
  if (!userCookie.value) return { userName: 'guest', fullName: 'Khách', role: 'guest' };
  if (typeof userCookie.value === 'string') {
    try {
      return JSON.parse(userCookie.value);
    } catch {
      return { userName: userCookie.value, fullName: userCookie.value, role: 'student' };
    }
  }
  return userCookie.value;
});

const isStudent = computed(() => currentUser.value?.role === 'student');
const isJudge = computed(() => currentUser.value?.role === 'judge');
const isAdmin = computed(() => currentUser.value?.role === 'admin' || currentUser.value?.userName === 'admin');
const canScore = computed(() => isJudge.value || isAdmin.value);
const canManage = computed(() => isAdmin.value);

const isLoading = ref(true);
const project = ref({});
const videos = ref([]);

// Tab state: 'videos' | 'leaderboard' | 'voting'
const activeTab = ref('videos');
// Video sub-filter: 'all' | 'my'
const videoFilter = ref('all');
// Video display mode: 'grid' | 'list'
const viewMode = ref('grid');

onMounted(() => {
  if (process.client) {
    const savedMode = localStorage.getItem('ta_project_view_mode');
    if (savedMode === 'grid' || savedMode === 'list') {
      viewMode.value = savedMode;
    }
  }
});

watch(viewMode, (newVal) => {
  if (process.client) {
    localStorage.setItem('ta_project_view_mode', newVal);
  }
});

// Submission modal state
const showModalSubmit = ref(false);
const isSubmitting = ref(false);
const submission = ref({
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

// Judge score modal state (Yêu cầu: bỏ phiếu chấm điện tử phức tạp, cho giám khảo ghi điểm đơn giản)
const showModalScore = ref(false);
const isSavingScore = ref(false);
const scoringVideo = ref(null);
const scoreForm = ref({
  score: 8.5,
  comment: '',
});

// Edit modal state
const selectedVideo = ref({
  name: '',
  createdBy: '',
  createdAt: '',
});
const showModalEdit = ref(false);

onBeforeMount(async () => {
  await fetchData();
  if (project.value?.name) {
    useHead({ title: project.value.name });
    useRoute().meta.title = 'Cuộc thi ' + project.value.name;
  }
});

async function fetchData() {
  isLoading.value = true;
  const projectId = useRoute().query.id;

  try {
    const projects = await data.find('projects');
    const temp = projects.find((p) => String(p.id) === String(projectId));
    if (!temp) return useRouter().push('/projects');
    temp.thumbnailUrl = data.formatThumbnailUrl(temp.thumbnailUrl);
    project.value = temp;

    // Fetch videos from sheet
    let sheetVideos = [];
    try {
      sheetVideos = await data.find('videos');
    } catch (e) {
      sheetVideos = [];
    }

    // Merge with local cached videos
    const localVideos = data.getLocalVideos(projectId);
    const combined = [...localVideos];
    sheetVideos
      .filter((v) => String(v.projectId) === String(projectId) && v.isDisabled != 1)
      .forEach((sv) => {
        if (!combined.some((cv) => String(cv.id) === String(sv.id))) {
          combined.push(sv);
        }
      });

    // Get thumbnails
    let thumbnails = [];
    try {
      thumbnails = await data.find('thumbnails');
    } catch (e) {
      thumbnails = [];
    }

    // Get versions & feedbacks
    let versions = [];
    try {
      versions = await data.find('versions');
    } catch (e) {
      versions = [];
    }
    let feedbacks = [];
    try {
      feedbacks = await data.find('feedbacks');
    } catch (e) {
      feedbacks = [];
    }

    // Augment videos with scores and votes
    videos.value = combined.map((v) => {
      // Thumbnail
      const thumb = thumbnails.find((t) => String(t.videoId) === String(v.id));
      if (thumb && !v.thumbnailUrl) {
        v.thumbnailUrl = thumb.thumbnailUrl || thumb.url;
      }
      v.thumbnailUrl = data.formatThumbnailUrl(v.thumbnailUrl);

      // Versions
      v.versions = versions.filter((ver) => String(ver.videoId) === String(v.id));
      const done = v.versions.filter((ver) => ver.status == 1);
      if (done.length) v.done = 1;

      // Feedbacks
      const latestVer = v.versions[v.versions.length - 1];
      v.feedbacks = latestVer ? feedbacks.filter((f) => String(f.versionId) === String(latestVer.id)).length : 0;

      // Judge Scores & Averages
      const scoreData = data.calculateVideoScores(v.id);
      v.avgScore = scoreData.avgScore;
      v.scoreCount = scoreData.count;
      v.scores = scoreData.scores;

      // Community Votes
      v.voteCount = data.countVideoVotes(v.id);
      v.hasVoted = data.hasUserVoted(v.id, currentUser.value?.userName);

      return v;
    });
  } catch (err) {
    console.error('Error fetching project data:', err);
  } finally {
    isLoading.value = false;
  }
}

// Filtered videos based on 'all' or 'my'
const filteredVideos = computed(() => {
  if (videoFilter.value === 'my') {
    const curUser = currentUser.value?.userName;
    const curStudentId = currentUser.value?.studentId;
    return videos.value.filter(
      (v) =>
        (v.createdBy && v.createdBy === curUser) ||
        (curStudentId && v.studentId === curStudentId) ||
        (v.authorGroup && v.authorGroup.toLowerCase().includes((currentUser.value?.fullName || '').toLowerCase()))
    );
  }
  return videos.value;
});

// Leaderboard sorted by avgScore (descending)
const leaderboardVideos = computed(() => {
  return [...videos.value]
    .filter((v) => v.scoreCount > 0)
    .sort((a, b) => (b.avgScore || 0) - (a.avgScore || 0));
});

// Community voting leaderboard sorted by voteCount (descending)
const votingLeaderboard = computed(() => {
  return [...videos.value].sort((a, b) => (b.voteCount || 0) - (a.voteCount || 0));
});

// Total community votes in this contest
const totalVotesInContest = computed(() => {
  return videos.value.reduce((acc, v) => acc + (v.voteCount || 0), 0);
});

// Reset submission form
function openSubmitModal() {
  const user = currentUser.value;
  submission.value = {
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

// Handle image upload with canvas compression
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
  const projectName = project.value?.name || 'Cuộc thi';
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

  // Upload video to Google Drive
  let driveUploaded = null;
  if (videoFile.value) {
    try {
      const submitUserName = (user.userName || user.fullName || 'student').trim();
      driveUploaded = await data.uploadVideoToDrive({
        file: videoFile.value,
        folderId: project.value?.folderId || '',
        fileName: formattedDriveFileName,
        videoId: videoId,
        projectId: project.value?.id || '',
        projectName: projectName,
        videoName: submission.value.name.trim(),
        createdBy: uploaderName,
        userName: submitUserName,
      });
    } catch (e) {
      console.warn('Google Drive auto-upload warning:', e);
    }
  }

  const finalVideoUrl = driveUploaded?.directUrl || videoPreviewUrl.value || '';
  const finalDriveFileId = driveUploaded?.fileId || '';

  const newEntry = {
    id: videoId,
    name: submission.value.name.trim(),
    projectId: project.value.id,
    projectName: projectName,
    authorGroup: authorGroup,
    studentId: user.studentId || '',
    className: user.className || '',
    description: submission.value.description.trim(),
    thumbnailUrl: submission.value.thumbnailUrl,
    createdBy: user.userName || 'student',
    uploaderName: uploaderName,
    folderId: project.value?.folderId || '',
    driveFileId: finalDriveFileId,
    videoFileName: formattedDriveFileName,
    originalFileName: videoFile.value.name,
    videoFileSize: videoFile.value.size,
    videoUrl: finalVideoUrl,
    driveUrl: driveUploaded?.driveUrl || '',
    driveFileName: formattedDriveFileName,
    versions: [
      {
        id: Date.now() + 1,
        name: 'v1',
        fileName: formattedDriveFileName,
        fileId: finalDriveFileId,
        videoUrl: finalVideoUrl,
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

  // Cache locally
  data.saveLocalVideo(newEntry);
  videos.value.unshift(newEntry);

  // Sync to backend
  try {
    await data.createVideo(newEntry);
  } catch (err) {
    console.warn('Backend createVideo sync warning:', err);
  }

  isSubmitting.value = false;
  showModalSubmit.value = false;

  swal.fire({
    icon: 'success',
    title: 'Nộp bài thành công!',
    html: `
      <div class="text-left text-sm space-y-2 mt-2">
        <p>Tác phẩm: <strong>${newEntry.name}</strong></p>
        <p>Cuộc thi: <strong>${projectName}</strong></p>
      </div>
    `,
    confirmButtonText: 'Tuyệt vời',
    confirmButtonColor: '#2563eb',
  });
}

// Open scoring modal for Judge / Admin (Yêu cầu: bỏ phiếu chấm điện tử, cho giám khảo ghi điểm)
function openScoreModal(video) {
  scoringVideo.value = video;
  // If current judge has previously scored, preload their score
  const existing = (video.scores || []).find((s) => s.judgeUserName === currentUser.value?.userName);
  if (existing) {
    scoreForm.value = {
      score: existing.score,
      comment: existing.comment || '',
    };
  } else {
    scoreForm.value = {
      score: 8.5,
      comment: '',
    };
  }
  showModalScore.value = true;
}

// Quick score setter helper
function setScoreQuick(val) {
  scoreForm.value.score = val;
}

// Save judge score
async function saveJudgeScore() {
  if (!scoringVideo.value) return;

  const numericScore = parseFloat(scoreForm.value.score);
  if (isNaN(numericScore) || numericScore < 0 || numericScore > 10) {
    swal.fire({ icon: 'warning', title: 'Điểm không hợp lệ', text: 'Vui lòng nhập điểm từ 0.0 đến 10.0' });
    return;
  }

  isSavingScore.value = true;
  try {
    await data.submitScore({
      videoId: scoringVideo.value.id,
      projectId: project.value.id,
      judgeUserName: currentUser.value?.userName || 'judge',
      judgeFullName: currentUser.value?.fullName || currentUser.value?.userName || 'Giám khảo',
      score: numericScore,
      comment: scoreForm.value.comment.trim(),
    });

    // Update locally in videos list
    const scoreData = data.calculateVideoScores(scoringVideo.value.id);
    const target = videos.value.find((v) => String(v.id) === String(scoringVideo.value.id));
    if (target) {
      target.avgScore = scoreData.avgScore;
      target.scoreCount = scoreData.count;
      target.scores = scoreData.scores;
    }

    showModalScore.value = false;
    swal.fire({
      icon: 'success',
      title: 'Đã lưu điểm!',
      text: `Đã ghi nhận điểm ${numericScore}/10 cho tác phẩm "${scoringVideo.value.name}". Điểm TB hiện tại: ${scoreData.avgScore}/10.`,
      timer: 1800,
      showConfirmButton: false,
    });
  } catch (err) {
    swal.fire({ icon: 'error', title: 'Lỗi', text: err?.message || 'Không thể lưu điểm' });
  } finally {
    isSavingScore.value = false;
  }
}

// Community Voting handler (Nút Tim / Vote)
async function handleVote(video) {
  if (!currentUser.value || currentUser.value.role === 'guest') {
    swal.fire({
      icon: 'info',
      title: 'Cần đăng nhập',
      text: 'Vui lòng đăng nhập tài khoản để tham gia bình chọn cho tác phẩm yêu thích!',
      showCancelButton: true,
      confirmButtonText: 'Đăng nhập ngay',
      cancelButtonText: 'Để sau',
    }).then((res) => {
      if (res.isConfirmed) useRouter().push('/login');
    });
    return;
  }

  try {
    const isNowVoted = await data.toggleVote({
      projectId: project.value.id,
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
      toast.fire({
        icon: 'success',
        title: `❤️ Đã bình chọn cho "${video.name}"!`,
      });
    } else {
      toast.fire({
        icon: 'info',
        title: `Đã hủy bình chọn cho "${video.name}".`,
      });
    }
  } catch (err) {
    swal.fire({ icon: 'error', title: 'Lỗi', text: err?.message || 'Không thể thực hiện bình chọn' });
  }
}

// Delete video
async function deleteVideo(video) {
  swal
    .fire({
      title: 'Xác nhận xóa',
      text: `Bạn có chắc chắn muốn xóa bài thi "${video.name}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Xóa',
      cancelButtonText: 'Hủy',
      confirmButtonColor: '#e11d48',
    })
    .then((result) => {
      if (result.isConfirmed) {
        data.update('videos', { id: video.id, isDisabled: 1 });
        data.removeLocalVideo(video.id);
        videos.value = videos.value.filter((v) => v.id !== video.id);
      }
    });
}

function showEditVideo(video) {
  selectedVideo.value = JSON.parse(JSON.stringify(video));
  showModalEdit.value = true;
}

function updateVideo() {
  data.update('videos', selectedVideo.value);
  data.saveLocalVideo(selectedVideo.value);
  const index = videos.value.findIndex((v) => v.id == selectedVideo.value.id);
  if (index !== -1) {
    videos.value[index] = { ...videos.value[index], ...selectedVideo.value };
  }
  showModalEdit.value = false;
  swal.fire({
    icon: 'success',
    title: 'Đã cập nhật',
    timer: 1200,
    showConfirmButton: false,
  });
}
</script>

<template>
  <div class="max-w-7xl mx-auto p-4 sm:p-8 flex flex-col gap-6">
    <!-- Breadcrumbs & Navigation Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs">
      <div class="flex items-center gap-4">
        <NuxtLink
          to="/projects"
          class="size-11 rounded-2xl bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 flex items-center justify-center transition-colors shrink-0"
          title="Quay lại danh sách cuộc thi"
        >
          <IconAngleLeft class="size-5 fill-current" />
        </NuxtLink>

        <div>
          <div class="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-0.5">
            <NuxtLink to="/projects" class="hover:text-blue-600 transition-colors">Cuộc thi</NuxtLink>
            <span>/</span>
            <span class="text-blue-600 font-semibold truncate max-w-xs">{{ project.name || 'Chi tiết' }}</span>
          </div>
          <h1 class="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5 flex-wrap">
            <span>{{ project.name || 'Đang tải cuộc thi...' }}</span>
            <!-- User Role Badge -->
            <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold border"
              :class="[
                isJudge ? 'bg-amber-50 text-amber-700 border-amber-200' :
                isAdmin ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                'bg-blue-50 text-blue-700 border-blue-200'
              ]">
              <span v-if="isJudge">⚖️ Ban Giám khảo</span>
              <span v-else-if="isAdmin">🛡️ Quản trị viên</span>
              <span v-else>🎓 Sinh viên</span>
            </span>
          </h1>
          <p v-if="project.description" class="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
            {{ project.description }}
          </p>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex items-center gap-2.5 self-end sm:self-center flex-wrap">
        <!-- Sheet trigger if available -->
        <label
          v-if="project.sheetUrl"
          for="show-sheet"
          class="cursor-pointer px-4 py-2.5 rounded-2xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs sm:text-sm flex items-center gap-2 transition-colors"
        >
          <IconFile class="size-4 fill-current" />
          <span>Kịch bản Sheet</span>
        </label>

        <!-- Submit entry button (Nổi bật cho sinh viên & tất cả thí sinh) -->
        <button
          type="button"
          @click="openSubmitModal"
          class="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/35 transition-all active:scale-95 cursor-pointer"
        >
          <IconPlus class="size-4 fill-current" />
          <span>Nộp bài dự thi</span>
        </button>
      </div>
    </div>

    <!-- Main Navigation Tabs: Bài thi | BXH Chuyên môn | Bình chọn Cộng đồng -->
    <div class="bg-white p-2 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between gap-2 overflow-x-auto">
      <div class="flex items-center gap-1.5 sm:gap-2">
        <button
          type="button"
          @click="activeTab = 'videos'"
          :class="[
            'px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap',
            activeTab === 'videos'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          ]"
        >
          <span>🎬 Danh sách bài thi</span>
          <span
            :class="[
              'px-2 py-0.5 rounded-full text-[11px]',
              activeTab === 'videos' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
            ]"
          >
            {{ videos.length }}
          </span>
        </button>

        <button
          type="button"
          @click="activeTab = 'leaderboard'"
          :class="[
            'px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap',
            activeTab === 'leaderboard'
              ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-white shadow-md shadow-amber-500/25'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          ]"
        >
          <span>🏆 BXH Chuyên môn</span>
          <span
            :class="[
              'px-2 py-0.5 rounded-full text-[11px]',
              activeTab === 'leaderboard' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
            ]"
          >
            {{ leaderboardVideos.length }}
          </span>
        </button>

        <button
          type="button"
          @click="activeTab = 'voting'"
          :class="[
            'px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap',
            activeTab === 'voting'
              ? 'bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-md shadow-rose-500/25'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          ]"
        >
          <span>❤️ Bình chọn Yêu thích</span>
          <span
            :class="[
              'px-2 py-0.5 rounded-full text-[11px]',
              activeTab === 'voting' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
            ]"
          >
            {{ totalVotesInContest }} vote
          </span>
        </button>
      </div>

      <!-- View Switcher & Sub-filter (when in videos tab) -->
      <div v-if="activeTab === 'videos'" class="flex items-center gap-2 shrink-0">
        <!-- Nút chuyển đổi Dạng lưới / Dạng danh sách (Đặt trước filter Tất cả / Bài của tôi) -->
        <div class="flex items-center gap-0.5 sm:gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            @click="viewMode = 'grid'"
            :class="[
              'px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5',
              viewMode === 'grid' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            ]"
            title="Hiển thị dạng lưới"
          >
            <svg class="size-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M3 3h7v7H3V3zm11 0h7v7h-7V3zm-11 11h7v7H3v-7zm11 0h7v7h-7v-7z"/>
            </svg>
            <span class="hidden sm:inline">Lưới</span>
          </button>
          <button
            type="button"
            @click="viewMode = 'list'"
            :class="[
              'px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5',
              viewMode === 'list' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            ]"
            title="Hiển thị dạng danh sách"
          >
            <svg class="size-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/>
            </svg>
            <span class="hidden sm:inline">Danh sách</span>
          </button>
        </div>

        <!-- Quick Sub-filter (Tất cả / Bài của tôi) -->
        <div class="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            @click="videoFilter = 'all'"
            :class="[
              'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer',
              videoFilter === 'all' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            ]"
          >
            Tất cả ({{ videos.length }})
          </button>
          <button
            type="button"
            @click="videoFilter = 'my'"
            :class="[
              'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer',
              videoFilter === 'my' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            ]"
          >
            Bài của tôi
          </button>
        </div>
      </div>
    </div>

    <!-- Skeleton Loading -->
    <projects-skeleton v-if="isLoading" />

    <!-- ======================================================== -->
    <!-- TAB 1: DANH SÁCH BÀI DỰ THI -->
    <!-- ======================================================== -->
    <div v-else-if="activeTab === 'videos'">
      <!-- Empty State -->
      <div
        v-if="filteredVideos.length === 0"
        class="bg-white rounded-3xl border border-slate-200/80 p-12 text-center flex flex-col items-center justify-center max-w-md mx-auto w-full my-8 shadow-xs"
      >
        <div class="size-16 rounded-3xl bg-blue-50 flex items-center justify-center text-blue-600 mb-4 ring-8 ring-blue-50/50">
          <IconCirclePlay class="size-8 fill-current" />
        </div>
        <h3 class="text-lg font-bold text-slate-800 mb-1">
          {{ videoFilter === 'my' ? 'Bạn chưa nộp bài thi nào' : 'Chưa có bài thi nào trong cuộc thi này' }}
        </h3>
        <p class="text-xs sm:text-sm text-slate-500 max-w-sm mb-6">
          {{ videoFilter === 'my' ? 'Hãy bấm nút bên dưới để nộp tác phẩm dự thi đầu tiên của bạn.' : 'Hãy là người đầu tiên đăng ký và nộp video tham gia cuộc thi.' }}
        </p>
        <button
          type="button"
          @click="openSubmitModal"
          class="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-md shadow-blue-600/20 transition-all cursor-pointer"
        >
          <IconPlus class="size-4 fill-current" />
          <span>Nộp bài ngay</span>
        </button>
      </div>

      <!-- Videos Display: Grid or List -->
      <div v-else>
        <!-- Dạng lưới (Grid) -->
        <div v-if="viewMode === 'grid'" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <project-item
            v-for="vid in filteredVideos"
            :key="vid.id"
            layout="grid"
            :video="vid"
            :can-score="canScore"
            :can-manage="canManage || vid.createdBy === currentUser?.userName"
            @click-delete="deleteVideo"
            @click-edit="showEditVideo"
            @click-score="openScoreModal"
            @click-vote="handleVote"
          />
        </div>

        <!-- Dạng danh sách (List) -->
        <div v-else-if="viewMode === 'list'" class="flex flex-col gap-3">
          <project-item
            v-for="vid in filteredVideos"
            :key="vid.id"
            layout="list"
            :video="vid"
            :can-score="canScore"
            :can-manage="canManage || vid.createdBy === currentUser?.userName"
            @click-delete="deleteVideo"
            @click-edit="showEditVideo"
            @click-score="openScoreModal"
            @click-vote="handleVote"
          />
        </div>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- TAB 2: BẢNG XẾP HẠNG CHUYÊN MÔN (LEADERBOARD) -->
    <!-- ======================================================== -->
    <div v-else-if="activeTab === 'leaderboard'" class="flex flex-col gap-6">
      <!-- Info Header -->
      <div class="bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 rounded-3xl p-6 sm:p-8 text-white shadow-lg shadow-amber-500/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span class="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold uppercase tracking-wider">
            Đánh giá Ban Giám khảo
          </span>
          <h2 class="text-2xl sm:text-3xl font-black mt-2 tracking-tight">
            Bảng Xếp Hạng Chuyên Môn
          </h2>
          <p class="text-amber-100 text-xs sm:text-sm mt-1 max-w-xl">
            Hệ thống tự động tổng hợp điểm đánh giá từ nhiều giám khảo, loại bỏ thao tác thủ công và xếp hạng theo Điểm trung bình chuyên môn.
          </p>
        </div>
        <div class="bg-white/15 backdrop-blur-md rounded-2xl p-4 text-center shrink-0 border border-white/20">
          <div class="text-3xl font-black">{{ leaderboardVideos.length }}</div>
          <div class="text-xs text-amber-100 font-medium">Tác phẩm đã chấm</div>
        </div>
      </div>

      <!-- Empty State if no scores yet -->
      <div
        v-if="leaderboardVideos.length === 0"
        class="bg-white rounded-3xl border border-slate-200/80 p-12 text-center flex flex-col items-center justify-center max-w-md mx-auto w-full my-8 shadow-xs"
      >
        <div class="size-16 rounded-3xl bg-amber-50 flex items-center justify-center text-amber-600 mb-4 ring-8 ring-amber-50/50">
          <span class="text-2xl">⚖️</span>
        </div>
        <h3 class="text-lg font-bold text-slate-800 mb-1">Chưa có bài thi nào được chấm</h3>
        <p class="text-xs sm:text-sm text-slate-500 max-w-sm mb-6">
          Ban Giám khảo đang tiến hành đánh giá các bài thi. Bảng xếp hạng sẽ tự động cập nhật ngay khi có điểm.
        </p>
        <button
          v-if="canScore && videos.length > 0"
          type="button"
          @click="openScoreModal(videos[0])"
          class="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-md shadow-amber-600/20 transition-all cursor-pointer"
        >
          <span>⚖️</span>
          <span>Bắt đầu chấm điểm bài đầu tiên</span>
        </button>
      </div>

      <div v-else class="flex flex-col gap-6">
        <!-- Top 3 Podium Highlights -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          <!-- Top 1 Gold -->
          <div
            v-if="leaderboardVideos[0]"
            class="order-1 md:order-2 bg-gradient-to-b from-amber-100/90 via-amber-50/50 to-white rounded-3xl border-2 border-amber-300 p-6 shadow-xl shadow-amber-500/10 flex flex-col items-center text-center relative overflow-hidden"
          >
            <div class="absolute top-0 right-0 bg-gradient-to-l from-amber-400 to-yellow-500 text-white text-[11px] font-black px-4 py-1 rounded-bl-2xl uppercase tracking-wider shadow-sm">
              🥇 Giải Nhất
            </div>
            <div class="size-16 rounded-2xl bg-amber-400 text-white flex items-center justify-center text-3xl font-black shadow-lg shadow-amber-500/30 mb-3 mt-2 ring-4 ring-amber-200">
              1
            </div>
            <NuxtLink :to="'/video?id=' + leaderboardVideos[0].id" class="font-extrabold text-slate-900 text-base hover:text-blue-600 transition-colors line-clamp-2">
              {{ leaderboardVideos[0].name }}
            </NuxtLink>
            <p class="text-xs text-slate-500 mt-1 font-medium">
              🎓 {{ leaderboardVideos[0].authorGroup || leaderboardVideos[0].createdBy }}
            </p>
            <div class="mt-4 flex items-center gap-2">
              <span class="px-4 py-1.5 rounded-2xl bg-amber-500 text-white font-black text-lg shadow-md shadow-amber-500/25">
                {{ leaderboardVideos[0].avgScore }} / 10
              </span>
              <span class="text-xs text-slate-400 font-semibold">({{ leaderboardVideos[0].scoreCount }} giám khảo)</span>
            </div>
          </div>

          <!-- Top 2 Silver -->
          <div
            v-if="leaderboardVideos[1]"
            class="order-2 md:order-1 bg-gradient-to-b from-slate-100/90 via-slate-50/50 to-white rounded-3xl border-2 border-slate-300 p-6 shadow-md flex flex-col items-center text-center relative overflow-hidden"
          >
            <div class="absolute top-0 right-0 bg-slate-400 text-white text-[11px] font-black px-4 py-1 rounded-bl-2xl uppercase tracking-wider shadow-sm">
              🥈 Giải Nhì
            </div>
            <div class="size-14 rounded-2xl bg-slate-400 text-white flex items-center justify-center text-2xl font-black shadow-md mb-3 mt-2 ring-4 ring-slate-200">
              2
            </div>
            <NuxtLink :to="'/video?id=' + leaderboardVideos[1].id" class="font-bold text-slate-900 text-sm hover:text-blue-600 transition-colors line-clamp-2">
              {{ leaderboardVideos[1].name }}
            </NuxtLink>
            <p class="text-xs text-slate-500 mt-1 font-medium">
              🎓 {{ leaderboardVideos[1].authorGroup || leaderboardVideos[1].createdBy }}
            </p>
            <div class="mt-4 flex items-center gap-2">
              <span class="px-3.5 py-1.5 rounded-2xl bg-slate-700 text-white font-black text-base shadow-sm">
                {{ leaderboardVideos[1].avgScore }} / 10
              </span>
              <span class="text-xs text-slate-400 font-semibold">({{ leaderboardVideos[1].scoreCount }} GK)</span>
            </div>
          </div>

          <!-- Top 3 Bronze -->
          <div
            v-if="leaderboardVideos[2]"
            class="order-3 bg-gradient-to-b from-orange-100/80 via-orange-50/40 to-white rounded-3xl border-2 border-orange-200 p-6 shadow-md flex flex-col items-center text-center relative overflow-hidden"
          >
            <div class="absolute top-0 right-0 bg-amber-700 text-white text-[11px] font-black px-4 py-1 rounded-bl-2xl uppercase tracking-wider shadow-sm">
              🥉 Giải Ba
            </div>
            <div class="size-14 rounded-2xl bg-amber-700 text-white flex items-center justify-center text-2xl font-black shadow-md mb-3 mt-2 ring-4 ring-orange-200">
              3
            </div>
            <NuxtLink :to="'/video?id=' + leaderboardVideos[2].id" class="font-bold text-slate-900 text-sm hover:text-blue-600 transition-colors line-clamp-2">
              {{ leaderboardVideos[2].name }}
            </NuxtLink>
            <p class="text-xs text-slate-500 mt-1 font-medium">
              🎓 {{ leaderboardVideos[2].authorGroup || leaderboardVideos[2].createdBy }}
            </p>
            <div class="mt-4 flex items-center gap-2">
              <span class="px-3.5 py-1.5 rounded-2xl bg-amber-800 text-white font-black text-base shadow-sm">
                {{ leaderboardVideos[2].avgScore }} / 10
              </span>
              <span class="text-xs text-slate-400 font-semibold">({{ leaderboardVideos[2].scoreCount }} GK)</span>
            </div>
          </div>
        </div>

        <!-- Full Ranked Table -->
        <div class="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-xs">
          <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 class="font-extrabold text-slate-900 text-base">Toàn bộ Bảng xếp hạng Điểm số</h3>
            <span class="text-xs text-slate-400 font-medium">Sắp xếp theo Điểm Trung Bình</span>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs sm:text-sm">
              <thead class="bg-slate-50 text-slate-500 uppercase tracking-wider text-[11px] font-bold border-b border-slate-100">
                <tr>
                  <th class="py-3.5 px-4 text-center w-16">Thứ hạng</th>
                  <th class="py-3.5 px-4">Tác phẩm dự thi</th>
                  <th class="py-3.5 px-4">Tác giả / Nhóm</th>
                  <th class="py-3.5 px-4 text-center">Điểm TB</th>
                  <th class="py-3.5 px-4 text-center">Số GK chấm</th>
                  <th class="py-3.5 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr
                  v-for="(vid, idx) in leaderboardVideos"
                  :key="vid.id"
                  class="hover:bg-blue-50/40 transition-colors"
                >
                  <td class="py-4 px-4 text-center">
                    <span
                      :class="[
                        'inline-flex items-center justify-center size-8 rounded-xl font-black text-xs',
                        idx === 0 ? 'bg-amber-400 text-white shadow-sm ring-2 ring-amber-200' :
                        idx === 1 ? 'bg-slate-400 text-white shadow-sm ring-2 ring-slate-200' :
                        idx === 2 ? 'bg-amber-700 text-white shadow-sm ring-2 ring-amber-600' :
                        'bg-slate-100 text-slate-700 font-bold'
                      ]"
                    >
                      {{ idx + 1 }}
                    </span>
                  </td>
                  <td class="py-4 px-4 font-bold text-slate-900">
                    <NuxtLink :to="'/video?id=' + vid.id" class="hover:text-blue-600 transition-colors">
                      {{ vid.name }}
                    </NuxtLink>
                  </td>
                  <td class="py-4 px-4 text-slate-600 font-medium">
                    <div>{{ vid.authorGroup || vid.createdBy }}</div>
                    <div v-if="vid.studentId" class="text-[11px] text-slate-400">MSSV: {{ vid.studentId }} {{ vid.className ? '• ' + vid.className : '' }}</div>
                  </td>
                  <td class="py-4 px-4 text-center">
                    <span class="px-3 py-1 rounded-xl bg-emerald-50 text-emerald-700 font-extrabold text-sm border border-emerald-200">
                      {{ vid.avgScore }}
                    </span>
                  </td>
                  <td class="py-4 px-4 text-center text-slate-500 font-medium">
                    {{ vid.scoreCount }} giám khảo
                  </td>
                  <td class="py-4 px-4 text-right">
                    <div class="flex items-center justify-end gap-2">
                      <button
                        v-if="canScore"
                        type="button"
                        @click="openScoreModal(vid)"
                        class="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs transition-colors cursor-pointer"
                      >
                        Chấm điểm
                      </button>
                      <NuxtLink
                        :to="'/video?id=' + vid.id"
                        class="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors"
                      >
                        Xem video
                      </NuxtLink>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- TAB 3: BÌNH CHỌN CỘNG ĐỒNG (COMMUNITY VOTING) -->
    <!-- ======================================================== -->
    <div v-else-if="activeTab === 'voting'" class="flex flex-col gap-6">
      <!-- Voting Ranked List -->
      <div class="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-xs">
        <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 class="font-extrabold text-slate-900 text-base">Danh sách Xếp hạng Bình chọn</h3>
          <span class="text-xs text-slate-400 font-medium">Bấm ❤️ để bình chọn trực tiếp</span>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs sm:text-sm">
            <thead class="bg-slate-50 text-slate-500 uppercase tracking-wider text-[11px] font-bold border-b border-slate-100">
              <tr>
                <th class="py-3.5 px-4 text-center w-16">Hạng</th>
                <th class="py-3.5 px-4">Tác phẩm</th>
                <th class="py-3.5 px-4">Tác giả / Lớp</th>
                <th class="py-3.5 px-4 text-center">Lượt bình chọn</th>
                <th class="py-3.5 px-4 text-right">Bình chọn</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr
                v-for="(vid, idx) in votingLeaderboard"
                :key="vid.id"
                class="hover:bg-rose-50/30 transition-colors"
              >
                <td class="py-4 px-4 text-center">
                  <span
                    :class="[
                      'inline-flex items-center justify-center size-8 rounded-xl font-black text-xs',
                      idx === 0 && vid.voteCount > 0 ? 'bg-rose-500 text-white shadow-sm' :
                      idx === 1 && vid.voteCount > 0 ? 'bg-pink-500 text-white shadow-sm' :
                      idx === 2 && vid.voteCount > 0 ? 'bg-pink-400 text-white shadow-sm' :
                      'bg-slate-100 text-slate-700 font-bold'
                    ]"
                  >
                    {{ idx + 1 }}
                  </span>
                </td>
                <td class="py-4 px-4 font-bold text-slate-900">
                  <NuxtLink :to="'/video?id=' + vid.id" class="hover:text-rose-600 transition-colors">
                    {{ vid.name }}
                  </NuxtLink>
                </td>
                <td class="py-4 px-4 text-slate-600 font-medium">
                  <div>{{ vid.authorGroup || vid.createdBy }}</div>
                  <div v-if="vid.studentId" class="text-[11px] text-slate-400">{{ vid.studentId }} {{ vid.className ? '• ' + vid.className : '' }}</div>
                </td>
                <td class="py-4 px-4 text-center">
                  <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-rose-50 text-rose-600 font-black text-sm border border-rose-200">
                    <svg class="size-3.5 fill-current" viewBox="0 0 24 24">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                    <span>{{ vid.voteCount || 0 }}</span>
                  </span>
                </td>
                <td class="py-4 px-4 text-right">
                  <button
                    type="button"
                    @click="handleVote(vid)"
                    :class="[
                      'px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 ml-auto cursor-pointer active:scale-90',
                      vid.hasVoted
                        ? 'bg-rose-500 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-rose-100 text-slate-700 hover:text-rose-600'
                    ]"
                  >
                    <svg class="size-3.5 fill-current" viewBox="0 0 24 24">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                    <span>{{ vid.hasVoted ? 'Đã vote' : 'Bình chọn' }}</span>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- MODAL 1: ĐĂNG KÝ & NỘP BÀI DỰ THI (SUBMISSION MODAL) -->
    <!-- ======================================================== -->
    <div v-if="showModalSubmit" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div class="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
          <div class="flex items-center gap-3">
            <div class="size-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-xs">
              <IconPlus class="size-5 fill-current" />
            </div>
            <div>
              <h3 class="text-xl font-extrabold text-slate-900">Đăng ký & Nộp bài dự thi</h3>
              <p class="text-xs text-slate-500 mt-0.5">Điền thông tin tác phẩm video của bạn để tham dự cuộc thi</p>
            </div>
          </div>
          <button
            type="button"
            @click="showModalSubmit = false"
            class="btn btn-sm btn-circle btn-ghost text-slate-400 hover:text-slate-700"
          >
            ✕
          </button>
        </div>

        <form class="space-y-4" @submit.prevent="submitEntry">
          <!-- Video Title -->
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Tên tác phẩm / Video <span class="text-rose-500">*</span>
            </label>
            <input
              type="text"
              v-model="submission.name"
              class="w-full px-4 py-3 rounded-xl border border-slate-300 bg-slate-50/50 text-slate-900 text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
              required
            />
          </div>

          <!-- Author Group (Full width) -->
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Tác giả / Nhóm tác giả <span class="text-rose-500">*</span>
            </label>
            <input
              type="text"
              v-model="submission.authorGroup"
              class="w-full px-4 py-3 rounded-xl border border-slate-300 bg-slate-50/50 text-slate-900 text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
              placeholder="Họ tên thí sinh hoặc nhóm thực hiện"
              required
            />
          </div>

          <!-- Thumbnail Cover Upload -->
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
              Hủy bỏ
            </button>
            <button
              type="submit"
              :disabled="isSubmitting"
              class="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-600/25 transition-all flex items-center gap-2 cursor-pointer"
            >
              <span v-if="isSubmitting" class="loading loading-spinner loading-xs"></span>
              <span>{{ isSubmitting ? 'Đang gửi bài...' : 'Xác nhận Nộp bài' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- MODAL 2: GHI ĐIỂM BAN GIÁM KHẢO (ĐƠN GIẢN, TRỰC TIẾP) -->
    <!-- (Yêu cầu #9: Bỏ phiếu chấm điện tử, cho giám khảo ghi điểm như nào) -->
    <!-- ======================================================== -->
    <div v-if="showModalScore" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div class="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
          <div class="flex items-center gap-3">
            <div class="size-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-xs text-xl">
              ⚖️
            </div>
            <div>
              <h3 class="text-xl font-extrabold text-slate-900">Ghi điểm Ban Giám khảo</h3>
              <p class="text-xs text-slate-500 mt-0.5">Nhập điểm chuyên môn và nhận xét đánh giá</p>
            </div>
          </div>
          <button
            type="button"
            @click="showModalScore = false"
            class="btn btn-sm btn-circle btn-ghost text-slate-400 hover:text-slate-700"
          >
            ✕
          </button>
        </div>

        <form class="space-y-5" @submit.prevent="saveJudgeScore">
          <!-- Target Video Summary Card -->
          <div class="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-3.5">
            <div class="size-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
              <IconCirclePlay class="size-6 fill-current" />
            </div>
            <div class="min-w-0 flex-1">
              <h4 class="font-bold text-slate-900 text-sm truncate">{{ scoringVideo?.name }}</h4>
              <p class="text-xs text-slate-500 truncate mt-0.5">
                🎓 {{ scoringVideo?.authorGroup || scoringVideo?.createdBy }}
                <span v-if="scoringVideo?.className"> • {{ scoringVideo.className }}</span>
              </p>
            </div>
          </div>

          <!-- Score Input (Thang điểm 10) -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Điểm đánh giá (Thang điểm 10) <span class="text-rose-500">*</span>
              </label>
              <span class="text-xs font-black text-amber-600 px-2 py-0.5 rounded-lg bg-amber-50 border border-amber-200">
                {{ scoreForm.score }} / 10.0
              </span>
            </div>

            <div class="flex items-center gap-3">
              <input
                type="number"
                step="0.1"
                min="0"
                max="10"
                v-model.number="scoreForm.score"
                class="w-32 px-4 py-3 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 text-xl font-black text-center focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                required
              />
              <input
                type="range"
                min="0"
                max="10"
                step="0.1"
                v-model.number="scoreForm.score"
                class="range range-warning flex-1"
              />
            </div>

            <!-- Quick score selection pills -->
            <div class="flex items-center gap-1.5 mt-2.5 flex-wrap">
              <span class="text-[11px] text-slate-400 font-semibold mr-1">Gợi ý nhanh:</span>
              <button
                type="button"
                v-for="val in [7.0, 7.5, 8.0, 8.5, 9.0, 9.5, 10.0]"
                :key="val"
                @click="setScoreQuick(val)"
                :class="[
                  'px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer',
                  scoreForm.score === val
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                ]"
              >
                {{ val.toFixed(1) }}
              </button>
            </div>
          </div>

          <!-- Comment / Review feedback -->
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Lời nhận xét & Đánh giá chuyên môn
            </label>
            <textarea
              v-model="scoreForm.comment"
              rows="4"
              class="w-full px-4 py-3 rounded-xl border border-slate-300 bg-slate-50/50 text-slate-900 text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all resize-none"
            ></textarea>
          </div>

          <!-- Existing Judge Scores on this Video -->
          <div v-if="scoringVideo?.scores && scoringVideo.scores.length > 0" class="pt-3 border-t border-slate-100">
            <h5 class="text-xs font-bold text-slate-700 mb-2">Đánh giá từ các Giám khảo khác:</h5>
            <div class="space-y-2 max-h-36 overflow-y-auto pr-1">
              <div
                v-for="sc in scoringVideo.scores"
                :key="sc.id"
                class="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex flex-col gap-1"
              >
                <div class="flex items-center justify-between">
                  <span class="font-bold text-slate-800">⚖️ {{ sc.judgeFullName || sc.judgeUserName }}</span>
                  <span class="font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                    {{ sc.score }} / 10
                  </span>
                </div>
                <p v-if="sc.comment" class="text-slate-600 italic mt-0.5">"{{ sc.comment }}"</p>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="modal-action pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              @click="showModalScore = false"
              class="px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs sm:text-sm font-semibold cursor-pointer transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              :disabled="isSavingScore"
              class="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 disabled:opacity-50 text-white text-xs sm:text-sm font-bold shadow-md shadow-amber-500/25 transition-all flex items-center gap-2 cursor-pointer"
            >
              <span v-if="isSavingScore" class="loading loading-spinner loading-xs"></span>
              <span>{{ isSavingScore ? 'Đang lưu...' : 'Lưu điểm đánh giá' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- MODAL 3: CHỈNH SỬA THÔNG TIN VIDEO -->
    <!-- ======================================================== -->
    <div v-if="showModalEdit" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div class="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-2xl max-w-lg w-full">
        <div class="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
          <div class="size-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <IconPenToSquare class="size-5 fill-current" />
          </div>
          <div>
            <h3 class="text-lg font-bold text-slate-900">Chỉnh sửa thông tin bài thi</h3>
            <p class="text-xs text-slate-500">Cập nhật tiêu đề và tác giả bài thi</p>
          </div>
        </div>

        <form class="space-y-4" @submit.prevent="updateVideo">
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Tên video tác phẩm <span class="text-rose-500">*</span>
            </label>
            <input
              type="text"
              v-model="selectedVideo.name"
              class="w-full px-4 py-3 rounded-xl border border-slate-300 bg-slate-50/50 text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
              required
            />
          </div>

          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Tác giả / Nhóm tác giả
            </label>
            <input
              type="text"
              v-model="selectedVideo.authorGroup"
              class="w-full px-4 py-3 rounded-xl border border-slate-300 bg-slate-50/50 text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
            />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-[11px] font-semibold text-slate-400 mb-1">Tạo bởi</label>
              <input
                type="text"
                v-model="selectedVideo.createdBy"
                class="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-100 text-slate-500 text-xs font-medium cursor-not-allowed"
                disabled
              />
            </div>
            <div>
              <label class="block text-[11px] font-semibold text-slate-400 mb-1">Ngày tạo</label>
              <input
                type="text"
                v-model="selectedVideo.createdAt"
                class="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-100 text-slate-500 text-xs font-medium cursor-not-allowed"
                disabled
              />
            </div>
          </div>

          <div class="modal-action pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              @click="showModalEdit = false"
              class="px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs sm:text-sm font-semibold cursor-pointer transition-colors"
            >
              Đóng
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

    <!-- Slide Panel: Sheet Embedded -->
    <input type="checkbox" class="hidden peer" id="show-sheet">
    <div class="fixed top-0 right-0 z-50 shadow-2xl border-l border-slate-200 w-full h-screen bg-white transition-all duration-300 translate-x-full peer-checked:translate-x-0 lg:w-7/12 flex flex-col">
      <!-- Sheet Header -->
      <div class="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
        <div class="flex items-center gap-2">
          <IconFile class="size-5 fill-blue-600" />
          <span class="font-bold text-sm text-slate-800">Kịch bản & Phân cảnh (Google Sheet)</span>
        </div>
        <label for="show-sheet" class="btn btn-sm btn-circle btn-ghost text-slate-500 hover:bg-slate-200">
          ✕
        </label>
      </div>

      <div class="flex-1 w-full h-full relative">
        <div class="w-full h-full flex flex-col justify-center items-center gap-3 p-8 text-center" v-if="!project.sheetUrl">
          <div class="size-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
            <IconFile class="size-8 fill-current" />
          </div>
          <p class="font-medium text-slate-700">Cuộc thi này chưa được gắn liên kết Sheet</p>
          <p class="text-xs text-slate-400 max-w-sm">Bạn có thể bổ sung đường dẫn Google Sheet trong cơ sở dữ liệu để xem trực tiếp tại đây.</p>
        </div>

        <iframe
          v-else
          class="w-full h-full border-none"
          :src="project.sheetUrl"
        ></iframe>
      </div>
    </div>
  </div>
</template>
