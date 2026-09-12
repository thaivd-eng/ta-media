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

  newVideo.value.name = '';
  showModalCreate.value = false;
  isLoading2.value = false;
  swal.fire({
    icon: 'success',
    title: 'Thành công',
    text: 'Đã tạo video mới!',
    timer: 1200,
    showConfirmButton: false,
  });
}

function showEditVideo(video) {
  selectedVideo.value = JSON.parse(JSON.stringify(video));
  showModalEdit.value = true;
}

function updateVideo() {
  data.update('videos', selectedVideo.value);
  let index = videos.value.findIndex((v) => v.id == selectedVideo.value.id);
  if (index !== -1) {
    videos.value[index] = selectedVideo.value;
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
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
      <div class="flex items-center gap-4">
        <NuxtLink
          to="/projects"
          class="size-10 rounded-xl bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 flex items-center justify-center transition-colors shrink-0"
          title="Quay lại danh sách dự án"
        >
          <IconAngleLeft class="size-5 fill-current" />
        </NuxtLink>

        <div>
          <div class="flex items-center gap-2 text-xs font-medium text-slate-400 mb-0.5">
            <NuxtLink to="/projects" class="hover:text-blue-600 transition-colors">Dự án</NuxtLink>
            <span>/</span>
            <span class="text-blue-600 font-semibold">{{ project.name || 'Chi tiết' }}</span>
          </div>
          <h1 class="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            {{ project.name || 'Đang tải dự án...' }}
          </h1>
          <p v-if="project.description" class="text-xs sm:text-sm text-slate-500 mt-1">
            {{ project.description }}
          </p>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex items-center gap-2.5 self-end sm:self-center">
        <!-- Sheet trigger if available -->
        <label
          v-if="project.sheetUrl"
          for="show-sheet"
          class="cursor-pointer px-4 py-2.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs sm:text-sm flex items-center gap-2 transition-colors"
        >
          <IconFile class="size-4 fill-current" />
          <span>Kịch bản Sheet</span>
        </label>

        <!-- Add video button -->
        <label
          for="modal_create"
          class="cursor-pointer px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-xs sm:text-sm flex items-center gap-2 shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 transition-all active:scale-95 whitespace-nowrap"
        >
          <IconPlus class="size-4 fill-current" />
          <span>Thêm video</span>
        </label>
      </div>
    </div>

    <!-- Skeleton Loading -->
    <projects-skeleton v-if="isLoading" />

    <!-- Empty State -->
    <div
      v-else-if="videos.length === 0"
      class="bg-white rounded-3xl border border-slate-200/80 p-12 text-center flex flex-col items-center justify-center max-w-lg mx-auto w-full my-8 shadow-xs"
    >
      <div class="size-16 rounded-3xl bg-blue-50 flex items-center justify-center text-blue-600 mb-4 ring-8 ring-blue-50/50">
        <IconCirclePlay class="size-8 fill-current" />
      </div>
      <h3 class="text-lg font-bold text-slate-800 mb-1">Chưa có video nào trong dự án này</h3>
      <p class="text-xs sm:text-sm text-slate-500 max-w-sm mb-6">
        Hãy bắt đầu thêm video đầu tiên để tải lên các phiên bản và thu thập phản hồi từ người xem.
      </p>
      <label
        for="modal_create"
        class="cursor-pointer px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-md shadow-blue-600/20 transition-all"
      >
        <IconPlus class="size-4 fill-current" />
        <span>Thêm video ngay</span>
      </label>
    </div>

    <!-- Videos Grid -->
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      <project-item
        v-for="video in videos"
        :key="video.id"
        :video="video"
        @click-delete="deleteVideo"
        @click-edit="showEditVideo"
      />
    </div>

    <!-- Mobile Floating Action Button -->
    <label
      for="modal_create"
      class="sm:hidden fixed right-5 bottom-6 size-13 rounded-full bg-blue-600 text-white shadow-xl shadow-blue-600/30 flex items-center justify-center cursor-pointer z-20 active:scale-95 transition-transform"
    >
      <IconPlus class="size-6 fill-current" />
    </label>

    <!-- Modal Create Video -->
    <input type="checkbox" id="modal_create" class="modal-toggle" v-model="showModalCreate" />
    <div class="modal modal-bottom sm:modal-middle" role="dialog">
      <div class="modal-box bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-2xl max-w-lg">
        <div class="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
          <div class="size-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <IconPlus class="size-5 fill-current" />
          </div>
          <div>
            <h3 class="text-lg font-bold text-slate-900">Thêm video mới</h3>
            <p class="text-xs text-slate-500">Đặt tên cho video để bắt đầu tải lên phiên bản</p>
          </div>
        </div>

        <form class="space-y-4" @submit.prevent="createVideo()">
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Tên video <span class="text-rose-500">*</span>
            </label>
            <input
              type="text"
              v-model="newVideo.name"
              placeholder="VD: Cảnh quay 01 - Giới thiệu sản phẩm"
              class="w-full px-4 py-3 rounded-xl border border-slate-300 bg-slate-50/50 text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
              required
            />
          </div>

          <div class="modal-action pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
            <label for="modal_create" class="px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs sm:text-sm font-semibold cursor-pointer transition-colors">
              Hủy bỏ
            </label>
            <button
              type="submit"
              :disabled="isLoading2"
              class="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs sm:text-sm font-semibold shadow-md shadow-blue-600/20 transition-all flex items-center gap-2"
            >
              <span class="loading loading-spinner loading-xs" v-if="isLoading2"></span>
              <span v-if="isLoading2">Đang tạo...</span>
              <span v-else>Thêm video</span>
            </button>
          </div>
        </form>
      </div>
      <label class="modal-backdrop bg-slate-900/40 backdrop-blur-xs" for="modal_create">Thoát</label>
    </div>

    <!-- Modal Edit Video -->
    <input type="checkbox" id="modal_edit" class="modal-toggle" v-model="showModalEdit" />
    <div class="modal modal-bottom sm:modal-middle" role="dialog">
      <div class="modal-box bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-2xl max-w-lg">
        <div class="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
          <div class="size-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <IconPenToSquare class="size-5 fill-current" />
          </div>
          <div>
            <h3 class="text-lg font-bold text-slate-900">Chỉnh sửa thông tin video</h3>
            <p class="text-xs text-slate-500">Cập nhật tiêu đề video</p>
          </div>
        </div>

        <form class="space-y-4" @submit.prevent="updateVideo()">
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Tên video <span class="text-rose-500">*</span>
            </label>
            <input
              type="text"
              v-model="selectedVideo.name"
              class="w-full px-4 py-3 rounded-xl border border-slate-300 bg-slate-50/50 text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
              required
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
            <label for="modal_edit" class="px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs sm:text-sm font-semibold cursor-pointer transition-colors">
              Đóng
            </label>
            <button
              type="submit"
              class="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold shadow-md shadow-blue-600/20 transition-all"
            >
              Lưu thay đổi
            </button>
          </div>
        </form>
      </div>
      <label class="modal-backdrop bg-slate-900/40 backdrop-blur-xs" for="modal_edit">Thoát</label>
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
          <p class="font-medium text-slate-700">Dự án này chưa được gắn liên kết Sheet</p>
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
