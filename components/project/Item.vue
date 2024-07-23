<script setup>
const props = defineProps({
  video: Object,
});

const emits = defineEmits(['clickEdit', 'clickDelete']);

function onClickDelete() {
  emits('clickDelete', props.video);
}

function onClickEdit() {
  emits('clickEdit', props.video);
}
</script>

<template>
  <div class="rounded border w-full flex flex-col aspect-[4/3] overflow-hidden">
    <NuxtLink :to="'/video?id=' + props.video.id" class="relative grow flex justify-center items-center bg-base-200 overflow-hidden">
      <img :src="props.video.thumbnailUrl" alt="thumb" class="rounded-t w-full h-full object-cover" v-if="props.video.thumbnailUrl">
      <div class="w-full h-full flex justify-center items-center bg-base-2" v-else>
        <IconCirclePlay class="size-8 fill-primary-content/50" />
      </div>
      <IconCircleCheck class="absolute top-3 right-3 rounded-full size-5 fill-primary bg-base-100" v-if="props.video.done == 1" />
    </NuxtLink>

    <div class="border-t flex justify-between items-center">
      <NuxtLink :to="'/video?id=' + props.video.id" class="p-3 truncate whitespace-nowrap bg-base-100">
        {{ props.video.name }}
      </NuxtLink>

      <div class="ml-auto flex items-center gap-1.5 tooltip" :data-tip="'Có tổng cộng ' + props.video.versions.length + ' phiên bản'">
        <IconCodeBranch class="size-4 fill-primary-content" />
        <span>{{ props.video.versions.length }}</span>
      </div>

      <div class="p-2"></div>

      <div class="flex items-center gap-1.5 tooltip" :data-tip="'Có ' + props.video.feedbacks + ' nhận xét trong phiên bản ' + props.video.versions.length">
        <IconCommentDots class="size-4 fill-primary-content" />
        <span>{{ props.video.feedbacks }}</span>
      </div>

      <div class="dropdown dropdown-top">
        <div tabindex="0" role="button" class="btn btn-circle btn-ghost">
          <IconEllipsis  class="size-5 fill-base-content" />
        </div>
        <ul tabindex="0" class="dropdown-content menu bg-base-100 rounded-box z-[1] w-52 p-2 shadow">
          <li><a @click="onClickEdit">Chỉnh sửa</a></li>
          <li><a @click="onClickDelete">Xoá video</a></li>
        </ul>
      </div>
    </div>
  </div>
</template>
