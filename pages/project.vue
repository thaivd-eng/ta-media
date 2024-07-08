<script setup>
// import modules
import Swal from 'sweetalert2';
import videojs from 'video.js';

import * as mockup from '@/utils/mockup-data';
import 'video.js/dist/video-js.min.css';
import { comment } from 'postcss';

// define page head
useHead({
  title: 'Project',
  meta: [
    {
      name: 'description',
      content: 'Feedback for video'
    }
  ]
});

// define page meta
definePageMeta({
  title: 'Project',
  layout: 'default'
});

// states + computed
const project = ref(null);
const videos = ref([]);
const comments = ref([]);
const currentVideo = ref(null);
const versions = computed(() => videos.value.map((video) => video.version));

const isLoading = ref(true);
const videoPlayer = ref(null);
var player = null;
const showVideo = ref(true);

// on mounted do something...
onMounted(async () => {
  await fetchData();

  if (!currentVideo.value) {
    showVideo.value = false;
    return;
  }

  await findComments();

  player = videojs(videoPlayer.value, {
    autoplay: false,
    controls: true,
    sources: [
      {
        src: currentVideo.value.videoUrl,
        type: 'video/mp4'
      }
    ]
  }, () => {
    player.one('loadedmetadata', () => {
      comments.value.forEach(comment => {
        const markerEl = createMarker(comment);
        player.el().querySelector('.vjs-progress-control').appendChild(markerEl);
      });
    });
  });
});

// methods
async function fetchData() {
  let projectId = useRoute().query.id;
  let projectData = await mockup.findProject();
  let videoData = await mockup.findVideo();

  let tempProject = projectData.find((_project) => _project.id == projectId);
  let tempVideo = videoData.filter((_video) => _video.projectId == projectId);

  project.value = tempProject;
  videos.value = tempVideo;
  currentVideo.value = tempVideo[0];
  isLoading.value = false;
}

async function findComments() {
  let commentData = await mockup.findCommentByVideo(currentVideo.value.id);
  comments.value = commentData;
  comments.value = comments.value.sort((a, b) => a.time - b.time);
}

function onNavActionTaped() {
  useRouter().replace('/');
}

function createMarker(marker) {
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

  return markerEl;
}

const feedback = ref('');

function onSubmitFeedback(e) {
  // check empty feedback
  if (!feedback.value) return;

  // get current time of video + feedback
  let time = player.currentTime();
  let content = feedback.value;

  let timeFormated = new Date(0,0,0,0,0,time).toString().slice(16,24);

  // create marker
  let id = Date.now();
  const markerEl = createMarker({ id, time, content });
  player.el().querySelector('.vjs-progress-control').appendChild(markerEl);

  // create feedback
  comments.value.unshift({
    videoId: currentVideo.value.id,
    time,
    content,
    timeFormated,
    id
  });

  // sort comments by time
  comments.value = comments.value.sort((a, b) => a.time - b.time);

  // clear feedback
  feedback.value = '';

  // continue video
  player.play();
}

function onFocusFeedback() {
  player.pause();
}

function removeFeedback(id) {
  Swal.fire({
    title: 'Are you sure?',
    text: 'You will not be able to recover this feedback!',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Yes, delete it!',
    cancelButtonText: 'No, keep it'
  }).then((result) => {
    if (!result.isConfirmed) return;
    comments.value = comments.value.filter(comment => comment.id != id);

    // delete marker
    const markerEl = document.getElementById('marker-' + id);
    if (markerEl) {
      player.el().querySelector('.vjs-progress-control').removeChild(markerEl);
    }
  });
}

function onFeedbackClick(id) {
  let comment = comments.value.find((comment) => comment.id == id);
  let time = comment.time;

  // go to comment
  player.currentTime(time);
  player.pause();
}
</script>

<template>
  <div class="w-full h-screen flex flex-col bg-base-100 dark:border-primary">
    <!-- nav bar -->
    <NavBar class="border-b shrink-0">
      <template #nav-leading>
        <div class="flex-none">
          <button class="btn btn-square btn-ghost" @click="onNavActionTaped">
            <IconAngleLeft class="inline-block h-5 w-5 fill-current" />
          </button>
        </div>

        <div class="flex-1">
          <a class="btn btn-ghost text-xl">{{ project ? project.name : 'Loading...' }}</a>
          <div class="dropdown" v-if="currentVideo">
            <div tabindex="0" role="button" class="btn btn-sm m-1">{{ currentVideo.version }}</div>
            <ul tabindex="0" class="dropdown-content menu bg-base-100 rounded-box z-[1] w-auto p-2 shadow">
              <li v-for="version in versions"><a>{{ version }}</a></li>
            </ul>
          </div>
        </div>
      </template>

      <template #nav-action>
        <button class="btn btn-sm btn-primary">Share</button>
      </template>
    </NavBar>

    <!-- loader/skeleton -->
    <project-skeleton v-if="isLoading" />

    <!-- video & comment -->
    <div :class="['mx-auto p-6 container w-full h-full flex flex-col gap-6 lg:flex-row', isLoading && 'hidden']">
      <div class="rounded w-full flex flex-col gap-6">
        <div class="w-full flex flex-col gap-6">
          <video v-if="showVideo" ref="videoPlayer" data-setup='{"fluid": true}' class="video-js aspect-video"></video>
          <div v-else class="rounded border dashed w-full aspect-video flex flex-col gap-3 justify-center items-center bg-base-200">
            <p class="text-base-content">Don't have any video</p>
            <button class="btn btn-primary">Upload a video</button>
          </div>
        </div>

        <form class="flex items-center gap-3" @submit.prevent="onSubmitFeedback">
          <textarea v-model="feedback" @focus="onFocusFeedback" class="rounded border px-3 py-1.5 w-full bg-base-200 focus:outline-none focus:ring-1 focus:ring-primary"></textarea>
          <button type="submit" class="btn btn-circle btn-primary">
            <IconPaperPlane class="size-4" />
          </button>
        </form>
      </div>

      <div class="rounded border p-6 shrink-0 w-full h-full flex flex-col gap-6 bg-base-100 lg:w-96">
        <!-- project infomation -->
        <div v-if="project">
          <h2 class="mb-3 text-lg font-bold">{{ project.name }}</h2>
          <p >{{ project.description}}</p>
        </div>

        <!-- project feedback -->
        <div class="h-full flex flex-col divide-y overflow-y-scroll">
          <div v-for="comment in comments" :id="'feedback-' + comment.id" class="py-6 flex flex-col gap-1.5">
            <div class="flex items-center gap-1.5">
              <div class="rounded-full size-8 bg-primary"></div>
              <span class="font-bold">{{ comment.createdBy }}</span>
              <span class="text-sm text-gray-400">{{ comment.createdAt }}</span>
            </div>
            <div>
              <a href="javascript:void(0)" @click="onFeedbackClick(comment.id)" class="mr-1.5 font-bold text-primary">
                {{ comment.timeFormated }} 
              </a>
              <span>{{ comment.content }}</span>
            </div>
            <div class="flex gap-3">
              <button class="btn btn-circle btn-xs btn-ghost">
                <IconThumbsUp class="size-6 fill-primary" />
              </button>
              <button class="btn btn-circle btn-xs btn-ghost">
                <IconCommentDots class="size-6 fill-primary" />
              </button>
              <button class="ml-auto btn btn-circle btn-xs btn-ghost" @click="removeFeedback(comment.id)">
                <IconTrash class="size-5 fill-error" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>