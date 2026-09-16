import axios from "axios";
import fetchSheet from "./fetch-sheet.js";

const SHEET_ID = "15pDDZaKB8W7uZsZZpmLlmGKvJzUR4wDbu5Ms2-RvC74";
const BASE_URL = "https://script.google.com/macros/s/AKfycbw7TqJOltlTpdakc4DVu1fDxftaymejAkj7Exp-RDnqhnFc_UcpfP67pg3KrAVnGP_x/exec";

const GEMINI_API_KEY = "AQ.Ab8RN6IDueFjOfrvsTzrs4m5_MBa02PKjsLTG73HXluXhDex8Q";

export function isTimestampSpecific(q) {
  if (!q) return false;
  // Match timestamps, specific seconds, minutes, or specific freeze-frame questions (with or without accents)
  const patterns = [
    /\b\d{1,2}:\d{2}\b/,
    /\b\d+\s*(giây|giay|phút|phut|s|sec)\b/i,
    /\b(giây|giay|phút|phut|s|sec|mốc|moc|đoạn|doan|thời điểm|thoi diem|phân cảnh|phan canh)\s*(thứ|thu\s*)?\d+/i,
    /(khung hình|khung hinh|frame|cảnh này|canh nay|đoạn này|doan nay|thời điểm này|thoi diem nay|tại đây|tai day|lúc này|luc nay|bức ảnh này|buc anh nay)/i,
    /(5s|10s|mở đầu|mo dau|kết thúc|ket thuc)\b/i
  ];
  return patterns.some(rgx => rgx.test(q));
}

export async function callGeminiDirect(question, isVeo = false, context = null) {
  const models = ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite-preview", "gemini-3.5-flash"];

  const isTimeSpecific = isTimestampSpecific(question);
  let videoContextInfo = "";

  if (context) {
    const title = context.videoTitle || "Tác phẩm dự thi sáng tạo số";
    const desc = context.videoDescription ? `- Mô tả tác phẩm: ${context.videoDescription}\n` : "";
    const timeSec = context.currentTime || 0;
    const timeStr = `${Math.floor(timeSec / 60)}:${('0' + (timeSec % 60)).slice(-2)}`;
    const durSec = context.duration || 0;
    const durStr = durSec > 0 ? `${Math.floor(durSec / 60)}:${('0' + (durSec % 60)).slice(-2)}` : "Chưa xác định";

    if (isTimeSpecific) {
      // MODE 1: Phân tích cụ thể tại mốc thời gian / giây được hỏi
      videoContextInfo = `\n\n[BỐI CẢNH PHÂN ĐOẠN / KHUNG HÌNH CỤ THỂ]:\n` +
        `- Tên tác phẩm: "${title}"\n` +
        desc +
        `- Mốc thời gian được hỏi: ${timeStr} (giây thứ ${timeSec}) trong tổng thời lượng ${durStr}.\n` +
        (context.image ? `- Khung hình đính kèm: Chính là hình ảnh thực tế trích xuất đúng tại mốc ${timeStr}.\n` : "") +
        `- YÊU CẦU TRỌNG TÂM: Người dùng đang hỏi cụ thể về thời điểm/phân đoạn này (${timeStr}). Hãy quan sát kỹ khung hình đính kèm và phân tích chi tiết vào đúng mốc thời gian này.`;
    } else {
      // MODE 2: Phân tích TOÀN BỘ VIDEO (toàn diện tác phẩm)
      videoContextInfo = `\n\n[BỐI CẢNH TOÀN DIỆN TÁC PHẨM VIDEO DỰ THI]:\n` +
        `- Tên tác phẩm: "${title}"\n` +
        desc +
        `- Tổng thời lượng tác phẩm: ${durStr}.\n` +
        (context.image ? `- Hình ảnh tham khảo: Khung hình đính kèm là một hình ảnh tiêu biểu trích xuất từ tác phẩm để bạn tham khảo chất lượng hình ảnh, màu sắc, bố cục thực tế.\n` : "") +
        `- CHỈ THỊ BẮT BUỘC VỀ PHẠM VI: Người dùng ĐANG YÊU CẦU ĐÁNH GIÁ TOÀN DIỆN TOÀN BỘ VIDEO (kịch bản, ánh sáng, góc quay, âm thanh, nhịp dựng và thông điệp tác phẩm). TUYỆT ĐỐI KHÔNG giới hạn câu trả lời trong một giây đơn lẻ hay nói "tại mốc ${timeStr}"! Hãy đưa ra đánh giá bao quát toàn bộ tác phẩm.`;
    }

    videoContextInfo += `\n- LƯU Ý HỆ THỐNG: Bạn là Trợ lý AI tích hợp của nền tảng LH MediaAI và ĐANG TRỰC TIẾP QUAN SÁT video này. TUYỆT ĐỐI KHÔNG ĐƯỢC nói "Tôi chưa có link video", "Bạn chưa gửi link" hay yêu cầu người dùng gửi link!`;
  }

  const systemPrompt = isVeo
    ? "Bạn là Trợ lý AI sáng tạo kịch bản & phân cảnh B-roll (Veo Studio) của nền tảng LH MediaAI.\n" +
      "QUY TẮC:\n" +
      "1. Không chào hỏi dài dòng, vào thẳng ý chính.\n" +
      "2. Đưa ra 2-3 phân cảnh B-roll gợi ý chi tiết (Mô tả cảnh, Góc máy, Ánh sáng, Chuyển động).\n" +
      "3. Kèm theo Prompt mẫu bằng tiếng Anh/Việt ngắn gọn.\n\n" +
      "Câu hỏi: " + question + videoContextInfo
    : "Bạn là Trợ lý AI cố vấn kỹ thuật video chuyên nghiệp của nền tảng LH MediaAI.\n" +
      "Nhiệm vụ của bạn là nhận xét, tư vấn kỹ thuật (kịch bản, âm thanh, ánh sáng, góc quay, nhịp dựng) cho học sinh cải thiện bài thi và cung cấp dữ liệu tham khảo chuyên môn cho Ban Giám khảo.\n\n" +
      "QUY TẮC PHẢN HỒI BẮT BUỘC DÀNH CHO GIÁM KHẢO & HỌC SINH (SÚC TÍCH, ĐỌC NHANH TRONG 10 GIÂY):\n" +
      "1. TUYỆT ĐỐI KHÔNG CHÀO HỎI LÊ THÊ (Không nói 'Chào bạn', 'Tôi là...', 'Dựa trên diễn biến...'). Đi thẳng vào nhận xét ngay lập tức!\n" +
      "2. Trình bày cực kỳ súc tích, trực quan theo đúng 4 phần sau:\n\n" +
      "🌟 **Điểm nổi bật:**\n" +
      "- [2-3 gạch đầu dòng ngắn gọn, khen đúng trọng tâm kỹ thuật]\n\n" +
      "⚠️ **Điểm cần cải thiện:**\n" +
      "- [2-3 gạch đầu dòng ngắn gọn, chỉ rõ vấn đề cần sửa]\n\n" +
      "💡 **Giải pháp khắc phục nhanh:**\n" +
      "- [2-3 bước hành động cụ thể cho học sinh & tiêu chí cho giám khảo]\n\n" +
      "🎯 **Đánh giá tham khảo:** [X.X/10] - [1 câu nhận xét tổng quan ngắn gọn]\n\n" +
      "3. Văn phong khách quan, sắc bén, chuyên môn dựng phim nhưng dễ hiểu cho học sinh.\n\n" +
      "Câu hỏi từ người dùng: " + question + videoContextInfo;

  const parts = [{ text: systemPrompt }];

  if (context && context.image) {
    parts.push({
      inline_data: {
        mime_type: "image/jpeg",
        data: context.image
      }
    });
  }

  const payload = {
    contents: [{ parts }]
  };

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
      const res = await axios.post(url, payload, { headers: { "Content-Type": "application/json" }, timeout: 20000 });
      if (res.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        return res.data.candidates[0].content.parts[0].text;
      }
    } catch (e) {
      console.warn(`Model ${model} failed, trying next:`, e?.message);
    }
  }

  return "Xin lỗi, hiện tại hệ thống AI đang có lượng truy cập lớn. Bạn vui lòng thử lại sau giây lát nhé!";
}

export async function ask(data) {
  let resultText = "";

  // If image frame is attached, call Gemini Multimodal Vision immediately for instant analysis (1-2s)
  if (data.image) {
    try {
      const { image, ...textData } = data;
      let str = JSON.stringify(textData);
      let encoded = encodeURIComponent(str);
      let url = `${BASE_URL}?action=ask-gemini&data=${encoded}`;
      axios.get(url, { timeout: 10000 }).catch(() => {});
    } catch (e) {}

    resultText = await callGeminiDirect(data.question, false, data);
    return {
      text: resultText,
      role: "model",
      type: "chat"
    };
  }

  // Text-only prompt flow: try Apps Script, fallback to Gemini Direct if busy
  let errorEncountered = false;
  try {
    let str = JSON.stringify(data);
    let encoded = encodeURIComponent(str);
    let url = `${BASE_URL}?action=ask-gemini&data=${encoded}`;

    let res = await axios.get(url, { timeout: 8000 });
    let body = res.data;
    if (body.status === "error") {
      errorEncountered = true;
    } else if (body.data?.text) {
      const txt = body.data.text;
      if (
        txt.includes("high demand") ||
        txt.includes("chưa thể phân tích") ||
        txt.includes("Spikes in demand") ||
        txt.includes("chưa đính kèm hoặc cung cấp") ||
        txt.includes("chưa có link") ||
        txt.includes("chưa có gắn link") ||
        txt.includes("gửi link")
      ) {
        errorEncountered = true;
      } else {
        resultText = txt;
      }
    }
  } catch (err) {
    console.warn("Apps Script call failed or timed out:", err?.message);
    errorEncountered = true;
  }

  if (errorEncountered || !resultText) {
    resultText = await callGeminiDirect(data.question, false, data);
  }

  return {
    text: resultText,
    role: "model",
    type: "chat"
  };
}

export async function findConversation({ fileId, userId }) {
  let rows = await fetchSheet({
    gSheetId: SHEET_ID,
    wSheetName: 'chat',
  });

  return rows.filter(row => row.videoId == fileId && row.userId == userId);
}

export async function askVeo(data) {
  let resultText = "";

  if (data.image) {
    try {
      const { image, ...textData } = data;
      let str = JSON.stringify(textData);
      let encoded = encodeURIComponent(str);
      let url = `${BASE_URL}?action=ask-veo&data=${encoded}`;
      axios.get(url, { timeout: 10000 }).catch(() => {});
    } catch (e) {}

    resultText = await callGeminiDirect(data.question, true, data);
    return {
      text: resultText,
      role: "model",
      type: "chat"
    };
  }

  let errorEncountered = false;
  try {
    let str = JSON.stringify(data);
    let encoded = encodeURIComponent(str);
    let url = `${BASE_URL}?action=ask-veo&data=${encoded}`;

    let res = await axios.get(url, { timeout: 8000 });
    let body = res.data;
    if (body.status === "error") {
      errorEncountered = true;
    } else if (body.data?.text) {
      const txt = body.data.text;
      if (
        txt.includes("high demand") ||
        txt.includes("chưa thể phân tích") ||
        txt.includes("Spikes in demand") ||
        txt.includes("chưa đính kèm hoặc cung cấp") ||
        txt.includes("chưa có link") ||
        txt.includes("chưa có gắn link") ||
        txt.includes("gửi link")
      ) {
        errorEncountered = true;
      } else {
        resultText = txt;
      }
    }
  } catch (err) {
    console.warn("Apps Script call failed or timed out:", err?.message);
    errorEncountered = true;
  }

  if (errorEncountered || !resultText) {
    resultText = await callGeminiDirect(data.question, true, data);
  }

  return {
    text: resultText,
    role: "model",
    type: "chat"
  };
}

export async function askBanana(data) {
  return askVeo(data);
}
