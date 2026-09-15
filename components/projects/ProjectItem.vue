<script setup>
const props = defineProps({
  project: Object,
});

const emits = defineEmits(['clickEdit', 'clickDelete']);

function onClickDelete() {
  emits('clickDelete', props.project);
}

function onClickEdit() {
  emits('clickEdit', props.project);
}
</script>

<template>
  <div class="group bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-1 transition-all duration-300 flex flex-col overflow-hidden">
    <!-- Thumbnail Container -->
    <NuxtLink :to="'/project?id=' + props.project.id" class="relative w-full aspect-video overflow-hidden bg-slate-100 block">
      <img
        v-if="props.project.thumbnailUrl"
        :src="props.project.thumbnailUrl"
        :alt="props.project.name"
        class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
      />
      <!-- Fallback Placeholder -->
      <div v-else class="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50/50 p-6 text-center">
        <div class="size-12 rounded-2xl bg-blue-100/80 flex items-center justify-center text-blue-600 mb-2 transition-transform group-hover:scale-110 shadow-xs">
          <IconCirclePlay class="size-6 fill-current" />
        </div>
        <span class="text-xs font-semibold text-slate-400">Cuộc thi video</span>
      </div>

      <!-- Play Overlay Pill on Hover -->
      <div class="absolute inset-0 bg-slate-900/20 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
        <span class="px-4 py-2 rounded-full bg-white/95 text-slate-800 text-xs font-bold shadow-lg flex items-center gap-2 transform translate-y-2 group-hover:translate-y-0 transition-transform">
          <IconCirclePlay class="size-4 fill-blue-600" />
          Mở cuộc thi
        </span>
      </div>
    </NuxtLink>

    <!-- Project Info & Actions -->
    <div class="p-4 flex items-center justify-between gap-3 border-t border-slate-100 bg-white">
      <NuxtLink :to="'/project?id=' + props.project.id" class="flex-1 min-w-0 group/link">
        <h3 class="font-bold text-slate-800 text-base truncate group-hover/link:text-blue-600 transition-colors">
          {{ props.project.name }}
        </h3>
        <p v-if="props.project.description" class="text-xs text-slate-400 truncate mt-0.5">
          {{ props.project.description }}
        </p>
        <p v-else class="text-[11px] text-slate-400 mt-0.5">
          Tạo bởi: <span class="font-medium text-slate-600">{{ props.project.createdBy || 'Quản trị' }}</span>
        </p>
      </NuxtLink>

      <!-- Action Dropdown -->
      <div class="dropdown dropdown-end">
        <div tabindex="0" role="button" class="btn btn-sm btn-circle btn-ghost text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
          <IconEllipsis class="size-4 fill-current" />
        </div>
        <ul tabindex="0" class="dropdown-content menu bg-white rounded-2xl z-20 w-44 p-2 shadow-xl shadow-slate-900/10 border border-slate-200/80">
          <li>
            <button @click="onClickEdit" class="flex items-center gap-2 py-2 px-3 rounded-xl text-slate-700 hover:bg-blue-50 hover:text-blue-600 text-xs font-medium">
              <IconPenToSquare class="size-3.5 fill-current" />
              <span>Chỉnh sửa</span>
            </button>
          </li>
          <li>
            <button @click="onClickDelete" class="flex items-center gap-2 py-2 px-3 rounded-xl text-rose-600 hover:bg-rose-50 text-xs font-medium">
              <IconTrash class="size-3.5 fill-current" />
              <span>Xoá cuộc thi</span>
            </button>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
