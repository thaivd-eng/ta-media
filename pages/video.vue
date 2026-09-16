<script setup>
import * as data from '~/utils/data-service';
import videojs from 'video.js';
import 'video.js/dist/video-js.min.css';
import Swal from 'sweetalert2';

import { ask, findConversation } from '~/utils/gemini';
import { marked } from 'marked';

var player = null;

useHead({ title: 'Video' });

const store = useVideoStore();
const isLoading = ref(true);
const video = computed(() => store.video);
const versions = computed(() => store.versions);

const chat = ref([]);
const chatId = ref(0);
const isLoading2 = ref(false);
const question = ref('');

// Sidebar active tab: 'feedback' | 'score' | 'gemini'
const activeSideTab = ref('feedback');
const showGemini = computed(() => activeSideTab.value === 'gemini');

const userCookie = useCookie('user');
const user = computed(() => {
  if (!userCookie.value) return { id: 1, userName: 'admin', role: 'student' };
  if (typeof userCookie.value === 'string') {
    try {
      return JSON.parse(userCookie.value);
    } catch {
      return { id: 1, userName: userCookie.value, role: 'student' };
    }
  }
  return userCookie.value;
});

const isJudgeOrAdmin = computed(() => {
  const role = user.value?.role;
  return role === 'judge' || role === 'admin' || user.value?.userName === 'admin';
});

// Scoring and Community Voting State
const videoScores = ref({ avgScore: 0, count: 0, scores: [] });
const voteCount = ref(0);
const hasVoted = ref(false);
const judgeScoreInput = ref(8.5);
const judgeCommentInput = ref('');
const isSavingScore = ref(false);

function refreshScoresAndVotes() {
  if (!video.value?.id) return;
  const vidId = video.value.id;
  videoScores.value = data.calculateVideoScores(vidId);
  voteCount.value = data.countVideoVotes(vidId);
  hasVoted.value = data.hasUserVoted(vidId, user.value?.userName);
}

async function submitJudgeScore() {
  const numericScore = parseFloat(judgeScoreInput.value);
  if (isNaN(numericScore) || numericScore < 0 || numericScore > 10) {
    Swal.fire({ icon: 'warning', title: 'Điểm không hợp lệ', text: 'Vui lòng nhập điểm từ 0.0 đến 10.0' });
    return;
  }
  isSavingScore.value = true;
  try {
    await data.submitScore({
      videoId: video.value.id,
      projectId: video.value.projectId,
      judgeUserName: user.value?.userName || 'judge',
      judgeFullName: user.value?.fullName || user.value?.userName || 'Giám khảo',
      score: numericScore,
      comment: judgeCommentInput.value.trim(),
    });
    refreshScoresAndVotes();
    Swal.fire({
      icon: 'success',
      title: 'Đã lưu điểm!',
      text: `Đã ghi nhận điểm ${numericScore}/10 từ Ban Giám khảo.`,
      timer: 1500,
      showConfirmButton: false,
    });
  } catch (e) {
    Swal.fire({ icon: 'error', title: 'Lỗi', text: e?.message || 'Không thể lưu điểm' });
  } finally {
    isSavingScore.value = false;
  }
}

async function handleToggleVote() {
  if (!user.value || user.value.role === 'guest') {
    Swal.fire({
      icon: 'info',
      title: 'Cần đăng nhập',
      text: 'Vui lòng đăng nhập tài khoản để tham gia bình chọn!',
      confirmButtonText: 'Đăng nhập',
    }).then((res) => {
      if (res.isConfirmed) useRouter().push('/login');
    });
    return;
  }
  try {
    const isVoted = await data.toggleVote({
      projectId: video.value?.projectId,
      videoId: video.value?.id,
      userName: user.value.userName,
    });
    hasVoted.value = isVoted;
    voteCount.value = data.countVideoVotes(video.value?.id);
    Swal.mixin({
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 1800,
      timerProgressBar: true,
    }).fire({
      icon: isVoted ? 'success' : 'info',
      title: isVoted ? '❤️ Đã bình chọn cho tác phẩm!' : 'Đã hủy bình chọn.',
    });
  } catch (e) {
    Swal.fire({ icon: 'error', title: 'Lỗi', text: e?.message });
  }
}

const quickPrompts = [
  { icon: '🎬', label: '5s mở đầu', prompt: 'Hãy nhận xét và góp ý kỹ thuật cho 5 đến 10 giây mở đầu của video này để thu hút người xem hơn.' },
  { icon: '🔊', label: 'Âm thanh & Thoại', prompt: 'Hãy đánh giá phần âm lượng nhạc nền, tiếng động và độ rõ ràng của giọng đọc/lời thoại trong video.' },
  { icon: '💡', label: 'Ánh sáng & Góc quay', prompt: 'Hãy tư vấn về ánh sáng, góc máy và bố cục khung hình giúp video trông chuyên nghiệp hơn.' },
  { icon: '⏱️', label: 'Nhịp điệu dựng', prompt: 'Nhịp điệu cắt dựng của video có bị nhanh hay chậm quá không? Gợi ý cách tối ưu nhịp dựng.' },
  { icon: '⚖️', label: 'Gợi ý cho Giám khảo', prompt: 'Hãy tóm tắt ngắn gọn các ưu điểm kỹ thuật nổi bật và điểm cần cải thiện của video này để Ban Giám khảo tham khảo.' },
  { icon: '🎨', label: 'Gợi ý cảnh B-roll', prompt: 'Gợi ý cho tôi 2 đến 3 phân cảnh B-roll sáng tạo để chèn thêm vào video này giúp nội dung sinh động hơn.' },
];

const chatContainerRef = ref(null);

function scrollToBottom() {
  nextTick(() => {
    if (chatContainerRef.value) {
      chatContainerRef.value.scrollTop = chatContainerRef.value.scrollHeight;
    }
  });
}

function selectQuickPrompt(promptText) {
  if (isLoading2.value) return;
  question.value = promptText;
  askGemini();
}

function renderMarkdown(text) {
  if (!text) return '';
  try {
    return marked.parse(text);
  } catch {
    return text;
  }
}

function captureCurrentVideoFrame() {
  try {
    const videoEl = document.querySelector('#video-player_html5_api') ||
                    document.querySelector('video.vjs-tech') ||
                    document.querySelector('video');
    if (videoEl && videoEl.videoWidth > 0 && videoEl.videoHeight > 0) {
      const canvas = document.createElement('canvas');
      const maxW = 720;
      const scale = Math.min(1, maxW / videoEl.videoWidth);
      canvas.width = Math.round(videoEl.videoWidth * scale);
      canvas.height = Math.round(videoEl.videoHeight * scale);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
      if (dataUrl && dataUrl.startsWith('data:image/jpeg;base64,')) {
        return dataUrl.split(',')[1];
      }
    }
  } catch (err) {
    console.warn('Canvas frame capture notice:', err?.message);
  }

  // Fallback: check thumbnail from video or currentVersion
  try {
    const thumb = store.currentVersion?.thumbnailUrl || store.video?.thumbnailUrl;
    if (thumb && thumb.startsWith('data:image')) {
      return thumb.split(',')[1];
    }
  } catch (e) {}

  return null;
}

async function askGemini() {
	if (isLoading2.value || !question.value) return;

  const currentQuestion = question.value.trim();
  if (!currentQuestion) return;

	isLoading2.value = true;

  const currentSec = (player && typeof player.currentTime === 'function') ? Math.round(player.currentTime() || 0) : 0;
  const totalSec = (player && typeof player.duration === 'function') ? Math.round(player.duration() || 0) : 0;
  const frameImageBase64 = captureCurrentVideoFrame();

	chat.value.push({
		text: currentQuestion,
		role: 'user',
		type: 'chat',
	});

  question.value = '';
  scrollToBottom();

	let tempBody = {
		question: currentQuestion,
		fileId: currentVersion.value?.id || video.value?.id || 'demo',
		userId: user.value?.id || user.value?.userName || 'admin',
    videoTitle: video.value?.name || video.value?.title || currentVersion.value?.title || 'Video bài thi sáng tạo số',
    videoDescription: video.value?.description || currentVersion.value?.description || '',
    videoUrl: currentVersion.value?.videoUrl || '',
    currentTime: currentSec,
    duration: totalSec,
    image: frameImageBase64
	};

	try {
    let aiRes = await ask(tempBody);

    if (aiRes && aiRes.text) {
      chat.value.push({
        text: aiRes.text,
        role: aiRes.role || 'model',
        type: aiRes.type || 'chat',
      });
    }

    scrollToBottom();
		isLoading2.value = false;
	} catch (error) {
    let errorMsg = error?.response?.data?.message || error?.message || 'Có lỗi xảy ra khi kết nối với AI';
    if (error?.message?.includes('Network Error')) {
      errorMsg = 'Không thể kết nối đến máy chủ AI (Google Apps Script bị từ chối truy cập hoặc lỗi CORS). Vui lòng kiểm tra quyền "Anyone" của Web App.';
    }
		Swal.fire({
			icon: 'error',
			title: 'Lỗi phản hồi AI',
			text: errorMsg
		});
		isLoading2.value = false;
	}
}

const feedbacks = computed(() => {
  if (player && store.feedbacks) {
    setTimeout(() => {
    document.querySelectorAll('.video-marker').forEach(marker => marker.remove());

    store.feedbacks.forEach(feedback=> {
      createMarker(player, feedback);
    });
    }, 1000);
  }

  return store.feedbacks;
});

const playerMode = ref('drive'); // Mặc định 'drive' để phát qua CDN Google Drive/YouTube siêu mượt
const playerHasError = ref(false);

const driveFileId = computed(() => {
  if (!currentVersion.value) return '';
  const v = currentVersion.value;
  // If version has direct drive id
  if (v.id && typeof v.id === 'string' && v.id.length > 15 && !/^\d+$/.test(v.id)) {
    return v.id;
  }
  if (v.videoUrl) {
    const m = v.videoUrl.match(/files\/([a-zA-Z0-9_-]+)/) ||
              v.videoUrl.match(/id=([a-zA-Z0-9_-]+)/) ||
              v.videoUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (m) return m[1];
  }
  if (v.id && typeof v.id === 'string' && !/^\d+$/.test(v.id)) {
    return v.id;
  }
  return '';
});

const drivePreviewUrl = computed(() => {
  if (!driveFileId.value) return '';
  return `https://drive.google.com/file/d/${driveFileId.value}/preview`;
});

const driveDirectOpenUrl = computed(() => {
  if (!driveFileId.value) return '';
  return `https://drive.google.com/file/d/${driveFileId.value}/view`;
});

const currentVersion = computed(() => {
  if (player && store.currentVersion) {
    updatePlayerSource();
  }

  return store.currentVersion;
});

function updatePlayerSource() {
  if (!player || !store.currentVersion || !store.currentVersion.videoUrl) return;
  playerHasError.value = false;
  player.reset();

  const url = store.currentVersion.videoUrl;
  const fileId = driveFileId.value;

  const sources = [];
  if (url) {
    sources.push({ src: url, type: 'video/mp4' });
    sources.push({ src: url });
  }
  if (fileId) {
    sources.push({ src: `https://drive.google.com/uc?export=download&id=${fileId}`, type: 'video/mp4' });
  }

  player.src(sources);
}

const uploadUrl = computed(() => {
  if (!video.value) return;
  return data.getUploadUrl(video.value.id);
});

const videoPlayer = ref(null);
const showModalUpload = ref(false);

onBeforeMount(async () => {
  fetchData();
});

var inputFocus = false;

onMounted(() => {
  initPlayer();

  // add shortcut key
  document.addEventListener('keydown', (e) => {
    if (showGemini.value) return;

    if (e.key === 'f') {
      if (inputFocus) return;

      document.querySelector('.input')?.focus();
      if (player && typeof player.pause === 'function') player.pause();
      inputFocus = true;
    }
    if (e.key === ' ') {
      if (inputFocus) return;
      if (player && typeof player.paused === 'function') {
        player.paused() ? player.play() : player.pause();
      }
    }
    if (e.key === 'ArrowRight') {
      if (player && typeof player.currentTime === 'function') {
        player.currentTime(player.currentTime() + 5);
      }
    }
    if (e.key === 'ArrowLeft') {
      if (player && typeof player.currentTime === 'function') {
        player.currentTime(player.currentTime() - 5);
      }
    }

    if (e.key === 'Escape') {
      document.querySelector('.input')?.blur();
      inputFocus = false;
    }
  });
});

onBeforeUnmount(() => {
  if (player && typeof player.dispose === 'function') {
    player.dispose();
  }
});

async function fetchData() {
  isLoading.value = true;
  await store.fetchData();
  isLoading.value = false;

  refreshScoresAndVotes();

  if (!currentVersion.value) return;

  if (driveFileId.value) {
    playerMode.value = 'drive';
  } else {
    playerMode.value = 'html5';
  }

  updatePlayerSource();

	// get conversation
	chat.value = await findConversation({
		fileId: currentVersion.value.id,
		userId: user.value?.id || user.value?.userName || 'admin',
	});
}

function initPlayer() {
  function callback () {
    player.one('loadedmetadata', () => {
      feedbacks.value.forEach(feedback=> {
        createMarker(player, feedback);
      });
    });
  }

  player = videojs(videoPlayer.value, {
    autoplay: false,
    controls: true,
    preload: 'auto',
    fluid: true,
    responsive: true,
    playbackRates: [0.5, 0.75, 1, 1.25, 1.5, 2],
  }, callback);

  player.on('waiting', () => {
    isBuffering.value = true;
  });

  player.on('playing', () => {
    isBuffering.value = false;
  });

  player.on('canplay', () => {
    isBuffering.value = false;
  });

  player.on('error', () => {
    console.warn('Video.js failed to load HTML5 media. Auto-switching to Drive preview.');
    playerHasError.value = true;
    if (driveFileId.value) {
      playerMode.value = 'drive';
    }
  });
}

function createMarker(player, marker) {
  const markerEl = document.createElement('a');
  markerEl.classList.add('video-marker');
  markerEl.href = '#feedback-' + marker.id;

  // Adjust styles for a point-like marker
  markerEl.id = 'marker-' + marker.id;
  markerEl.style.zIndex = '1000'; // Set a higher z-index
  markerEl.style.position = 'absolute';
  markerEl.style.left = `${(marker.time / player.duration()) * 100}%`;
  markerEl.style.width = '15px'; // Set a small width
  markerEl.style.height = '15px'; // Set a small height
  markerEl.style.borderRadius = '50%'; // Create a rounded shape
  markerEl.classList.add('bg-primary'); // Adjust color

  markerEl.addEventListener('click', () => {
    player.pause();
  });

  player.el().querySelector('.vjs-progress-control').appendChild(markerEl);
}

const newFeedback = ref('');

async function createFeedback() {
  if (!newFeedback.value) return;

  let time = 0;
  if (player && typeof player.currentTime === 'function') {
    try { time = player.currentTime() || 0; } catch {}
  }

  let content = newFeedback.value;
  let id = Date.now();

  if (player && typeof player.duration === 'function' && player.duration() > 0) {
    try { createMarker(player, { id, time, content }); } catch {}
  }

  if (player && typeof player.play === 'function') {
    try { player.play(); } catch {}
  }

  newFeedback.value = '';
  store.createFeedback({ id, time, content });

  inputFocus = false;
}

async function onToggleModalUpload() {
  if (showModalUpload.value) return;

  let { isConfirmed } = await Swal.fire({
    title: 'Bạn có muốn tải lại dữ liệu không?',
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Có',
    cancelButtonText: 'Không',
  });
  if (!isConfirmed) return;

  isLoading.value = true;
  await fetchData();
  isLoading.value = false;
}

function onFeedbackClick(id) {
  let feedback = feedbacks.value.find((feedback) => feedback.id == id);
  if (!feedback) return;

  let time = feedback.time;
  if (player && typeof player.currentTime === 'function') {
    try {
      player.currentTime(time);
      player.pause();
    } catch {}
  }
}

function removeFeedback(id) {
  Swal.fire({
    title: 'Xác nhận xóa',
    text: 'Bạn có chắc chắn muốn xóa phản hồi này?',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Xóa',
    cancelButtonText: 'Không',
  }).then((result) => {
    if (!result.isConfirmed) return;
    store.removeFeedback(id);

    const markerEl = document.getElementById('marker-' + id);
    if (markerEl) player.el().querySelector('.vjs-progress-control').removeChild(markerEl);
  });
}

function pauseVideo() {
  inputFocus = true;
  player.pause();
}

function uploadVideo() {
  Swal.fire({
    title: 'Tải video',
    html: `
<div class="text-left">
<p>1. Bạn sẽ được chuyển đến thư mục Drive</p>
<p>2. Hãy upload video của bạn lên thư mục này</p>
<p>3. Sau khi upload xong, quay lại trang này và nhấn "Có" để cập nhật video</p>
</div>
    `,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Đã hiểu',
    cancelButtonText: 'Không',
  }).then((result) => {
    if (!result.isConfirmed) return;
    let folderId = video.value?.folderId;
    let url = 'https://drive.google.com/drive/folders/' + folderId;
    window.open(url, '_blank');

    Swal.fire({
      title: 'Đã tải xong?',
      text: 'Hãy nhấn nút "Có" để cập nhật video mới nha',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Có',
      cancelButtonText: 'Không',
    }).then(async (result) => {
      if (!result.isConfirmed) return;

      isLoading.value = true;

      await data.checkUpload(video.value);
      await fetchData();
    });
  });
}


  const shortcuts = ref([
    { key: 'f', description: 'Tập trung vào textbox bình luận' },
    { key: 'esc', description: 'Không tập trung vào textbox bình luận' },
    { key: 'Enter', description: 'Gửi bình luận' },
    { key: 'space', description: 'Ngừng / phát video' },
    { key: '◀︎', description: 'Lùi video 5 giây' },
    { key: '▶︎', description: 'Tiến video 5 giây' },
  ]);
</script>

<template>
	<div class="w-full h-screen flex flex-col bg-slate-100/70 overflow-hidden select-none">
		<!-- Navbar -->
    <video-nav-bar @create-version="uploadVideo" />

		<!-- Loader -->
		<div class="p-6 flex-1 flex items-center justify-center" v-if="isLoading">
			<video-skeleton />
		</div>

		<!-- Uploader / Empty State -->
		<div
      class="flex-1 w-full flex flex-col justify-center items-center gap-4 p-8 text-center"
      v-else-if="(!currentVersion || currentVersion.videoUrl == '')"
    >
      <div class="size-20 rounded-3xl bg-blue-50 flex items-center justify-center text-blue-600 ring-8 ring-blue-50/50 mb-2">
        <IconCirclePlay class="size-10 fill-current" />
      </div>
			<h2 class="text-xl font-bold text-slate-800">Chưa có tệp video trong phiên bản này</h2>
      <p class="text-sm text-slate-500 max-w-md">Hãy tải video lên thư mục để bắt đầu cùng đội ngũ xem, đánh dấu và thảo luận các mốc thời gian.</p>
			<button class="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md shadow-blue-600/25 transition-all flex items-center gap-2" @click="uploadVideo">
        <IconPlus class="size-4 fill-current" />
        <span>Tải video lên</span>
      </button>
		</div>

		<!-- Main Studio Content -->
		<div
      :class="[
        'flex-1 w-full p-4 sm:p-6 overflow-hidden flex flex-col lg:flex-row gap-6',
        (!isLoading && currentVersion && currentVersion.videoUrl) ? '' : 'hidden'
      ]"
    >
			<!-- Left: Video Player & Feedback Input -->
			<div class="flex-1 flex flex-col gap-4 min-w-0 overflow-hidden">
        <!-- Video Container -->
				<div class="relative bg-slate-950 rounded-2xl overflow-hidden shadow-2xl shadow-slate-900/10 border border-slate-800 flex-1 flex items-center justify-center min-h-[360px]">
          <!-- Google Drive Embedded Player (Mặc định: Phát siêu mượt qua hạ tầng CDN YouTube/Drive) -->
          <div class="w-full h-full" v-if="driveFileId && playerMode === 'drive'">
            <iframe
              :src="drivePreviewUrl"
              class="w-full h-full border-none"
              allow="autoplay; encrypted-media; fullscreen"
              allowfullscreen>
            </iframe>
          </div>

					<!-- HTML5 Player (Fallback khi xem file nội bộ không có link Drive) -->
          <div :class="['w-full h-full flex items-center justify-center', (!driveFileId || playerMode === 'html5') ? 'block' : 'hidden']" v-else>
            <video 
              id="video-player"
              ref="videoPlayer"
              crossorigin="anonymous"
              playsinline
              preload="auto"
              data-setup='{}'
              class="vjs-fill video-js w-full h-full">
            </video>
          </div>

          <!-- Error recovery overlay when HTML5 player cannot load media -->
          <div
            v-if="playerMode === 'html5' && playerHasError"
            class="absolute inset-0 bg-slate-950/90 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center z-20 text-white"
          >
            <div class="size-14 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-3 ring-4 ring-amber-500/10">
              <IconQuestion class="size-7 fill-current" />
            </div>
            <h3 class="text-base font-bold text-white mb-1">Không thể tải luồng video trực tiếp</h3>
            <p class="text-xs text-slate-300 max-w-md mb-5 leading-relaxed">
              Tệp này có thể là định dạng MKV, MOV, AVI, file ảnh hoặc Google Drive yêu cầu xác nhận quét virus đối với file lớn.
            </p>
            <div class="flex flex-wrap items-center justify-center gap-3">
              <button
                v-if="driveFileId"
                type="button"
                @click="playerMode = 'drive'"
                class="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-lg shadow-blue-600/30 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <svg class="size-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7.71 3.5L1.15 15l3.43 6 6.55-11.5M9.73 15L6.3 21h13.12l3.43-6M22.85 13.5l-6.56-11.5H9.72l6.56 11.5"/>
                </svg>
                <span>Xem bằng Trình phát Google Drive</span>
              </button>
              <a
                v-if="driveDirectOpenUrl"
                :href="driveDirectOpenUrl"
                target="_blank"
                class="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-xs transition-all flex items-center gap-1.5"
              >
                <span>Mở trong tab mới</span>
                <svg class="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </div>
				</div>

        <!-- Add Feedback Control Bar -->
				<form class="flex items-center gap-2.5 bg-white p-2.5 sm:p-3 rounded-2xl border border-slate-200/80 shadow-sm shrink-0" @submit.prevent="createFeedback">
					<div class="relative flex-1">
            <input
              class="w-full pl-4 pr-12 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-xs sm:text-sm placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all font-medium"
              v-model="newFeedback"
              @click="pauseVideo"
              placeholder="Nhập nhận xét tại thời điểm hiện tại... (Phím tắt: F)"
            />
          </div>
					<button
            type="submit"
            class="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm flex items-center gap-2 shadow-sm shadow-blue-600/20 transition-all shrink-0 active:scale-95"
          >
						<IconPaperPlane class="size-4 fill-current" />
						<span class="hidden sm:inline">Gửi</span>
					</button>

          <!-- Community Vote Button -->
          <button
            type="button"
            @click="handleToggleVote"
            :class="[
              'px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 active:scale-95',
              hasVoted
                ? 'bg-rose-500 text-white shadow-xs'
                : 'bg-rose-50 hover:bg-rose-100 text-rose-600'
            ]"
            :title="hasVoted ? 'Hủy bình chọn' : 'Bình chọn bài thi'"
          >
            <svg class="size-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
            <span>{{ voteCount }} vote</span>
          </button>

          <!-- Score Tab Trigger -->
          <button
            type="button"
            @click="activeSideTab = 'score'"
            class="px-3 py-2 rounded-xl text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-700 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
            title="Xem và chấm điểm bài thi"
          >
            <span>⚖️</span>
            <span>{{ videoScores.count > 0 ? `${videoScores.avgScore}/10` : 'Chấm điểm' }}</span>
          </button>

					<label
            for="modal_shortcut"
            class="size-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer transition-colors shrink-0"
            title="Xem phím tắt"
          >
						<IconQuestion class="size-4 fill-current" />
					</label>
				</form>
			</div>

			<!-- Right Sidebar: Feedback List / Score & Evaluation / AI Assistant -->
			<aside class="w-full lg:w-96 shrink-0 h-full flex flex-col bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <!-- Segmented Tab Header (3 Tabs: Phản hồi, Điểm, Trợ lý AI) -->
        <div class="p-3 border-b border-slate-100 bg-slate-50/70 shrink-0">
          <div class="grid grid-cols-3 gap-1.5 bg-slate-200/60 p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              :class="[
                'py-2 px-2 rounded-lg transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer',
                activeSideTab === 'feedback'
                  ? 'bg-white text-blue-600 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              ]"
              @click="activeSideTab = 'feedback'"
            >
              <span>💬 Phản hồi</span>
              <span class="px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-700 text-[10px]" v-if="feedbacks">{{ feedbacks.length }}</span>
            </button>

            <button
              type="button"
              :class="[
                'py-2 px-2 rounded-lg transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer',
                activeSideTab === 'score'
                  ? 'bg-white text-amber-600 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              ]"
              @click="activeSideTab = 'score'"
            >
              <span>⚖️ Điểm</span>
              <span class="px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-700 text-[10px]" v-if="videoScores.count">{{ videoScores.avgScore }}</span>
            </button>

            <button
              type="button"
              :class="[
                'py-2 px-2 rounded-lg transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer',
                activeSideTab === 'gemini'
                  ? 'bg-white text-blue-600 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              ]"
              @click="activeSideTab = 'gemini'"
            >
              <span>✨ Trợ lý AI</span>
            </button>
          </div>
        </div>

        <!-- Tab 1: Feedbacks List -->
        <div class="flex-1 overflow-y-auto p-4 flex flex-col" v-if="activeSideTab === 'feedback'">
          <div v-if="!feedbacks || feedbacks.length === 0" class="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-400">
            <div class="size-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
              <IconCommentDots class="size-6 fill-current" />
            </div>
            <p class="text-xs font-medium text-slate-600">Chưa có phản hồi nào</p>
            <p class="text-[11px] text-slate-400 mt-1">Dừng video tại bất kỳ mốc thời gian nào và gửi nhận xét.</p>
          </div>

          <div v-else class="flex flex-col gap-3">
            <div
              v-for="feedback in feedbacks"
              :key="feedback.id"
              :id="'feedback-' + feedback.id"
              class="p-3.5 rounded-xl border border-slate-100 hover:border-blue-200 bg-slate-50/40 hover:bg-blue-50/20 transition-all flex flex-col gap-2"
            >
              <!-- Author & Time -->
              <div class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-2">
                  <div class="size-7 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 text-white font-bold text-[11px] flex items-center justify-center shadow-xs">
                    {{ feedback.createdBy ? feedback.createdBy.charAt(0).toUpperCase() : 'U' }}
                  </div>
                  <span class="text-xs font-bold text-slate-800">{{ feedback.createdBy }}</span>
                </div>
                <!-- Timecode clickable badge -->
                <button
                  type="button"
                  @click="onFeedbackClick(feedback.id)"
                  class="px-2 py-0.5 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-mono font-bold transition-colors flex items-center gap-1"
                  title="Nhấn để tua đến thời điểm này"
                >
                  <IconCirclePlay class="size-3 fill-current" />
                  <span>{{ feedback.timeFormated }}</span>
                </button>
              </div>

              <!-- Content -->
              <p class="text-xs text-slate-700 font-medium pl-9 leading-relaxed">
                {{ feedback.content }}
              </p>

              <!-- Actions -->
              <div class="flex items-center justify-end gap-1 pt-1 border-t border-slate-100 text-slate-400">
                <button
                  type="button"
                  class="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                  @click="removeFeedback(feedback.id)"
                  title="Xoá nhận xét"
                >
                  <IconTrash class="size-3.5 fill-current" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Tab 2: Đánh giá & Chấm điểm Ban Giám khảo -->
        <div class="flex-1 overflow-y-auto p-4 flex flex-col gap-4" v-if="activeSideTab === 'score'">
          <!-- Video Author Info Card -->
          <div class="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col gap-1.5">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <span>🎓</span>
                <span>{{ video?.authorGroup || video?.createdBy || 'Thí sinh' }}</span>
              </span>
              <span class="text-[11px] text-slate-400 font-medium">
                {{ video?.studentId ? `MSSV: ${video.studentId}` : '' }}
                {{ video?.className ? `• ${video.className}` : '' }}
              </span>
            </div>
            <p v-if="video?.description" class="text-xs text-slate-600 italic">
              "{{ video.description }}"
            </p>
          </div>

          <!-- Average Score Summary Card -->
          <div class="p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100/50 border border-amber-200 flex items-center justify-between">
            <div>
              <div class="text-[11px] uppercase font-bold text-amber-700 tracking-wider">Điểm Chuyên Môn TB</div>
              <div class="text-2xl font-black text-amber-700 mt-0.5">
                {{ videoScores.count > 0 ? `${videoScores.avgScore} / 10.0` : 'Chưa có điểm' }}
              </div>
              <div class="text-xs text-amber-600 font-medium mt-0.5">
                {{ videoScores.count }} Giám khảo đã chấm
              </div>
            </div>
            <!-- Community Vote summary in card -->
            <div class="text-right">
              <div class="text-[11px] uppercase font-bold text-rose-600 tracking-wider">Bình chọn</div>
              <button
                type="button"
                @click="handleToggleVote"
                :class="[
                  'mt-1 px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer',
                  hasVoted ? 'bg-rose-500 text-white shadow-xs' : 'bg-white text-rose-600 border border-rose-200'
                ]"
              >
                <svg class="size-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
                <span>{{ voteCount }} vote</span>
              </button>
            </div>
          </div>

          <!-- Judge Scoring Box (For Judges and Admin) -->
          <div v-if="isJudgeOrAdmin" class="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col gap-3">
            <div class="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 class="font-bold text-xs uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <span>⚖️</span>
                <span>Ghi điểm bài thi</span>
              </h4>
              <span class="text-xs font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                {{ judgeScoreInput }} / 10
              </span>
            </div>

            <form @submit.prevent="submitJudgeScore" class="space-y-3">
              <div>
                <label class="block text-[11px] font-bold text-slate-600 mb-1">Điểm đánh giá (0.0 - 10.0)</label>
                <div class="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    v-model.number="judgeScoreInput"
                    class="w-20 px-3 py-2 rounded-xl border border-slate-300 text-slate-900 font-black text-center text-sm"
                    required
                  />
                  <input
                    type="range"
                    min="0"
                    max="10"
                    step="0.1"
                    v-model.number="judgeScoreInput"
                    class="range range-xs range-warning flex-1"
                  />
                </div>
                <!-- Quick suggestions -->
                <div class="flex items-center gap-1 mt-1.5 flex-wrap">
                  <button
                    type="button"
                    v-for="val in [7.5, 8.0, 8.5, 9.0, 9.5, 10.0]"
                    :key="val"
                    @click="judgeScoreInput = val"
                    :class="[
                      'px-2 py-0.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer',
                      judgeScoreInput === val ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    ]"
                  >
                    {{ val.toFixed(1) }}
                  </button>
                </div>
              </div>

              <div>
                <label class="block text-[11px] font-bold text-slate-600 mb-1">Lời nhận xét & Góp ý</label>
                <textarea
                  v-model="judgeCommentInput"
                  rows="3"
                  class="w-full p-2.5 rounded-xl border border-slate-300 text-slate-900 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none resize-none"
                ></textarea>
              </div>

              <button
                type="submit"
                :disabled="isSavingScore"
                class="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white font-bold text-xs shadow-md shadow-amber-500/20 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span v-if="isSavingScore" class="loading loading-spinner loading-xs"></span>
                <span>{{ isSavingScore ? 'Đang lưu...' : 'Lưu điểm đánh giá' }}</span>
              </button>
            </form>
          </div>

          <!-- Existing Scores from all Judges -->
          <div class="flex flex-col gap-2">
            <h5 class="text-xs font-bold text-slate-700">Đánh giá từ các Giám khảo:</h5>
            <div v-if="!videoScores.scores || videoScores.scores.length === 0" class="text-xs text-slate-400 italic p-3 text-center bg-slate-50 rounded-xl">
              Chưa có giám khảo nào ghi điểm cho tác phẩm này.
            </div>
            <div
              v-else
              v-for="sc in videoScores.scores"
              :key="sc.id"
              class="p-3 rounded-xl border border-slate-200/80 bg-slate-50/50 flex flex-col gap-1 text-xs"
            >
              <div class="flex items-center justify-between">
                <span class="font-bold text-slate-800">⚖️ {{ sc.judgeFullName || sc.judgeUserName }}</span>
                <span class="font-black text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                  {{ sc.score }} / 10
                </span>
              </div>
              <p v-if="sc.comment" class="text-slate-600 italic mt-0.5 pl-5">"{{ sc.comment }}"</p>
              <span class="text-[10px] text-slate-400 text-right">{{ sc.createdAt || sc.updatedAt }}</span>
            </div>
          </div>
        </div>

        <!-- Tab 3: Gemini Chat -->
        <div class="flex-1 flex flex-col overflow-hidden" v-if="showGemini">
          <!-- Chat Header -->
          <div class="px-4 py-2.5 bg-slate-50/90 border-b border-slate-100 flex items-center justify-between shrink-0">
            <div class="flex items-center gap-2">
              <span class="relative flex size-2">
                <span :class="['animate-ping absolute inline-flex h-full w-full rounded-full opacity-75', isLoading2 ? 'bg-blue-400' : 'bg-emerald-400']"></span>
                <span :class="['relative inline-flex rounded-full size-2', isLoading2 ? 'bg-blue-500' : 'bg-emerald-500']"></span>
              </span>
              <span class="text-xs font-bold text-slate-800">Trợ lý Cố vấn Video AI</span>
            </div>
            <span class="text-[10px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200/80 shadow-2xs">
              {{ isLoading2 ? 'Đang suy nghĩ...' : 'Sẵn sàng' }}
            </span>
          </div>

          <!-- Chat messages stream -->
          <div ref="chatContainerRef" class="flex-1 overflow-y-auto p-4 space-y-3.5">
            <!-- Welcome state when chat is empty -->
            <div v-if="chat.length === 0" class="h-full flex flex-col justify-center py-4 space-y-4">
              <div class="bg-gradient-to-br from-blue-50/80 via-indigo-50/40 to-white rounded-2xl p-4 border border-blue-100/80 text-center shadow-xs">
                <div class="size-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center mx-auto mb-2.5 shadow-md shadow-blue-500/20 text-xl">
                  ✨
                </div>
                <h3 class="text-xs font-bold text-slate-900">Trợ lý Phân tích Kỹ thuật Video</h3>
                <p class="text-[11px] text-slate-600 mt-1 leading-relaxed max-w-xs mx-auto">
                  Xin chào! Tôi có thể giúp bạn nhận xét kịch bản, âm thanh, ánh sáng hoặc góc quay cho video này.
                </p>
              </div>

              <div>
                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-1 flex items-center gap-1">
                  <span>⚡</span>
                  <span>Gợi ý câu hỏi nhanh:</span>
                </p>
                <div class="space-y-1.5">
                  <button
                    v-for="(p, i) in quickPrompts"
                    :key="i"
                    type="button"
                    @click="selectQuickPrompt(p.prompt)"
                    :disabled="isLoading2"
                    class="w-full text-left p-2.5 rounded-xl bg-white hover:bg-blue-50/70 hover:border-blue-200 border border-slate-200/80 transition-all flex items-center gap-2.5 text-xs text-slate-700 font-medium group cursor-pointer shadow-2xs active:scale-[0.99]"
                  >
                    <span class="text-base shrink-0">{{ p.icon }}</span>
                    <span class="flex-1 truncate group-hover:text-blue-600 transition-colors">{{ p.label }}</span>
                    <span class="text-slate-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all text-xs font-bold">→</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- Messages list -->
            <template v-else>
              <div v-for="(item, idx) in chat" :key="idx" :class="['flex flex-col', item.role === 'user' ? 'items-end' : 'items-start']">
                <div class="flex items-center gap-1.5 mb-1 px-1 text-[10px] text-slate-400 font-medium">
                  <span v-if="item.role === 'user'">👤 Bạn</span>
                  <span v-else class="text-blue-600 font-semibold flex items-center gap-1">✨ AI Trợ lý</span>
                </div>
                <div
                  v-if="item.type === 'chat'"
                  :class="[
                    'max-w-[90%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed shadow-xs',
                    item.role === 'user'
                      ? 'bg-blue-600 text-white rounded-tr-xs font-medium'
                      : 'bg-slate-50 text-slate-800 rounded-tl-xs border border-slate-200/80 ai-markdown'
                  ]"
                  v-html="item.role === 'user' ? item.text : renderMarkdown(item.text)"
                ></div>
              </div>

              <!-- Typing indicator when waiting for AI -->
              <div v-if="isLoading2" class="flex flex-col items-start">
                <div class="flex items-center gap-1.5 mb-1 px-1 text-[10px] text-blue-600 font-semibold">
                  <span>✨ AI Trợ lý</span>
                </div>
                <div class="max-w-[85%] rounded-2xl rounded-tl-xs px-4 py-2.5 text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200/80 flex items-center gap-2 shadow-2xs">
                  <span class="loading loading-dots loading-xs text-blue-600"></span>
                  <span>Đang xem video và phân tích...</span>
                </div>
              </div>
            </template>
          </div>

          <!-- Quick Chips Bar above Input (visible when chat has messages) -->
          <div v-if="chat.length > 0" class="px-3 py-1.5 bg-slate-50/60 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
            <button
              v-for="(p, i) in quickPrompts"
              :key="i"
              type="button"
              @click="selectQuickPrompt(p.prompt)"
              :disabled="isLoading2"
              class="px-2.5 py-1 rounded-full bg-white hover:bg-blue-50 hover:border-blue-200 border border-slate-200/80 text-[10px] font-semibold text-slate-600 hover:text-blue-600 whitespace-nowrap transition-colors flex items-center gap-1 shadow-2xs shrink-0 cursor-pointer disabled:opacity-40"
            >
              <span>{{ p.icon }}</span>
              <span>{{ p.label }}</span>
            </button>
          </div>

          <!-- Chat Input -->
          <form class="p-3 border-t border-slate-100 bg-white flex items-center gap-2 shrink-0" @submit.prevent="askGemini">
            <textarea
              v-model="question"
              rows="1"
              placeholder="Hỏi trợ lý AI về video..."
              class="flex-1 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all resize-none"
              @keydown.enter.exact.prevent="askGemini"
            ></textarea>
            <button
              type="submit"
              :disabled="isLoading2 || !question || !question.trim()"
              class="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-semibold transition-all shadow-xs shrink-0 cursor-pointer"
            >
              <span class="loading loading-spinner loading-xs" v-if="isLoading2"></span>
              <span v-else>Gửi</span>
            </button>
          </form>
        </div>
			</aside>
		</div>

    <!-- Floating action button to go back to /projects -->
    <NuxtLink
      to="/projects"
      class="fixed bottom-6 left-6 size-11 rounded-2xl bg-white text-slate-700 hover:text-blue-600 shadow-xl shadow-slate-900/10 border border-slate-200/80 flex items-center justify-center transition-transform hover:scale-105 active:scale-95 z-20"
      title="Về danh sách cuộc thi"
    >
      <IconHouse class="size-4 fill-current" />
    </NuxtLink>

    <!-- Modal Shortcuts -->
    <input type="checkbox" id="modal_shortcut" class="modal-toggle" />
    <div class="modal modal-bottom sm:modal-middle" role="dialog">
      <div class="modal-box bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-2xl max-w-md">
        <div class="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
          <div class="size-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <IconQuestion class="size-5 fill-current" />
          </div>
          <div>
            <h3 class="text-lg font-bold text-slate-900">Danh sách phím tắt</h3>
            <p class="text-xs text-slate-500">Tối ưu thao tác khi review và nhận xét video</p>
          </div>
        </div>

        <div class="divide-y divide-slate-100 text-xs font-medium">
          <div v-for="shortcut in shortcuts" :key="shortcut.key" class="py-2.5 flex items-center justify-between">
            <span class="text-slate-600">{{ shortcut.description }}</span>
            <kbd class="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 font-mono text-slate-800 text-[11px] font-bold shadow-xs">
              {{ shortcut.key }}
            </kbd>
          </div>
        </div>

        <div class="modal-action pt-4 border-t border-slate-100">
          <label for="modal_shortcut" class="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer transition-colors w-full text-center">
            Đã hiểu
          </label>
        </div>
      </div>
      <label class="modal-backdrop bg-slate-900/40 backdrop-blur-xs" for="modal_shortcut">Thoát</label>
    </div>
	</div>
</template>

<style scoped>
:deep(.ai-markdown p) {
  margin-bottom: 0.5rem;
}
:deep(.ai-markdown p:last-child) {
  margin-bottom: 0;
}
:deep(.ai-markdown ul) {
  list-style-type: disc;
  margin-left: 1.25rem;
  margin-bottom: 0.5rem;
}
:deep(.ai-markdown ol) {
  list-style-type: decimal;
  margin-left: 1.25rem;
  margin-bottom: 0.5rem;
}
:deep(.ai-markdown li) {
  margin-bottom: 0.25rem;
}
:deep(.ai-markdown strong) {
  font-weight: 700;
  color: #0f172a;
}
:deep(.ai-markdown h1),
:deep(.ai-markdown h2),
:deep(.ai-markdown h3) {
  font-weight: 700;
  margin-top: 0.5rem;
  margin-bottom: 0.25rem;
  color: #0f172a;
}
:deep(.ai-markdown code) {
  background-color: #f1f5f9;
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
  font-size: 0.85em;
}
</style>
