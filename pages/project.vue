<script setup>
// import modules
import Swal from 'sweetalert2';
import videojs from 'video.js';

import * as mockup from '@/utils/mockup-data';
import "video.js/dist/video-js.min.css";

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

  findComments();

  player = videojs(videoPlayer.value, {
    autoplay: false,
    controls: true,
    sources: [
      {
        src: currentVideo.value.url,
        type: 'video/mp4'
      }
    ]
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
}

function onNavActionTaped() {
  useRouter().replace('/');
}
</script>

<template>
  <div class="w-full h-screen flex flex-col bg-gray-50">
    <!-- nav bar -->
    <NavBar class="border-b shrink-0">
      <template #nav-leading>
        <div class="flex-none">
          <button class="btn btn-square btn-ghost" @click="onNavActionTaped">
            <svg class="inline-block h-5 w-5 stroke-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512"><path d="M41.4 233.4c-12.5 12.5-12.5 32.8 0 45.3l160 160c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L109.3 256 246.6 118.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0l-160 160z"/></svg>
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
    <div :class="['mx-auto p-6 container w-full h-full flex gap-6', isLoading && 'hidden']">
      <div class="rounded w-full flex flex-col gap-6">
        <div class="w-full flex flex-col gap-6">
          <video v-if="showVideo" ref="videoPlayer" data-setup='{"fluid": true}' class="video-js aspect-video"></video>
          <div v-else class="rounded border dashed w-full aspect-video flex flex-col gap-3 justify-center items-center bg-gray-100">
            <p class="text-gray-500">Don't have any video</p>
            <button class="btn btn-primary">Upload a video</button>
          </div>
        </div>
        <textarea class="rounded border px-3 py-1.5 bg-gray-100 focus:outline-none focus:ring-1 focus:ring-primary"></textarea>
      </div>

      <div class="rounded border p-6 shrink-0 w-96 h-full flex flex-col gap-6 bg-white overflow-y-scroll">
        <!-- project infomation -->
        <div v-if="project">
          <h2 class="mb-3 text-lg font-bold">{{ project.name }}</h2>
          <p >{{ project.description}}</p>
        </div>

        <div class="border-b"></div>

        <!-- project feedback -->
        <div class="h-full flex flex-col gap-6">
          <div v-for="comment in comments" class="flex flex-col gap-1.5">
            <div class="flex items-center gap-1.5">
              <div class="rounded-full size-8 bg-primary"></div>
              <span class="font-bold">{{ comment.createdBy }}</span>
              <span class="text-sm text-gray-400">{{ comment.createdAt }}</span>
            </div>
            <div class="h-full flex gap-1.5">
              <a href="#" class="font-bold text-primary">{{ comment.position }}</a>
              <p>{{ comment.content }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>