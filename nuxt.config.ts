// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  ssr: false,
  compatibilityDate: "2024-04-03",
  devtools: { enabled: false },
  css: ["~/assets/css/main.css"],
  modules: ["@nuxtjs/tailwindcss", "@pinia/nuxt"],
  runtimeConfig: {
    geminiApiKey: process.env.GEMINI_API_KEY || process.env.NUXT_PUBLIC_GEMINI_API_KEY || "",
    public: {},
  },
  app: {
    head: {
      title: "MediaAI - Nền tảng tổ chức cuộc thi sáng tạo số tích hợp AI hỗ trợ đánh giá kỹ thuật video",
      link: [
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        { rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: "" },
        { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" },
      ],
    },
  },
});

