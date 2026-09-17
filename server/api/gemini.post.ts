import axios from "axios";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const config = useRuntimeConfig(event);
  
  // Retrieve API key strictly on the server side
  const apiKey =
    config.geminiApiKey ||
    process.env.GEMINI_API_KEY ||
    process.env.NUXT_PUBLIC_GEMINI_API_KEY ||
    "";

  if (!apiKey) {
    throw createError({
      statusCode: 500,
      statusMessage: "Gemini API key is not configured in server .env",
    });
  }

  const models = [
    "gemini-3.5-flash-lite",
    "gemini-3.5-flash",
    "gemini-3.1-flash-lite-preview",
    "gemini-flash-latest"
  ];

  let lastError = null;
  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await axios.post(url, body.payload, {
        headers: { "Content-Type": "application/json" },
        timeout: 25000,
      });

      if (res.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        return {
          text: res.data.candidates[0].content.parts[0].text,
        };
      }
    } catch (e) {
      lastError = e;
      console.warn(
        `[Server Gemini] Model ${model} failed:`,
        e?.response?.status,
        e?.response?.data?.error?.message || e?.message
      );
    }
  }

  throw createError({
    statusCode: 502,
    statusMessage: "All Gemini models failed",
    data: lastError?.response?.data || lastError?.message,
  });
});
