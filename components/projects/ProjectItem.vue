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
  <div class="rounded border w-full flex flex-col aspect-video">
    <NuxtLink :to="'/project?id=' + props.project.id" class="grow h-full flex justify-center items-center bg-base-200 overflow-hidden">
      <img :src="props.project.thumbnailUrl" alt="thumb" class="w-full h-full object-cover" v-if="props.project.thumbnailUrl">
      <div class="w-full h-full flex justify-center items-center bg-base-2" v-else>
        <IconCirclePlay class="size-8 fill-primary-content/50" />
      </div>
    </NuxtLink>

    <div class="border-t flex justify-between items-center">
      <NuxtLink :to="'/project?id=' + props.project.id" class="p-3 bg-base-100 whitespace-nowrap truncate">
        {{ props.project.name }}
      </NuxtLink>

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
