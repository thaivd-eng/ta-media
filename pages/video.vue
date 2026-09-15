<script setup>
import * as data from '~/utils/data-service';
import videojs from 'video.js';
import 'video.js/dist/video-js.min.css';
import Swal from 'sweetalert2';

import { ask, findConversation, askVeo } from '~/utils/gemini';
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
const showGemini = ref(true);
const showVeo = ref(true);

const user = useCookie('user').value;

async function askGemini() {
	if (isLoading2.value || !question.value) return;

	isLoading2.value = true;

	chat.value.push({
		text: question.value,
		role: 'user',
		type: 'chat',
	});

	let tempBody = {
		question: question.value,
		fileId: currentVersion.value.id,
		userId: user.id
	};

	try {
		if (showGemini.value) {
			await ask(tempBody);
		}

		else if (showVeo.value) {
			await askVeo(tempBody);
		}

		await fetchData();
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

	question.value = '';
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

const playerMode = ref('html5'); // 'html5' | 'drive'
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
    sources.push({ src: url });
    sources.push({ src: url, type: 'video/mp4' });
  }
  if (fileId) {
    sources.push({ src: `https://lh3.googleusercontent.com/d/${fileId}` });
    sources.push({ src: `https://drive.google.com/uc?export=download&id=${fileId}` });
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

  if (!currentVersion.value) return;

  updatePlayerSource();

	// get conversation
	chat.value = await findConversation({
		fileId: currentVersion.value.id,
		userId: user.id,
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
  }, callback);

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
    let url = 'https://drive.google.com/drive/folders/' + video.value.folderId;
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
					<!-- HTML5 Player -->
          <div :class="['w-full h-full flex items-center justify-center', playerMode === 'html5' ? 'block' : 'hidden']">
            <video 
              id="video-player"
              ref="videoPlayer"
              data-setup='{}'
              class="vjs-fill video-js w-full h-full">
            </video>
          </div>

          <!-- Google Drive Embedded Player -->
          <div :class="['w-full h-full', playerMode === 'drive' ? 'block' : 'hidden']" v-if="driveFileId">
            <iframe
              :src="drivePreviewUrl"
              class="w-full h-full border-none"
              allow="autoplay; encrypted-media"
              allowfullscreen>
            </iframe>
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
					<label
            for="modal_shortcut"
            class="size-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer transition-colors shrink-0"
            title="Xem phím tắt"
          >
						<IconQuestion class="size-4 fill-current" />
					</label>
				</form>
			</div>

			<!-- Right Sidebar: Feedback List / AI Assistant -->
			<aside class="w-full lg:w-96 shrink-0 h-full flex flex-col bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <!-- Segmented Tab Header -->
        <div class="p-3 border-b border-slate-100 bg-slate-50/70 shrink-0">
          <div class="grid grid-cols-3 gap-1 bg-slate-200/60 p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              :class="[
                'py-2 px-3 rounded-lg transition-all text-center flex items-center justify-center gap-1.5',
                (!showGemini && !showVeo)
                  ? 'bg-white text-blue-600 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              ]"
              @click="showGemini = false; showVeo = false"
            >
              <span>Phản hồi</span>
              <span class="px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-700 text-[10px]" v-if="feedbacks">{{ feedbacks.length }}</span>
            </button>

            <button
              type="button"
              :class="[
                'py-2 px-3 rounded-lg transition-all text-center flex items-center justify-center gap-1.5',
                (showGemini && !showVeo)
                  ? 'bg-white text-blue-600 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              ]"
              @click="showGemini = true; showVeo = false"
            >
              <span>Gemini AI</span>
            </button>

            <button
              type="button"
              :class="[
                'py-2 px-3 rounded-lg transition-all text-center flex items-center justify-center gap-1.5',
                (showVeo && !showGemini)
                  ? 'bg-white text-blue-600 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              ]"
              @click="showGemini = false; showVeo = true"
            >
              <span>Veo Studio</span>
            </button>
          </div>
        </div>

        <!-- Tab 1: Feedbacks List -->
        <div class="flex-1 overflow-y-auto p-4 flex flex-col" v-if="!showGemini && !showVeo">
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

        <!-- Tab 2: Gemini Chat -->
        <div class="flex-1 flex flex-col overflow-hidden" v-if="showGemini && !showVeo">
          <!-- Chat messages stream -->
          <div class="flex-1 overflow-y-auto p-4 space-y-3">
            <div v-if="chat.length === 0" class="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <div class="size-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-2">
                <IconQuestion class="size-6 fill-current" />
              </div>
              <p class="text-xs font-bold text-slate-700">Trợ lý Video AI</p>
              <p class="text-[11px] text-slate-400 mt-1 max-w-xs">Đặt câu hỏi về kịch bản, lời thoại hoặc gợi ý chỉnh sửa cho video này.</p>
            </div>

            <div v-for="(item, idx) in chat" :key="idx" :class="['flex flex-col', item.role === 'user' ? 'items-end' : 'items-start']">
              <div
                v-if="item.type === 'chat'"
                :class="[
                  'max-w-[85%] rounded-2xl px-4 py-2.5 text-xs font-medium leading-relaxed shadow-xs',
                  item.role === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-xs'
                    : 'bg-slate-100 text-slate-800 rounded-tl-xs border border-slate-200/80'
                ]"
                v-html="item.text"
              ></div>
            </div>
          </div>

          <!-- Chat Input -->
          <form class="p-3 border-t border-slate-100 bg-white flex items-center gap-2 shrink-0" @submit.prevent="askGemini">
            <textarea
              v-model="question"
              rows="1"
              placeholder="Hỏi trợ lý AI..."
              class="flex-1 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all resize-none"
              @keydown.enter.exact.prevent="askGemini"
            ></textarea>
            <button
              type="submit"
              :disabled="isLoading2 || !question"
              class="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-semibold transition-all shadow-xs shrink-0"
            >
              <span class="loading loading-spinner loading-xs" v-if="isLoading2"></span>
              <span v-else>Gửi</span>
            </button>
          </form>
        </div>

        <!-- Tab 3: Veo Studio -->
        <div class="flex-1 flex flex-col overflow-hidden" v-if="!showGemini && showVeo">
          <!-- Chat messages stream -->
          <div class="flex-1 overflow-y-auto p-4 space-y-3">
            <div v-if="chat.length === 0" class="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <div class="size-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2">
                <IconCirclePlay class="size-6 fill-current" />
              </div>
              <p class="text-xs font-bold text-slate-700">Veo Video Generator</p>
              <p class="text-[11px] text-slate-400 mt-1 max-w-xs">Tạo phân cảnh và b-roll mới bằng AI với mô hình Google Veo.</p>
            </div>

            <div v-for="(item, idx) in chat" :key="idx" :class="['flex flex-col', item.role === 'user' ? 'items-end' : 'items-start']">
              <div v-if="item.type === 'image' && item.role === 'model'" class="rounded-2xl overflow-hidden border border-slate-200 shadow-sm max-w-[85%]">
                <img :src="item.text" class="w-full object-cover" />
              </div>
              <div v-else-if="item.type === 'video' && item.role === 'model'" class="rounded-2xl overflow-hidden border border-slate-200 shadow-sm max-w-[85%]">
                <video controls class="w-full">
                  <source :src="item.text" type="video/mp4">
                  Trình duyệt không hỗ trợ thẻ video.
                </video>
              </div>
              <div
                v-else
                :class="[
                  'max-w-[85%] rounded-2xl px-4 py-2.5 text-xs font-medium leading-relaxed shadow-xs',
                  item.role === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-xs'
                    : 'bg-slate-100 text-slate-800 rounded-tl-xs border border-slate-200/80'
                ]"
                v-html="item.text"
              ></div>
            </div>
          </div>

          <!-- Chat Input -->
          <form class="p-3 border-t border-slate-100 bg-white flex items-center gap-2 shrink-0" @submit.prevent="askGemini">
            <textarea
              v-model="question"
              rows="1"
              placeholder="Yêu cầu tạo cảnh Veo..."
              class="flex-1 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all resize-none"
              @keydown.enter.exact.prevent="askGemini"
            ></textarea>
            <button
              type="submit"
              :disabled="isLoading2 || !question"
              class="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-semibold transition-all shadow-xs shrink-0"
            >
              <span class="loading loading-spinner loading-xs" v-if="isLoading2"></span>
              <span v-else>Tạo</span>
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
