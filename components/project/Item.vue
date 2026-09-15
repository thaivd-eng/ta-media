<script setup>
import { formatThumbnailUrl } from '~/utils/data-service';

const props = defineProps({
  video: Object,
});

const emits = defineEmits(['clickEdit', 'clickDelete']);

const imgError = ref(false);
const validThumbnailUrl = computed(() => {
  if (imgError.value || !props.video?.thumbnailUrl) return '';
  return formatThumbnailUrl(props.video.thumbnailUrl);
});

function onClickDelete() {
  emits('clickDelete', props.video);
}

function onClickEdit() {
  emits('clickEdit', props.video);
}
</script>

<template>
  <div class="group bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-1 transition-all duration-300 flex flex-col overflow-hidden">
    <!-- Thumbnail Container -->
    <NuxtLink :to="'/video?id=' + props.video.id" class="relative w-full aspect-video overflow-hidden bg-slate-100 block">
      <img
        v-if="validThumbnailUrl"
        :src="validThumbnailUrl"
        :alt="props.video.name"
        referrerpolicy="no-referrer"
        @error="imgError = true"
        class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
      />
      <!-- Fallback Placeholder -->
      <div v-else class="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50/50 p-6 text-center">
        <div class="size-12 rounded-2xl bg-blue-100/80 flex items-center justify-center text-blue-600 mb-2 transition-transform group-hover:scale-110 shadow-xs">
          <IconCirclePlay class="size-6 fill-current" />
        </div>
        <span class="text-xs font-semibold text-slate-400">Video</span>
      </div>

      <!-- Status Badge -->
      <div class="absolute top-3 right-3 z-10">
        <span
          v-if="props.video.done == 1"
          class="px-2.5 py-1 rounded-full bg-emerald-500/90 text-white text-[11px] font-bold shadow-md backdrop-blur-xs flex items-center gap-1.5"
        >
          <IconCircleCheck class="size-3.5 fill-current" />
          Đã duyệt
        </span>
        <span
          v-else
          class="px-2.5 py-1 rounded-full bg-slate-900/60 text-white text-[11px] font-medium shadow-md backdrop-blur-xs flex items-center gap-1"
        >
          <span class="size-1.5 rounded-full bg-amber-400 animate-ping"></span>
          Đang xem xét
        </span>
      </div>

      <!-- Play Overlay Pill on Hover -->
      <div class="absolute inset-0 bg-slate-900/20 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
        <span class="px-4 py-2 rounded-full bg-white/95 text-slate-800 text-xs font-bold shadow-lg flex items-center gap-2 transform translate-y-2 group-hover:translate-y-0 transition-transform">
          <IconCirclePlay class="size-4 fill-blue-600" />
          Xem video & phản hồi
        </span>
      </div>
    </NuxtLink>

    <!-- Info & Metrics -->
    <div class="p-4 flex flex-col gap-3 border-t border-slate-100 bg-white">
      <div class="flex items-center justify-between gap-2">
        <NuxtLink :to="'/video?id=' + props.video.id" class="font-bold text-slate-800 text-sm truncate hover:text-blue-600 transition-colors flex-1">
          {{ props.video.name }}
        </NuxtLink>

        <!-- Dropdown Menu -->
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
                <span>Xoá video</span>
              </button>
            </li>
          </ul>
        </div>
      </div>

      <!-- Stats Bar: Versions and Feedbacks -->
      <div class="flex items-center justify-between pt-2 border-t border-slate-50 text-xs">
        <div class="flex items-center gap-2">
          <!-- Versions Badge -->
          <div class="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-blue-50 text-blue-700 font-semibold text-[11px]" title="Số phiên bản">
            <IconCodeBranch class="size-3.5 fill-current" />
            <span>v{{ props.video.versions ? props.video.versions.length : 1 }}</span>
          </div>

          <!-- Feedbacks Badge -->
          <div class="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-100 text-slate-600 font-medium text-[11px]" title="Số lượng phản hồi">
            <IconCommentDots class="size-3.5 fill-current" />
            <span>{{ props.video.feedbacks || 0 }}</span>
          </div>
        </div>

        <span class="text-[11px] text-slate-400">
          {{ props.video.createdBy || 'Tác giả' }}
        </span>
      </div>
    </div>
  </div>
</template>
