<script setup>
import * as data from '~/utils/data-service';
import swal from 'sweetalert2';

useHead({ title: 'Dự án' });

definePageMeta({
  title: 'Dự án',
  layout: 'dashboard',
});

const projects = ref([]);
const isLoading = ref(true);
const newProject = ref({
  name: '',
  description: '',
  createdBy: useCookie('user').value.userName,
});
const showModalCreate = ref(false);

const selectedProject = ref({
  name: '',
  description: '',
  createdBy: '',
  createdAt: '',
});
const showModalEdit = ref(false);

onBeforeMount(async () => {
  let _projects = await data.find('projects');
  _projects = _projects.filter((p) => p.isDisabled != 1);

  let thumbnails = await data.find('thumbnails');
  projects.value = _projects.map((p) => {
    // use existed thumbnail if available
    if (p.thumbnailUrl) return p;

    let thumbnail = thumbnails.find((t) => t.projectId == p.id);
    if (thumbnail) p.thumbnailUrl = thumbnail.thumbnailUrl ;
    return p;
  });

  isLoading.value = false;
});

const isLoading2 = ref(false);

async function createProject() {
  isLoading2.value = true;

  let result = await data.createProject(newProject.value);
  projects.value.push(result.data);

  newProject.value.name = '';
  newProject.value.description = '';

  showModalCreate.value = false;
  isLoading2.value = false;
}

function deleteProject(project) {
  swal.fire({
    title: 'Xác nhận xóa',
    text: `Bạn có chắc chắn muốn xóa dự án ${project.name}?`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Xóa',
    cancelButtonText: 'Hủy',
  }).then((result) => {
    if (result.isConfirmed) {
      data.update('projects', { id: project.id, isDisabled: 1 });
      projects.value = projects.value.filter((p) => p.id !== project.id);
    }
  });
}

function showEditProject(project) {
  selectedProject.value = JSON.parse(JSON.stringify(project));
  showModalEdit.value = true;
}

function updateProject() {
  data.update('projects', selectedProject.value);
  let index = projects.value.findIndex((p) => p.id == selectedProject.value.id);
  projects.value[index] = JSON.parse(JSON.stringify(selectedProject.value));

  showModalEdit.value = false;
}
</script>

<template>
  <div class="app">
    <projects-skeleton v-if="isLoading" />

    <!-- projects -->
    <div v-else class="projects">
      <projects-project-item v-for="project in projects" :project="project" @click-delete="deleteProject" @click-edit="showEditProject" />
    </div>

    <!-- floating button -->
    <label for="modal_create"
      class="fixed right-3 bottom-3 btn btn-circle btn-primary">
      <IconPlus class="size-6 fill-primary-content" />
    </label>

    <!-- modal create project -->
    <input type="checkbox" id="modal_create" class="modal-toggle" v-model="showModalCreate" />
    <div class="modal" role="dialog">
      <form class="modal-box flex flex-col gap-3" @submit.prevent="createProject()">
        <h3 class="text-lg font-bold">Thêm dự án mới</h3>

        <label class="form-control w-full">
          <div class="label">
            <span class="label-text">Tên dự án</span>
          </div>
          <input type="text" v-model="newProject.name" class="input input-bordered w-full" required />
        </label>

        <label class="form-control w-full">
          <div class="label">
            <span class="label-text">Miêu tả dự án</span>
          </div>
          <input type="text" v-model="newProject.description" class="input input-bordered w-full" required />
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

    <!-- modal edit project -->
    <input type="checkbox" id="modal_edit" class="modal-toggle" v-model="showModalEdit" />
    <div class="modal" role="dialog">
      <form class="modal-box flex flex-col gap-3" @submit.prevent="updateProject()">
        <h3 class="text-lg font-bold">Chỉnh sửa thông tin dự án</h3>

        <label class="form-control w-full">
          <div class="label">
            <span class="label-text">Tên dự án</span>
          </div>
          <input type="text" v-model="selectedProject.name" class="input input-bordered w-full" required />
        </label>

        <label class="form-control w-full">
          <div class="label">
            <span class="label-text">Miêu tả dự án</span>
          </div>
          <input type="text" v-model="selectedProject.description" class="input input-bordered w-full" required />
        </label>

        <label class="form-control w-full">
          <div class="label">
            <span class="label-text">Tạo bởi</span>
          </div>
          <input type="text" v-model="selectedProject.createdBy" class="input input-bordered w-full" disabled />
        </label>

        <label class="form-control w-full">
          <div class="label">
            <span class="label-text">Tạo lúc</span>
          </div>
          <input type="text" v-model="selectedProject.createdAt" class="input input-bordered w-full" disabled />
        </label>

        <div class="modal-action">
          <label for="modal_edit" class="btn">Thoát</label>
          <button type="submit" class="btn btn-primary">Thêm</button>
        </div>
      </form>
      <label class="modal-backdrop" for="modal_edit">Thoát</label>
    </div>

  </div>
</template>

<style scoped>
.app {
  @apply mx-auto p-6 container w-full min-h-screen flex flex-col gap-3;
}

.projects {
  @apply grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3;
}
</style>
