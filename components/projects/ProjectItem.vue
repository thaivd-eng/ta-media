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
  <div class="rounded border w-full flex flex-col aspect-[4/3] overflow-hidden">
    <NuxtLink :to="'/project?id=' + props.project.id" class="grow flex justify-center items-center bg-base-200 overflow-hidden">
      <img :src="props.project.thumbnailUrl" alt="thumb" class="w-full h-full object-cover" v-if="props.project.thumbnailUrl">
      <div class="w-full h-full flex justify-center items-center bg-base-2" v-else>
        <IconCirclePlay class="size-8 fill-primary-content/50" />
      </div>
    </NuxtLink>

    <div class="border-t flex justify-between items-center">
      <NuxtLink :to="'/project?id=' + props.project.id" class="p-3 bg-base-100 whitespace-nowrap truncate">
        {{ props.project.name }}
      </NuxtLink>
      <button class="ml-auto btn btn-circle btn-sm btn-ghost" @click="onClickEdit">
        <IconPenToSquare class="size-4 fill-info" />
      </button>
      <button class="btn btn-circle btn-sm btn-ghost" @click="onClickDelete">
        <IconTrash class="size-4 fill-error" />
      </button>
    </div>
  </div>
</template>
