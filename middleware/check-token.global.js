export default defineNuxtRouteMiddleware(async (to) => {
  if (["forgot-password", "reset-password", "index", "register"].includes(to.name)) return;

  const token = useCookie("token").value;
  if (!token && to.path != "/login") return navigateTo("/login");
});
