import axios from "axios";
import fetchSheet from "./fetch-sheet.js";

const SHEET_ID = "1h8cmTGN-JkKsRJY-LZDAaoYSqe0afVF2M0EKzMCcA48";
const BASE_URL = "https://script.google.com/macros/s/AKfycbx0vb4GCtsms5GifVCxOrk4gZakix7zJB2j3QVZy6sb64pCXzD-5Lbo-mzB7g8xNQbd/exec";

export async function findProject() {
  let options = {
    gSheetId: SHEET_ID,
    wSheetName: 'projects'
  };
  let res = await fetchSheet(options);
  return res;
}

function encodeData(json) {
  let data = JSON.stringify(json);
  return encodeURIComponent(data);
}

export async function createProject(data) {
  data = encodeData(data);
  let url = BASE_URL + "?action=createProject&data=" + data;
  let res = await axios.get(url);

  return res.data;
}

export async function updateProject(data) {
  data = encodeData(data);
  let url = BASE_URL + "?action=updateProject&data=" + data;
  let res = await axios.get(url);

  return res.data;
}

export async function deleteProject(data) {
  data = encodeData(data);
  let url = BASE_URL + "?action=deleteProject&data=" + data;
  let res = await axios.get(url);

  return res.data;
}

export async function findVideo() {
  let options = {
    gSheetId: SHEET_ID,
    wSheetName: 'videos'
  };
  let res = await fetchSheet(options);
  return res;
}

export async function findCommentByVideo(videoId) {
  let options = {
    gSheetId: SHEET_ID,
    wSheetName: 'comments'
  };
  let comments = await fetchSheet(options);
  return comments.filter((comment) => comment.videoId == videoId);
}

export async function createComment(data) {
  data = encodeData(data);
  let url = BASE_URL + "?action=createComment&data=" + data;
  let res = await axios.get(url);

  return res.data;
}

export async function deleteComment(data) {
  data = encodeData(data);
  let url = BASE_URL + "?action=deleteComment&data=" + data;
  let res = await axios.get(url);

  return res.data;
}

export async function findUser() {
  let options = {
    gSheetId: SHEET_ID,
    wSheetName: 'users'
  };
  let res = await fetchSheet(options);
  return res;
}
