<script setup>
import * as data from '~/utils/data-service';
import swal from 'sweetalert2';

useHead({ title: 'Video' });

definePageMeta({
  title: 'Video',
  layout: 'dashboard',
});

const user = useCookie('user');

const isLoading = ref(true);
const project = ref({});
const videos = ref([]);

const showModalCreate = ref(false);
const newVideo = ref({ name: '' });

const selectedVideo = ref({
  name: '',
  createdBy: '',
  createdAt: '',
});
const showModalEdit = ref(false);

onBeforeMount(async () => {
  await fetchData();
  useHead({ title: project.value.name });
  useRoute().meta.title = 'Dự án ' + project.value.name;
});

async function findThumbnail() {
  let thumbnails = await data.find('thumbnails');

  videos.value.map((v) => {
    let thumbnail = thumbnails.find((t) => t.videoId == v.id);
    if (thumbnail) v.thumbnailUrl = thumbnail.url;
  });
}


async function fetchData() {
  isLoading.value = true;

  let projectId = useRoute().query.id;
  let response = await data.find('projects');
  let temp = response.find((p) => p.id == projectId);

  if (!temp) return useRouter().push('/projects');

  // get videos
  response = await data.find('videos');
  videos.value = response.filter((v) => v.projectId == projectId && v.isDisabled != 1);

  // get thumbnail
  let thumbnails = await data.find('thumbnails');
  videos.value = videos.value.map((v) => {
    let thumbnail = thumbnails.find((t) => t.videoId == v.id);
    if (thumbnail) v.thumbnailUrl = thumbnail.thumbnailUrl ;
    return v;
  });

  // get latest versions and is done
  let versions = await data.find('versions');
  videos.value = videos.value.map((v) => {
    v.versions = versions.filter((ver) => ver.videoId == v.id);

    let done = versions.filter((ver) => ver.videoId == v.id && ver.status == 1);
    if (done.length) v.done = 1;

    return v;
  });

  // count feedbacks of latest version
  let feedbacks = await data.find('feedbacks');
  videos.value = videos.value.map((v) => {
    let latestVersion = v.versions[v.versions.length - 1];
    if (!latestVersion) {
      v.feedbacks = 0;
      return v;
    }
    v.feedbacks = feedbacks.filter((f) => f.versionId == latestVersion.id).length;
    return v;
  });

  project.value = temp;
  isLoading.value = false;
}

async function deleteVideo(video) {
  swal.fire({
    title: 'Xác nhận xóa',
    text: `Bạn có chắc chắn muốn xóa video ${video.name}?`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Xóa',
    cancelButtonText: 'Hủy',
  }).then((result) => {
    if (result.isConfirmed) {
      data.update('videos', { id: video.id, isDisabled: 1 });
      videos.value = videos.value.filter((v) => v.id !== video.id);
    }
  });
}

const isLoading2 = ref(false);

async function createVideo() {
  isLoading2.value = true;

  if (!newVideo.value.name) return;

  let video = {
    id: Date.now(),
    name: newVideo.value.name,
    projectId: project.value.id,
    createdBy: user.value.userName,
    thumbnailUrl: '',
    folderId: project.value.folderId,
    versions: [],
    done: 0,
    feedbacks: 0,
  };

  let result = await data.createVideo(video);
  videos.value.push(result.data);

  /*
  let version = {
    id: Date.now(),
    videoId: video.id,
    name: 'v1',
    createdBy: user.value.userName,
  };
  data.create('versions', version);
  */

  newVideo.name = '';
  showModalCreate.value = false;
  isLoading2.value = false;
}

function showEditVideo(video) {
  selectedVideo.value = JSON.parse(JSON.stringify(video));
  showModalEdit.value = true;
}

function updateVideo() {
  data.update('videos', selectedVideo.value);
  let index = videos.value.findIndex((v) => v.id == selectedVideo.value.id);
  videos.value[index] = selectedVideo.value;

  showModalEdit.value = false;
}
</script>

<template>
  <div class="mx-auto p-6 container w-full min-h-screen flex flex-col gap-3">
    <projects-skeleton v-if="isLoading" />

    <!-- grid videos -->
    <div v-else class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      <project-item v-for="video in videos" :video="video" @click-delete="deleteVideo" @click-edit="showEditVideo" />
    </div>

    <!-- floating button -->
    <label for="modal_create"
      class="fixed right-3 bottom-3 btn btn-circle btn-primary">
      <IconPlus class="size-4 fill-primary-content" />
    </label>

    <div class="w-full h-full flex flex-col justify-center items-center gap-3" v-if="!isLoading && videos.length < 1">
      <IconFile class="size-20 fill-base-content/30" />
      <p>Chưa có video nào cả</p>
    </div>

    <!-- modal create -->
    <input type="checkbox" id="modal_create" class="modal-toggle" v-model="showModalCreate" />
    <div class="modal" role="dialog">
      <form class="modal-box flex flex-col gap-3" @submit.prevent="createVideo()">
        <h3 class="text-lg font-bold">Thêm video mới</h3>

        <label class="form-control w-full">
          <div class="label">
            <span class="label-text">Tên video</span>
          </div>
          <input type="text" v-model="newVideo.name" class="input input-bordered w-full" required />
        </label>

        <div class="modal-action">
          <label for="modal_create" class="btn">Thoát</label>
          <button type="submit" class="btn btn-primary">
            <span class="loading loading-spinner loading-xs" v-if="isLoading2"></span>
            <span v-if="isLoading2">Đang xử lý...</span>
            <span v-else>Thêm</span>
          </button>
        </div>
      </form>
      <label class="modal-backdrop" for="modal_create">Thoát</label>
    </div>

    <!-- modal edit -->
    <input type="checkbox" id="modal_edit" class="modal-toggle" v-model="showModalEdit" />
    <div class="modal" role="dialog">
      <form class="modal-box flex flex-col gap-3" @submit.prevent="updateVideo()">
        <h3 class="text-lg font-bold">Chỉnh sửa thông tin video</h3>

        <label class="form-control w-full">
          <div class="label">
            <span class="label-text">Tên video</span>
          </div>
          <input type="text" v-model="selectedVideo.name" class="input input-bordered w-full" required />
        </label>

        <label class="form-control w-full">
          <div class="label">
            <span class="label-text">Tạo bởi</span>
          </div>
          <input type="text" v-model="selectedVideo.createdBy" class="input input-bordered w-full" disabled />
        </label>

        <label class="form-control w-full">
          <div class="label">
            <span class="label-text">Tạo lúc</span>
          </div>
          <input type="text" v-model="selectedVideo.createdAt" class="input input-bordered w-full" disabled />
        </label>

        <div class="modal-action">
          <label for="modal_edit" class="btn">Thoát</label>
          <button type="submit" class="btn btn-primary">Cập nhật</button>
        </div>
      </form>
      <label class="modal-backdrop" for="modal_edit">Thoát</label>
    </div>

  </div>
</template>
