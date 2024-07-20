<script setup>
import * as data from "~/utils/data-service";
useHead({ title: "Kiểm tra" });

onBeforeMount(async () => {
  let router = useRouter();
  let token = useCookie("token");

  if (!token.value) return router.replace("/login");

  data
    .refreshToken(token.value)
    .then(res => router.replace("/projects"))
    .catch(() => router.replace("/login"))
});
</script>

<template>
  <div class="p-6 w-full min-h-screen flex justify-center items-center gap-3">
    <span class="loading loading-ring loading-sm"></span>
    <p>Đang kiểm tra...</p>
  </div>
</template>
