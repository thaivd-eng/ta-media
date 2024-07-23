import axios from "axios";
import fetchSheet from "./fetch-sheet.js";

const SHEET_ID = "1HdA0BYnFRgM4Cm_5PMeJtK-OV6OAFrsY7ui6LAvY3VU";
const BASE_URL = "https://script.google.com/macros/s/AKfycbxjFIj4oUSBNn0c6m81pAFaATb4KYRUWAgcHArOT1CA5DOncfc5W9Db6s78-ZUyqm7F/exec";

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
  let data = JSON.stringify({ videoId, createdBy: user.userName });
  return `${BASE_URL}?action=upload&data=${encodeURIComponent(data)}`;
}

export async function createProject(data) {
  data = encodeData(data);
  let url = BASE_URL + `?action=create-project&data=${data}`;
  let res = await axios.get(url);

  return res.data;
}

export async function createVideo(data) {
  data = encodeData(data);
  let url = BASE_URL + `?action=create-video&data=${data}`;
  let res = await axios.get(url);

  return res.data;
}

export async function checkUpload(video) {
  video = encodeData(video);
  let url = BASE_URL + `?action=check-upload&data=${video}`;
  let res = await axios.get(url);

  return res.data;
}
