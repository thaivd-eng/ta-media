<script setup>
import * as data from '~/utils/data-service';
import swal from 'sweetalert2';

useHead({ title: 'Cuộc thi - MediaAI' });

definePageMeta({
  title: 'Cuộc thi',
  layout: 'dashboard',
});

const projects = ref([]);
const searchQuery = ref('');
const isLoading = ref(true);

const userCookie = useCookie('user');
const currentUser = computed(() => {
  if (!userCookie.value) return { userName: 'admin' };
  if (typeof userCookie.value === 'string') {
    try {
      return JSON.parse(userCookie.value);
    } catch {
      return { userName: userCookie.value };
    }
  }
  return userCookie.value;
});

const newProject = ref({
  name: '',
  description: '',
  createdBy: '',
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
  newProject.value.createdBy = currentUser.value.userName || 'admin';

  let _projects = await data.find('projects');
  _projects = _projects.filter((p) => p.isDisabled != 1);

  let thumbnails = await data.find('thumbnails');
  projects.value = _projects.map((p) => {
    if (p.thumbnailUrl) return p;
    let thumbnail = thumbnails.find((t) => t.projectId == p.id);
    if (thumbnail) p.thumbnailUrl = thumbnail.thumbnailUrl;
    return p;
  });

  isLoading.value = false;
});

const filteredProjects = computed(() => {
  if (!searchQuery.value) return projects.value;
  const q = searchQuery.value.toLowerCase().trim();
  return projects.value.filter((p) => 
    (p.name && p.name.toLowerCase().includes(q)) || 
    (p.description && p.description.toLowerCase().includes(q))
  );
});

const isLoading2 = ref(false);

async function createProject() {
  if (!newProject.value.name) return;
  isLoading2.value = true;

  try {
    let result = await data.createProject(newProject.value);
    projects.value.unshift(result.data);

    newProject.value.name = '';
    newProject.value.description = '';
    showModalCreate.value = false;

    swal.fire({
      icon: 'success',
      title: 'Thành công',
      text: 'Cuộc thi mới đã được khởi tạo!',
      timer: 1500,
      showConfirmButton: false,
    });
  } catch (err) {
    swal.fire({
      icon: 'error',
      title: 'Lỗi',
      text: 'Không thể tạo cuộc thi. Vui lòng thử lại.',
    });
  } finally {
    isLoading2.value = false;
  }
}

function deleteProject(project) {
  swal.fire({
    title: 'Xác nhận xóa cuộc thi?',
    text: `Bạn có chắc chắn muốn xóa cuộc thi "${project.name}"? Hành động này không thể hoàn tác.`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Xóa cuộc thi',
    cancelButtonText: 'Hủy',
    confirmButtonColor: '#ef4444',
  }).then((result) => {
    if (result.isConfirmed) {
      data.update('projects', { id: project.id, isDisabled: 1 });
      projects.value = projects.value.filter((p) => p.id !== project.id);
      swal.fire({
        icon: 'success',
        title: 'Đã xóa!',
        text: 'Cuộc thi đã được chuyển vào thùng rác.',
        timer: 1200,
        showConfirmButton: false,
      });
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
  if (index !== -1) {
    projects.value[index] = JSON.parse(JSON.stringify(selectedProject.value));
  }
  showModalEdit.value = false;
  swal.fire({
    icon: 'success',
    title: 'Cập nhật thành công',
    timer: 1200,
    showConfirmButton: false,
  });
}
</script>

<template>
  <div class="max-w-7xl mx-auto p-4 sm:p-8 flex flex-col gap-6">
    <!-- Header bar with Title, Search & Actions -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
      <div>
        <h1 class="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Danh sách cuộc thi</h1>
        <p class="text-xs sm:text-sm text-slate-500 mt-1">Quản lý và theo dõi phản hồi cho các video truyền thông</p>
      </div>

      <div class="flex items-center gap-3">
        <!-- Search bar -->
        <div class="relative flex-1 sm:w-64">
          <input
            type="text"
            v-model="searchQuery"
            placeholder="Tìm kiếm cuộc thi..."
            class="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-slate-800 text-xs font-medium placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
          />
          <div class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <IconCirclePlay class="size-4 fill-current" />
          </div>
        </div>

        <!-- Add project button -->
        <label
          for="modal_create"
          class="cursor-pointer px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-xs sm:text-sm flex items-center gap-2 shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 transition-all active:scale-95 whitespace-nowrap"
        >
          <IconPlus class="size-4 fill-current" />
          <span>Tạo cuộc thi mới</span>
        </label>
      </div>
    </div>

    <!-- Skeleton Loading -->
    <projects-skeleton v-if="isLoading" />

    <!-- Empty State -->
    <div
      v-else-if="filteredProjects.length === 0"
      class="bg-white rounded-3xl border border-slate-200/80 p-12 text-center flex flex-col items-center justify-center max-w-lg mx-auto w-full my-8 shadow-xs"
    >
      <div class="size-16 rounded-3xl bg-blue-50 flex items-center justify-center text-blue-600 mb-4 ring-8 ring-blue-50/50">
        <IconCirclePlay class="size-8 fill-current" />
      </div>
      <h3 class="text-lg font-bold text-slate-800 mb-1">
        {{ searchQuery ? 'Không tìm thấy cuộc thi phù hợp' : 'Chưa có cuộc thi nào' }}
      </h3>
      <p class="text-xs sm:text-sm text-slate-500 max-w-sm mb-6">
        {{ searchQuery ? 'Thử tìm kiếm với từ khóa khác hoặc xóa bộ lọc' : 'Bắt đầu khởi tạo cuộc thi đầu tiên của bạn để quản lý các video và nhận phản hồi.' }}
      </p>
      <label
        for="modal_create"
        class="cursor-pointer px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-md shadow-blue-600/20 transition-all"
      >
        <IconPlus class="size-4 fill-current" />
        <span>Thêm cuộc thi ngay</span>
      </label>
    </div>

    <!-- Projects Grid -->
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      <projects-project-item
        v-for="project in filteredProjects"
        :key="project.id"
        :project="project"
        @click-delete="deleteProject"
        @click-edit="showEditProject"
      />
    </div>

    <!-- Floating Action Button (Mobile) -->
    <label
      for="modal_create"
      class="sm:hidden fixed right-5 bottom-6 size-13 rounded-full bg-blue-600 text-white shadow-xl shadow-blue-600/30 flex items-center justify-center cursor-pointer z-20 active:scale-95 transition-transform"
    >
      <IconPlus class="size-6 fill-current" />
    </label>

    <!-- Modal Create Project -->
    <input type="checkbox" id="modal_create" class="modal-toggle" v-model="showModalCreate" />
    <div class="modal modal-bottom sm:modal-middle" role="dialog">
      <div class="modal-box bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-2xl max-w-lg">
        <div class="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
          <div class="size-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <IconPlus class="size-5 fill-current" />
          </div>
          <div>
            <h3 class="text-lg font-bold text-slate-900">Thêm cuộc thi mới</h3>
            <p class="text-xs text-slate-500">Tạo không gian cuộc thi mới cho video của bạn</p>
          </div>
        </div>

        <form class="space-y-4" @submit.prevent="createProject()">
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Tên cuộc thi <span class="text-rose-500">*</span>
            </label>
            <input
              type="text"
              v-model="newProject.name"
              placeholder="VD: Cuộc thi sáng tạo Video 2026"
              class="w-full px-4 py-3 rounded-xl border border-slate-300 bg-slate-50/50 text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
              required
            />
          </div>

          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Miêu tả cuộc thi
            </label>
            <textarea
              v-model="newProject.description"
              rows="3"
              placeholder="Nhập mô tả tóm tắt nội dung cuộc thi..."
              class="w-full px-4 py-3 rounded-xl border border-slate-300 bg-slate-50/50 text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
            ></textarea>
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
              <span v-if="isLoading2">Đang xử lý...</span>
              <span v-else>Khởi tạo</span>
            </button>
          </div>
        </form>
      </div>
      <label class="modal-backdrop bg-slate-900/40 backdrop-blur-xs" for="modal_create">Thoát</label>
    </div>

    <!-- Modal Edit Project -->
    <input type="checkbox" id="modal_edit" class="modal-toggle" v-model="showModalEdit" />
    <div class="modal modal-bottom sm:modal-middle" role="dialog">
      <div class="modal-box bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-2xl max-w-lg">
        <div class="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
          <div class="size-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <IconPenToSquare class="size-5 fill-current" />
          </div>
          <div>
            <h3 class="text-lg font-bold text-slate-900">Chỉnh sửa thông tin cuộc thi</h3>
            <p class="text-xs text-slate-500">Cập nhật tên hoặc mô tả của cuộc thi</p>
          </div>
        </div>

        <form class="space-y-4" @submit.prevent="updateProject()">
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Tên cuộc thi <span class="text-rose-500">*</span>
            </label>
            <input
              type="text"
              v-model="selectedProject.name"
              class="w-full px-4 py-3 rounded-xl border border-slate-300 bg-slate-50/50 text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
              required
            />
          </div>

          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Miêu tả cuộc thi
            </label>
            <textarea
              v-model="selectedProject.description"
              rows="3"
              class="w-full px-4 py-3 rounded-xl border border-slate-300 bg-slate-50/50 text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
            ></textarea>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-[11px] font-semibold text-slate-400 mb-1">Tạo bởi</label>
              <input
                type="text"
                v-model="selectedProject.createdBy"
                class="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-100 text-slate-500 text-xs font-medium cursor-not-allowed"
                disabled
              />
            </div>
            <div>
              <label class="block text-[11px] font-semibold text-slate-400 mb-1">Ngày tạo</label>
              <input
                type="text"
                v-model="selectedProject.createdAt"
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
  </div>
</template>
