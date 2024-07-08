<script setup>
// import modules
import Swal from 'sweetalert2';
import * as data from '@/utils/data';

// define page head + page meta
useHead({ title: 'Trang chủ' });
definePageMeta({
  title: 'Trang chủ',
  layout: 'dashboard'
});

// states
const isLoading = ref(true);
const projects = ref([]);
const name = ref('');
const description = ref('');
const user = ref('tr1nh');

// on before mount do something...
onBeforeMount(() => {
  fetchData();
});

// methods
async function fetchData() {
  let res = await data.findProject();
  projects.value = res;
  isLoading.value = false;
}

function onSubmitCreate() {
  let newProject = {
    name: name.value,
    description: description.value,
    createdBy: user.value
  };

  data
    .createProject(newProject)  
    .then((res) => {
      Swal.fire({
        icon: 'success',
        title: 'Thêm dự án thành công'
      });
      fetchData();
    })
    .catch((err) => {
      Swal.fire({
        icon: 'error',
        title: 'Oops...',
        text: err.message
      });
    });
}
</script>

<template>
  <div>
    <!-- loader -->
    <home-skeleton v-if="isLoading" />

    <!-- list project -->
    <div v-else class="projects">
      <home-project-item v-for="project
        in projects" :name="project.name" :link="'/project?id=' + project.id">
      </home-project-item>
    </div>

    <!-- floating button -->
    <label for="modal_create" class="fixed right-6 bottom-6 shadow-lg rounded-full p-3 aspect-square bg-primary cursor-pointer">
      <IconPlus />
    </label>

    <!-- modal create project -->
    <input type="checkbox" id="modal_create" class="modal-toggle" />
    <div class="modal" role="dialog">
      <form class="modal-box flex flex-col gap-3" @submit.prevent="onSubmitCreate()">
        <h3 class="text-lg font-bold">Thêm dự án mới</h3>

        <label class="form-control w-full">
          <div class="label">
            <span class="label-text">Tên dự án</span>
          </div>
          <input type="text" v-model="name" class="input input-bordered w-full" required />
        </label>

        <label class="form-control w-full">
          <div class="label">
            <span class="label-text">Miêu tả dự án</span>
          </div>
          <input type="text" v-model="description" class="input input-bordered w-full" required />
        </label>

        <div class="modal-action">
          <label for="modal_create" class="btn">Thoát</label>
          <button type="submit" class="btn btn-primary">Thêm</button>
        </div>
      </form>
      <label class="modal-backdrop" for="modal_create">Thoát</label>
    </div>
  </div>
</template>

<style scoped>
.projects {
  @apply p-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3;
}
</style>