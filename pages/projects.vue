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
  thumbnailUrl: '',
});
const showModalCreate = ref(false);

const selectedProject = ref({
  name: '',
  description: '',
  createdBy: '',
  createdAt: '',
  thumbnailUrl: '',
  folderId: '',
});
const showModalEdit = ref(false);

const createFileInput = ref(null);
const editFileInput = ref(null);
const showUrlInputCreate = ref(false);
const showUrlInputEdit = ref(false);

// Local storage caching for instant and offline thumbnail persistence
function saveLocalThumbnail(projectId, dataUrl) {
  if (!process.client || !projectId || !dataUrl) return;
  try {
    const saved = JSON.parse(localStorage.getItem('mediaai_thumbnails') || '{}');
    saved[String(projectId)] = dataUrl;
    localStorage.setItem('mediaai_thumbnails', JSON.stringify(saved));
  } catch (e) {}
}

function getLocalThumbnail(projectId) {
  if (!process.client || !projectId) return null;
  try {
    const saved = JSON.parse(localStorage.getItem('mediaai_thumbnails') || '{}');
    return saved[String(projectId)] || null;
  } catch (e) {
    return null;
  }
}

function removeLocalThumbnail(projectId) {
  if (!process.client || !projectId) return;
  try {
    const saved = JSON.parse(localStorage.getItem('mediaai_thumbnails') || '{}');
    delete saved[String(projectId)];
    localStorage.setItem('mediaai_thumbnails', JSON.stringify(saved));
  } catch (e) {}
}

// Compress uploaded local image with Canvas to keep file lightweight (~15-30KB Data URL)
function compressImage(file, callback) {
  const reader = new FileReader();
  reader.onload = (event) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 720;
      const MAX_HEIGHT = 405;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width = Math.round((width * MAX_HEIGHT) / height);
          height = MAX_HEIGHT;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.72);
      callback(dataUrl);
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
}

function handleFileUpload(event, type) {
  const file = event.target.files?.[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    swal.fire({
      icon: 'warning',
      title: 'Tệp không hợp lệ',
      text: 'Vui lòng chọn tệp hình ảnh (JPG, PNG, WEBP,...)',
    });
    return;
  }

  compressImage(file, (dataUrl) => {
    if (type === 'create') {
      newProject.value.thumbnailUrl = dataUrl;
    } else {
      selectedProject.value.thumbnailUrl = dataUrl;
    }
  });

  event.target.value = '';
}

function triggerFileInput(type) {
  if (type === 'create') {
    createFileInput.value?.click();
  } else {
    editFileInput.value?.click();
  }
}

function clearThumbnail(type) {
  if (type === 'create') {
    newProject.value.thumbnailUrl = '';
  } else {
    selectedProject.value.thumbnailUrl = '';
  }
}

onBeforeMount(async () => {
  newProject.value.createdBy = currentUser.value.userName || 'admin';

  let _projects = await data.find('projects');
  _projects = _projects.filter((p) => p.isDisabled != 1);

  let thumbnails = await data.find('thumbnails');
  projects.value = _projects.map((p) => {
    let localThumb = getLocalThumbnail(p.id);
    if (localThumb) {
      p.thumbnailUrl = localThumb;
    } else if (!p.thumbnailUrl) {
      let thumbnail = thumbnails.find((t) => t.projectId == p.id);
      if (thumbnail) p.thumbnailUrl = thumbnail.thumbnailUrl;
    }
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
    const uploadedThumb = newProject.value.thumbnailUrl;
    let form = {
      name: newProject.value.name,
      description: newProject.value.description,
      createdBy: currentUser.value.userName || 'admin',
      thumbnailUrl: uploadedThumb?.startsWith('data:') ? '' : (uploadedThumb || ''),
    };
    let result = await data.createProject(form);
    let created = result?.data || {
      id: Date.now(),
      ...form,
      createdAt: new Date().toLocaleString('en-GB'),
      isDisabled: 0,
    };
    if (uploadedThumb) {
      created.thumbnailUrl = uploadedThumb;
      if (created.id) {
        saveLocalThumbnail(created.id, uploadedThumb);
      }
    }
    projects.value.unshift(created);

    newProject.value = {
      name: '',
      description: '',
      createdBy: '',
      thumbnailUrl: '',
    };
    showModalCreate.value = false;

    swal.fire({
      icon: 'success',
      title: 'Thành công',
      text: 'Cuộc thi và thư mục Google Drive đã được khởi tạo!',
      timer: 1800,
      showConfirmButton: false,
    });
  } catch (err) {
    console.error('Create project error:', err);
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
      removeLocalThumbnail(project.id);
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
  let localThumb = getLocalThumbnail(project.id);
  if (localThumb) {
    selectedProject.value.thumbnailUrl = localThumb;
  }
  showModalEdit.value = true;
}

function updateProject() {
  data.update('projects', selectedProject.value);
  let index = projects.value.findIndex((p) => p.id == selectedProject.value.id);
  if (index !== -1) {
    projects.value[index] = JSON.parse(JSON.stringify(selectedProject.value));
  }
  if (selectedProject.value.thumbnailUrl) {
    saveLocalThumbnail(selectedProject.value.id, selectedProject.value.thumbnailUrl);
  } else {
    removeLocalThumbnail(selectedProject.value.id);
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

        <!-- Add project button (chỉ hiển thị cho admin / judge) -->
        <label
          v-if="user?.role !== 'student'"
          for="modal_create"
          class="cursor-pointer px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-xs sm:text-sm flex items-center gap-2 shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 transition-all active:scale-95 whitespace-nowrap"
        >
          <IconPlus class="size-4 fill-current" />
          <span>Tạo cuộc thi mới</span>
        </label>
        <NuxtLink
          v-else
          to="/student"
          class="px-4 py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs sm:text-sm flex items-center gap-2 transition-all shrink-0"
        >
          <span>🎓 Cổng Sinh viên</span>
          <span>→</span>
        </NuxtLink>
      </div>
    </div>

    <!-- Student Notice Banner -->
    <div v-if="user?.role === 'student'" class="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-4 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md shadow-blue-600/15">
      <div class="flex items-center gap-3">
        <span class="text-2xl">🎓</span>
        <div>
          <h4 class="font-bold text-sm">Chào mừng sinh viên đến với Hệ thống Cuộc thi!</h4>
          <p class="text-xs text-blue-100">Chọn một cuộc thi bên dưới để nộp video dự thi hoặc quay về Cổng Sinh viên để theo dõi bài thi của bạn.</p>
        </div>
      </div>
      <NuxtLink to="/student" class="px-4 py-2 rounded-xl bg-white hover:bg-blue-50 text-blue-700 font-extrabold text-xs shadow-sm transition-all shrink-0">
        Về Cổng Sinh Viên →
      </NuxtLink>
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
              class="w-full px-4 py-3 rounded-xl border border-slate-300 bg-slate-50/50 text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
              required
            />
          </div>

          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Ảnh bìa cuộc thi <span class="text-slate-400 font-normal normal-case">(Tùy chọn)</span>
            </label>
            
            <!-- Hidden file input -->
            <input
              type="file"
              ref="createFileInput"
              accept="image/*"
              class="hidden"
              @change="handleFileUpload($event, 'create')"
            />

            <!-- Preview if image selected -->
            <div v-if="newProject.thumbnailUrl" class="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 group">
              <div class="aspect-video w-full">
                <img :src="data.formatThumbnailUrl(newProject.thumbnailUrl)" class="w-full h-full object-cover" referrerpolicy="no-referrer" />
              </div>
              <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  type="button"
                  @click="triggerFileInput('create')"
                  class="px-3 py-1.5 rounded-lg bg-white/95 hover:bg-white text-slate-800 text-xs font-semibold shadow transition-all cursor-pointer"
                >
                  Đổi ảnh khác
                </button>
                <button
                  type="button"
                  @click="clearThumbnail('create')"
                  class="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow transition-all cursor-pointer"
                >
                  Xóa ảnh
                </button>
              </div>
            </div>

            <!-- Upload zone if no image -->
            <div v-else class="flex flex-col gap-2">
              <button
                type="button"
                @click="triggerFileInput('create')"
                class="w-full py-5 border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl flex flex-col items-center justify-center gap-2 bg-slate-50/60 hover:bg-blue-50/40 transition-all cursor-pointer text-slate-600 hover:text-blue-600 group"
              >
                <div class="size-11 rounded-2xl bg-blue-50 group-hover:bg-blue-100 text-blue-600 flex items-center justify-center transition-colors">
                  <svg class="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <span class="text-xs font-semibold text-slate-700 group-hover:text-blue-600">Tải ảnh từ máy tính lên</span>
                <span class="text-[11px] text-slate-400">Hỗ trợ JPG, PNG, WEBP</span>
              </button>

              <div class="text-right">
                <button
                  type="button"
                  @click="showUrlInputCreate = !showUrlInputCreate"
                  class="text-[11px] font-semibold text-blue-600 hover:underline cursor-pointer"
                >
                  {{ showUrlInputCreate ? 'Ẩn ô dán link' : 'Hoặc dán URL ảnh trực tiếp' }}
                </button>
              </div>

              <input
                v-if="showUrlInputCreate"
                type="text"
                v-model="newProject.thumbnailUrl"
                class="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50/50 text-slate-900 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Miêu tả cuộc thi
            </label>
            <textarea
              v-model="newProject.description"
              rows="3"
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
            <p class="text-xs text-slate-500">Cập nhật tên, ảnh bìa hoặc mô tả của cuộc thi</p>
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
              Ảnh bìa cuộc thi <span class="text-slate-400 font-normal normal-case">(Tùy chọn)</span>
            </label>
            
            <!-- Hidden file input -->
            <input
              type="file"
              ref="editFileInput"
              accept="image/*"
              class="hidden"
              @change="handleFileUpload($event, 'edit')"
            />

            <!-- Preview if image selected -->
            <div v-if="selectedProject.thumbnailUrl" class="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 group">
              <div class="aspect-video w-full">
                <img :src="data.formatThumbnailUrl(selectedProject.thumbnailUrl)" class="w-full h-full object-cover" referrerpolicy="no-referrer" />
              </div>
              <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  type="button"
                  @click="triggerFileInput('edit')"
                  class="px-3 py-1.5 rounded-lg bg-white/95 hover:bg-white text-slate-800 text-xs font-semibold shadow transition-all cursor-pointer"
                >
                  Đổi ảnh khác
                </button>
                <button
                  type="button"
                  @click="clearThumbnail('edit')"
                  class="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow transition-all cursor-pointer"
                >
                  Xóa ảnh
                </button>
              </div>
            </div>

            <!-- Upload zone if no image -->
            <div v-else class="flex flex-col gap-2">
              <button
                type="button"
                @click="triggerFileInput('edit')"
                class="w-full py-5 border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl flex flex-col items-center justify-center gap-2 bg-slate-50/60 hover:bg-blue-50/40 transition-all cursor-pointer text-slate-600 hover:text-blue-600 group"
              >
                <div class="size-11 rounded-2xl bg-blue-50 group-hover:bg-blue-100 text-blue-600 flex items-center justify-center transition-colors">
                  <svg class="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <span class="text-xs font-semibold text-slate-700 group-hover:text-blue-600">Tải ảnh từ máy tính lên</span>
                <span class="text-[11px] text-slate-400">Hỗ trợ JPG, PNG, WEBP</span>
              </button>

              <div class="text-right">
                <button
                  type="button"
                  @click="showUrlInputEdit = !showUrlInputEdit"
                  class="text-[11px] font-semibold text-blue-600 hover:underline cursor-pointer"
                >
                  {{ showUrlInputEdit ? 'Ẩn ô dán link' : 'Hoặc dán URL ảnh trực tiếp' }}
                </button>
              </div>

              <input
                v-if="showUrlInputEdit"
                type="text"
                v-model="selectedProject.thumbnailUrl"
                class="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50/50 text-slate-900 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              ID Thư mục Google Drive
            </label>
            <input
              type="text"
              v-model="selectedProject.folderId"
              class="w-full px-4 py-3 rounded-xl border border-slate-300 bg-slate-50/50 text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
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
