<script setup>
import { formatThumbnailUrl } from '~/utils/data-service';

const props = defineProps({
  video: Object,
  canScore: {
    type: Boolean,
    default: false
  },
  canManage: {
    type: Boolean,
    default: false
  },
  layout: {
    type: String,
    default: 'grid'
  }
});

const emits = defineEmits(['clickEdit', 'clickDelete', 'clickScore', 'clickVote']);

const imgError = ref(false);
watch(() => props.video?.thumbnailUrl, () => {
  imgError.value = false;
});

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

function onClickScore() {
  emits('clickScore', props.video);
}

function onClickVote() {
  emits('clickVote', props.video);
}
</script>

<template>
  <!-- LIST LAYOUT -->
  <div
    v-if="props.layout === 'list'"
    class="group bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-lg hover:border-blue-200 transition-all duration-200 p-3 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 overflow-hidden"
  >
    <div class="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
      <!-- Thumbnail -->
      <div class="relative w-32 sm:w-48 md:w-56 aspect-video rounded-xl overflow-hidden bg-slate-100 shrink-0">
        <NuxtLink :to="'/video?id=' + props.video.id" class="w-full h-full block">
          <img
            v-if="validThumbnailUrl"
            :src="validThumbnailUrl"
            :alt="props.video.name"
            referrerpolicy="no-referrer"
            loading="lazy"
            @error="imgError = true"
            class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div v-else class="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50/50 text-center">
            <div class="size-8 sm:size-10 rounded-xl bg-blue-100/80 flex items-center justify-center text-blue-600 mb-0.5 sm:mb-1">
              <IconCirclePlay class="size-4 sm:size-5 fill-current" />
            </div>
            <span class="text-[9px] sm:text-[10px] font-semibold text-slate-400">Tác phẩm</span>
          </div>

          <!-- Play overlay on hover -->
          <div class="absolute inset-0 bg-slate-900/20 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <div class="size-8 sm:size-10 rounded-full bg-white/95 text-blue-600 shadow-md flex items-center justify-center transform scale-90 group-hover:scale-100 transition-transform">
              <IconCirclePlay class="size-4 sm:size-5 fill-current" />
            </div>
          </div>
        </NuxtLink>
      </div>

      <!-- Info & Metadata -->
      <div class="min-w-0 flex-1 flex flex-col gap-1">
        <!-- Badges row -->
        <div class="flex flex-wrap items-center gap-1.5">
          <span
            v-if="props.video.scoreCount > 0"
            class="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200/80 text-[10px] sm:text-[11px] font-bold flex items-center gap-1"
          >
            <span class="size-1.5 rounded-full bg-emerald-500"></span>
            <span>Điểm TB: {{ props.video.avgScore }}/10 ({{ props.video.scoreCount }} GK)</span>
          </span>
          <span
            v-else-if="props.video.done == 1"
            class="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200/80 text-[10px] sm:text-[11px] font-bold flex items-center gap-1"
          >
            <IconCircleCheck class="size-3 fill-current" />
            Đã duyệt
          </span>
          <span
            v-else
            class="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200/80 text-[10px] sm:text-[11px] font-semibold flex items-center gap-1"
          >
            <span class="size-1.5 rounded-full bg-amber-500 animate-ping"></span>
            Chờ chấm điểm
          </span>

          <span class="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 text-[10px] font-semibold flex items-center gap-1">
            <IconCodeBranch class="size-2.5 fill-current" />
            <span>v{{ props.video.versions ? props.video.versions.length : 1 }}</span>
          </span>
        </div>

        <!-- Video Title -->
        <NuxtLink
          :to="'/video?id=' + props.video.id"
          class="font-bold text-slate-800 text-sm sm:text-base hover:text-blue-600 transition-colors line-clamp-1 block"
        >
          {{ props.video.name }}
        </NuxtLink>

        <!-- Description preview if exists -->
        <p v-if="props.video.description" class="text-xs text-slate-500 line-clamp-1">
          {{ props.video.description }}
        </p>

        <!-- Author / Team metadata -->
        <div class="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] sm:text-xs text-slate-500">
          <div class="flex items-center gap-1 font-medium text-slate-700">
            <span>🎓</span>
            <span class="truncate max-w-[140px] sm:max-w-[200px]">{{ props.video.authorGroup || props.video.createdBy || 'Thí sinh' }}</span>
          </div>
          <div v-if="props.video.studentId" class="text-slate-400">
            MSSV: <span class="font-medium text-slate-600">{{ props.video.studentId }}</span>
          </div>
          <div v-if="props.video.className" class="text-slate-400 hidden sm:inline">
            Lớp: <span class="font-medium text-slate-600">{{ props.video.className }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Actions & Metrics (Right) -->
    <div class="flex items-center justify-end gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
      <!-- Judge Score Button -->
      <button
        v-if="props.canScore"
        @click="onClickScore"
        class="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
      >
        <span>⚖️</span>
        <span>{{ props.video.scoreCount > 0 ? 'Chấm lại' : 'Ghi điểm' }}</span>
      </button>

      <!-- Community Voting Button -->
      <button
        type="button"
        @click="onClickVote"
        :class="[
          'px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer',
          props.video.hasVoted
            ? 'bg-rose-50 text-rose-600 border border-rose-200'
            : 'bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600'
        ]"
        :title="props.video.hasVoted ? 'Bấm để hủy bình chọn' : 'Bình chọn cho tác phẩm này'"
      >
        <svg class="size-3.5 fill-current text-rose-500" viewBox="0 0 24 24">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
        </svg>
        <span>{{ props.video.voteCount || 0 }} vote</span>
      </button>

      <!-- View Video direct link -->
      <NuxtLink
        :to="'/video?id=' + props.video.id"
        class="hidden lg:inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 text-xs font-semibold transition-all"
      >
        <span>Xem bài</span>
        <svg class="size-3.5 fill-current" viewBox="0 0 24 24">
          <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
        </svg>
      </NuxtLink>

      <!-- Dropdown Menu -->
      <div class="dropdown dropdown-end shrink-0" v-if="props.canManage">
        <div tabindex="0" role="button" class="btn btn-xs btn-circle btn-ghost text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
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
              <span>Xoá bài thi</span>
            </button>
          </li>
        </ul>
      </div>
    </div>
  </div>

  <!-- GRID CARD LAYOUT (DEFAULT) -->
  <div
    v-else
    class="group bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-1 transition-all duration-300 flex flex-col overflow-hidden"
  >
    <!-- Thumbnail Container -->
    <div class="relative w-full aspect-video overflow-hidden bg-slate-100 block">
      <NuxtLink :to="'/video?id=' + props.video.id" class="w-full h-full block">
        <img
          v-if="validThumbnailUrl"
          :src="validThumbnailUrl"
          :alt="props.video.name"
          referrerpolicy="no-referrer"
          loading="lazy"
          @error="imgError = true"
          class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <!-- Fallback Placeholder -->
        <div v-else class="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50/50 p-6 text-center">
          <div class="size-12 rounded-2xl bg-blue-100/80 flex items-center justify-center text-blue-600 mb-2 transition-transform group-hover:scale-110 shadow-xs">
            <IconCirclePlay class="size-6 fill-current" />
          </div>
          <span class="text-xs font-semibold text-slate-400">Tác phẩm dự thi</span>
        </div>

        <!-- Play Overlay Pill on Hover -->
        <div class="absolute inset-0 bg-slate-900/20 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <span class="px-4 py-2 rounded-full bg-white/95 text-slate-800 text-xs font-bold shadow-lg flex items-center gap-2 transform translate-y-2 group-hover:translate-y-0 transition-transform">
            <IconCirclePlay class="size-4 fill-blue-600" />
            Xem bài thi & đánh giá
          </span>
        </div>
      </NuxtLink>

      <!-- Status Badge (Top Right) -->
      <div class="absolute top-3 right-3 z-10 pointer-events-none">
        <span
          v-if="props.video.scoreCount > 0"
          class="px-2.5 py-1 rounded-full bg-emerald-600/90 text-white text-[11px] font-bold shadow-md backdrop-blur-xs flex items-center gap-1.5"
        >
          <span class="size-1.5 rounded-full bg-emerald-200 animate-pulse"></span>
          <span>Điểm TB: {{ props.video.avgScore }}/10 ({{ props.video.scoreCount }} GK)</span>
        </span>
        <span
          v-else-if="props.video.done == 1"
          class="px-2.5 py-1 rounded-full bg-emerald-500/90 text-white text-[11px] font-bold shadow-md backdrop-blur-xs flex items-center gap-1.5"
        >
          <IconCircleCheck class="size-3.5 fill-current" />
          Đã duyệt
        </span>
        <span
          v-else
          class="px-2.5 py-1 rounded-full bg-amber-500/90 text-white text-[11px] font-medium shadow-md backdrop-blur-xs flex items-center gap-1"
        >
          <span class="size-1.5 rounded-full bg-amber-100 animate-ping"></span>
          Chờ chấm điểm
        </span>
      </div>

      <!-- Voting Pill (Top Left) -->
      <div class="absolute top-3 left-3 z-10">
        <button
          type="button"
          @click.stop="onClickVote"
          :class="[
            'px-3 py-1 rounded-full text-xs font-bold shadow-md backdrop-blur-md transition-all flex items-center gap-1.5 cursor-pointer active:scale-90',
            props.video.hasVoted
              ? 'bg-rose-500 text-white ring-2 ring-white/80'
              : 'bg-white/90 hover:bg-white text-slate-700 hover:text-rose-600'
          ]"
          :title="props.video.hasVoted ? 'Bấm để hủy bình chọn' : 'Bình chọn cho tác phẩm này'"
        >
          <svg class="size-3.5 fill-current" viewBox="0 0 24 24">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
          <span>{{ props.video.voteCount || 0 }}</span>
        </button>
      </div>
    </div>

    <!-- Info & Metrics -->
    <div class="p-4 flex flex-col gap-3 border-t border-slate-100 bg-white flex-1 justify-between">
      <div>
        <div class="flex items-start justify-between gap-2">
          <NuxtLink :to="'/video?id=' + props.video.id" class="font-bold text-slate-800 text-sm hover:text-blue-600 transition-colors line-clamp-2">
            {{ props.video.name }}
          </NuxtLink>

          <!-- Dropdown Menu -->
          <div class="dropdown dropdown-end shrink-0" v-if="props.canManage">
            <div tabindex="0" role="button" class="btn btn-xs btn-circle btn-ghost text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
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
                  <span>Xoá bài thi</span>
                </button>
              </li>
            </ul>
          </div>
        </div>

        <!-- Author / Team metadata -->
        <div class="mt-1.5 flex flex-col gap-0.5 text-xs text-slate-500">
          <div class="flex items-center gap-1.5 font-medium text-slate-700">
            <span>🎓</span>
            <span class="truncate">{{ props.video.authorGroup || props.video.createdBy || 'Thí sinh' }}</span>
          </div>
          <div v-if="props.video.studentId || props.video.className" class="text-[11px] text-slate-400 truncate pl-5">
            <span v-if="props.video.studentId">MSSV: {{ props.video.studentId }}</span>
            <span v-if="props.video.studentId && props.video.className"> • </span>
            <span v-if="props.video.className">{{ props.video.className }}</span>
          </div>
        </div>
      </div>

      <!-- Action & Metrics Bar -->
      <div class="flex items-center justify-between pt-3 border-t border-slate-100 text-xs mt-auto">
        <!-- Judge Score Button -->
        <button
          v-if="props.canScore"
          @click="onClickScore"
          class="px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <span>⚖️</span>
          <span>{{ props.video.scoreCount > 0 ? 'Chấm lại' : 'Ghi điểm' }}</span>
        </button>
        <div v-else class="flex items-center gap-1.5 text-[11px] text-slate-400">
          <IconCodeBranch class="size-3.5 fill-current" />
          <span>v{{ props.video.versions ? props.video.versions.length : 1 }}</span>
        </div>

        <!-- Community Voting button on bottom right -->
        <div class="flex items-center gap-2">
          <button
            type="button"
            @click="onClickVote"
            :class="[
              'px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer',
              props.video.hasVoted
                ? 'bg-rose-50 text-rose-600 border border-rose-200'
                : 'bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600'
            ]"
            :title="props.video.hasVoted ? 'Bấm để hủy bình chọn' : 'Bình chọn cho tác phẩm này'"
          >
            <svg class="size-3.5 fill-current text-rose-500" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
            <span>{{ props.video.voteCount || 0 }} vote</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
