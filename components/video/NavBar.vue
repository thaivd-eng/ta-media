<script setup>
import * as data from '~/utils/data-service';

const emits = defineEmits(['createVersion']);

const store = useVideoStore();
const video = computed(() => store.video);
const versions = computed(() => store.versions);
const currentVersion = computed(() => store.currentVersion);
const currentVersionIndex = computed(() => versions.value.findIndex(v => v.id == currentVersion.value.id));

function signOut() {
  data.signOut();
}

function goBack() {
  useRouter().back();
}

function createVersion() {
  emits('createVersion');
}

function changeVersion(version) {
  store.setCurrentVersion(version);
}

function toggleDone() {
  let newData = Object.assign({}, currentVersion.value, { status: currentVersion.value.status == 1 ? 0 : 1 });
  store.setCurrentVersion(newData);

  data.update('versions', newData);
}

</script>

<template>
  <div class="navbar bg-base-100">
    <div class="flex-1 flex items-center gap-1.5">
      <button class="btn btn-square btn-ghost" @click="goBack">
        <IconAngleLeft class="inline-block h-5 w-5 fill-current" />
      </button>

      <a class="hidden btn btn-ghost text-xl lg:flex">{{ video ? video.name : 'Video' }}</a>

      <div class="dropdown" v-if="currentVersion">
        <div tabindex="0" role="button" class="btn btn"> v{{ currentVersionIndex + 1 }}</div>
        <ul tabindex="0" class="dropdown-content menu bg-base-100 rounded-box z-[1] w-auto p-2 shadow">
          <li v-for="(version, i) in versions"><a @click="changeVersion(version)">v{{ i + 1 }}</a></li>
          <li><a @click="createVersion" class="whitespace-nowrap">Thêm phiên bản</a></li>
        </ul>
      </div>
    </div>

    <div class="flex-none">
      <div class="tooltip tooltip-bottom" data-tip="Đánh dáu hoàn thành" v-if="currentVersion">
        <button class="btn btn-ghost" @click="toggleDone">
          <icon-circle-check :class="['size-6', currentVersion.status == 1 ? 'fill-success' : 'fill-base-content/30']" />
        </button>
      </div>

      <div class="dropdown dropdown-end">
        <button tabindex="0" role="button" class="btn btn-square btn-ghost">
          <icon-ellipsis class="inline-block size-4 stroke-current" />
        </button>
        <ul tabindex="0" class="dropdown-content menu bg-base-100 rounded-box z-[1] w-52 p-2 shadow">
          <li><a>Tài khoản</a></li>
          <li><a @click="signOut">Đăng xuất</a></li>
        </ul>
      </div>
    </div>
  </div>
</template>
