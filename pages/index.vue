<script setup>
// import modules
import * as mockup from '@/utils/mockup-data';

// define page head + page meta
useHead({ title: 'Trang chủ' });
definePageMeta({
  title: 'Trang chủ',
  layout: 'dashboard'
});

// states
const isLoading = ref(true);
const projects = ref([]);

// on before mount do something...
onBeforeMount(() => {
  fetchData();
});

// methods
async function fetchData() {
  let res = await mockup.findProject();
  projects.value = res;
  isLoading.value = false;
}

function onTapFAB() { }
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
    <floating-action-button @click="onTapFAB" />
  </div>
</template>

<style scoped>
.projects {
  @apply p-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3;
}
</style>