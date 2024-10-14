import axios from "axios";
import fetchSheet from "./fetch-sheet.js";

const SHEET_ID = "1HfJroyChryUnMnDnma7TP59Hhye5hz5SHs5mp37pY9c";
const BASE_URL = "https://script.google.com/macros/s/AKfycbyZ-EKmSoXuYTwBEmAJqEOiWefvibzackFbS2h14lkdAR98rhTIwn5wSJw0E_Xmsezhng/exec";

export async function signIn(userName, password) {
  let body = encodeData({ userName, password });
  let url = BASE_URL + "?action=login&data=" + body;
  let response = await axios.get(url);

  let data = response.data;
  if (data.status == "error") throw Error(data.message);

  useCookie("token").value = data.data.token;
  useCookie("refresh").value = data.data.refresh;
  useCookie("user").value = JSON.stringify(data.data.user);

  return data.data;
}

export async function refreshToken() {
  let refresh = useCookie("refresh").value;

  let body = encodeData({ refresh });
  let url = BASE_URL + "?action=refresh-token&data=" + body;
  let response = await axios.get(url);

  let data = response.data;
  if (data.status == "error") throw Error(data.message);

  useCookie("token").value = data.data.token;

  return data.data;
}

export async function signOut() {
  useCookie("token").value = "";
  useCookie("refresh").value = "";
  useCookie("user").value = "";

  useRouter().replace("/login");
}

/**
 * Turn JSON into string and escape special
 * character to be used in URL
 * @param json Object data
 * @returns string
 */
function encodeData(json) {
  let data = JSON.stringify(json);
  return encodeURIComponent(data);
}

/**
 * Quickly find all data of a table in Google Sheet
 * @param collection Table name in Google Sheet
 * @returns Object
 */
export async function find(collection) {
  return await fetchSheet({
    gSheetId: SHEET_ID,
    wSheetName: collection,
  });
}

// create data
export async function create(collection, data) {
  data = encodeData(data);
  let url = BASE_URL + `?action=create-${collection}&data=${data}`;
  let res = await axios.get(url);

  return res.data;
}

// update data
export async function update(collection, data) {
  data = encodeData(data);
  let url = BASE_URL + `?action=update-${collection}&data=${data}`;
  let res = await axios.get(url);

  return res.data;
}

// delete data
export async function remove(collection, data) {
  data = encodeData(data);
  let url = BASE_URL + `?action=remove-${collection}&data=${data}`;
  let res = await axios.get(url);

  return res.data;
}

/**
 * Get uploader url to upload video
 * @param videoId ID of project
 * @returns string
 */
export function getUploadUrl(videoId) {
  let user = useCookie("user").value;
  let token = useCookie("token").value;
  let data = JSON.stringify({ videoId, createdBy: user.userName });
  return `${BASE_URL}?action=upload&data=${encodeURIComponent(data)}&token=${token}`;
}

export async function createProject(data) {
  data = encodeData(data);
  let token = useCookie("token").value;
  let url = BASE_URL + `?action=create-project&data=${data}&token=${token}`;
  let res = await axios.get(url);

  return res.data;
}

export async function createVideo(data) {
  data = encodeData(data);
  let token = useCookie("token").value;
  let url = BASE_URL + `?action=create-video&data=${data}&token=${token}`;
  let res = await axios.get(url);

  return res.data;
}

export async function checkUpload(video) {
  video = encodeData(video);
  let token = useCookie("token").value;
  let url = BASE_URL + `?action=check-upload&data=${video}&token=${token}`;
  let res = await axios.get(url);

  return res.data;
}

export async function removeVersion(version) {
  version = encodeData(version);
  let token = useCookie("token").value;
  let url = BASE_URL + `?action=remove-version&data=${version}&token=${token}`;
  let res = await axios.get(url);

  return res.data;
}

export async function createFeedback(data) {
  data = encodeData(data);
  let token = useCookie("token").value;
  let url = BASE_URL + `?action=create-feedback&data=${data}&token=${token}`;
  let res = await axios.get(url);

  return res.data;
}

export async function removeFeedback(data) {
  data = encodeData(data);
  let token = useCookie("token").value;
  let url = BASE_URL + `?action=remove-feedback&data=${data}&token=${token}`;
  let res = await axios.get(url);

  return res.data;
}

export async function toggleDone (data) {
  data = encodeData(data);
  let token = useCookie("token").value;
  let url = BASE_URL + `?action=toggle-done&data=${data}&token=${token}`;
  let res = await axios.get(url);

  return res.data;
}
