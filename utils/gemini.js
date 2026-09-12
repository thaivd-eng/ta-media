import axios from "axios";
import fetchSheet from "./fetch-sheet.js";

const SHEET_ID = "1TcqB-eEGYM9u0B7FdY7A7wi1N_GpqTuThcyvXF7iNqI";
const BASE_URL = "https://script.google.com/macros/s/AKfycbyaFAaBbOvE_c6igEOoFQnK-ZjjZR-drBPFatL5t7h4S65icU5_8GIbfOpqaO5-zfDaVA/exec";

export async function ask(data) {
  let str = JSON.stringify(data);
  let encoded = encodeURIComponent(str);
  let url = `${BASE_URL}?action=ask-gemini&data=${encoded}`;

  let res = await axios.get(url);
  let body = res.data;
  if (body.status == "error") {
    throw Error(body.message);
  }

  return body.data;
}

export async function findConversation({ fileId, userId }) {
  let rows = await fetchSheet({
    gSheetId: SHEET_ID,
    wSheetName: 'chat',
  });

  return rows.filter(row => row.videoId == fileId && row.userId == userId);
}

export async function askVeo(data) {
  let str = JSON.stringify(data);
  let encoded = encodeURIComponent(str);
  let url = `${BASE_URL}?action=ask-veo&data=${encoded}`;

  let res = await axios.get(url);
  let body = res.data;
  if (body.status == "error") {
    throw Error(body.message);
  }

  return body.data;
}

export async function askBanana(data) {
  let str = JSON.stringify(data);
  let encoded = encodeURIComponent(str);
  let url = `${BASE_URL}?action=ask-veo&data=${encoded}`;

  let res = await axios.get(url);
  let body = res.data;
  if (body.status == "error") {
    throw Error(body.message);
  }

  return body.data;
}
