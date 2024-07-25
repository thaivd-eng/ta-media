<script setup>
import * as data from '~/utils/data-service';
import videojs from 'video.js';
import 'video.js/dist/video-js.min.css';
import Swal from 'sweetalert2';

var player = null;

useHead({ title: 'Video' });

const store = useVideoStore();
const isLoading = ref(true);
const video = computed(() => store.video);
const versions = computed(() => store.versions);

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

const currentVersion = computed(() => {
  if (player && store.currentVersion) {
    player.reset();

    player.src({
      src: store.currentVersion.videoUrl,
      type: 'video/mp4'
    });
  }

  return store.currentVersion;
});

const uploadUrl = computed(() => {
  if (!video.value) return;
  return data.getUploadUrl(video.value.id);
});

const videoPlayer = ref(null);
const showModalUpload = ref(false);

onBeforeMount(async () => {
  fetchData();
});

onMounted(() => {
  initPlayer();
});

onBeforeUnmount(() => {
  player.dispose();
});

async function fetchData() {
  isLoading.value = true;
  await store.fetchData();
  isLoading.value = false;

  if (!currentVersion.value) return;

  player.src({
    src: currentVersion.value.videoUrl,
    type: 'video/mp4'
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

  let time = player.currentTime();
  let content = newFeedback.value;
  let id = Date.now();

  createMarker(player, { id, time, content });

  player.play();
  newFeedback.value = '';

  store.createFeedback({ id, time, content });
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
  let time = feedback.time;

  player.currentTime(time);
  player.pause();
}

function removeFeedback(id) {
  Swal.fire({
    title: 'Bạn có chắc chắn muốn xóa phản hồi này?',
    text: 'Bạn sẽ không thể hoàn tác hành động này!',
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
</script>

<template>
  <div class="w-full min-h-screen flex flex-col">
    <video-nav-bar @create-version="uploadVideo"/>

    <div class="mx-auto p-6 container w-full min-h-screen flex flex-col gap-3">
      <video-skeleton v-if="isLoading" />

      <!-- uploader -->
      <div class="w-full min-h-screen flex flex-col justify-center items-center gap-3" v-if="!isLoading && (currentVersion && currentVersion.videoUrl == '') || !currentVersion">
        <p>Chưa có video nào cả, hãy bắt đầu với một video mới</p>
        <button class="btn btn-primary" @click="uploadVideo">Tải video</button>
      </div>

      <!-- video + feedback -->
      <div :class="['flex flex-col gap-6 lg:flex-row', !isLoading && currentVersion && currentVersion.videoUrl || 'hidden']">
        <!-- video player -->
        <div class="w-full flex flex-col gap-6">
          <video 
            id="video-player"
            ref="videoPlayer"
            data-setup='{}'
            class="vjs-fill video-js aspect-video">
          </video>

          <form class="flex items-center gap-6" @submit.prevent="createFeedback">
            <textarea class="input input-bordered w-full" v-model="newFeedback" @click="pauseVideo"></textarea>
            <button class="btn btn-circle btn-primary">
              <IconPaperPlane class="size-4" />
            </button>
          </form>
        </div>

        <!-- feedback -->
        <div class="rounded border p-6 shrink-0 w-full h-full flex flex-col gap-6 bg-base-100 lg:w-96">
          <!-- project infomation -->
          <div>
            <h2 class="mb-3 text-lg font-bold" v-if="feedbacks.length > 0">Các phản hồi</h2>
            <div class="p-6 flex flex-col justify-center items-center gap-3" v-else>
              <icon-circle-xmark class="size-12" />
              <p>Chưa có phản hồi nào cả</p>
            </div>
          </div>

          <!-- project feedback -->
          <div class="h-full flex flex-col divide-y overflow-y-scroll">
            <div v-for="feedback in feedbacks" :id="'feedback-' + feedback.id" class="py-6 flex flex-col gap-1.5">
              <div class="flex items-center gap-1.5">
                <div class="rounded-full size-8 bg-primary"></div>
                <span class="font-bold">{{ feedback.createdBy }}</span>
                <span class="text-sm text-gray-400">{{ feedback.createdAt }}</span>
              </div>
              <div>
                <a href="javascript:void(0)" @click="onFeedbackClick(feedback.id)" class="mr-1.5 font-bold text-primary">
                  {{ feedback.timeFormated }} 
                </a>
                <span>{{ feedback.content }}</span>
              </div>
              <div class="flex gap-3">
                <button class="btn btn-circle btn-xs btn-ghost">
                  <IconThumbsUp class="size-6 fill-primary" />
                </button>
                <button class="btn btn-circle btn-xs btn-ghost">
                  <IconCommentDots class="size-6 fill-primary" />
                </button>
                <button class="ml-auto btn btn-circle btn-xs btn-ghost" @click="removeFeedback(feedback.id)">
                  <IconTrash class="size-5 fill-error" />
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>

  </div>
</template>
