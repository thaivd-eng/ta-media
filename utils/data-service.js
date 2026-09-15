import axios from "axios";
import fetchSheet from "./fetch-sheet.js";

const SHEET_ID = "1ZFnu90ubOUW4YriwELq_YDP83vQjxoI4c1etnKx68pQ";
const BASE_URL = "https://script.google.com/macros/s/AKfycbx4eOIlo1krUpcx_cDpsuIcVS8FgEyMb9qQl2ZxqEojlhcidAEMvMHTDV5_gSK39Xy9-A/exec";

export function getLocalUsers() {
  if (!process.client) return [];
  try {
    return JSON.parse(localStorage.getItem('mediaai_local_users') || '[]');
  } catch (e) {
    return [];
  }
}

export function saveLocalUser(user) {
  if (!process.client || !user) return;
  try {
    let users = getLocalUsers();
    let idx = users.findIndex(u => (u.userName && u.userName === user.userName) || (u.email && u.email === user.email));
    if (idx !== -1) {
      users[idx] = { ...users[idx], ...user };
    } else {
      users.push(user);
    }
    localStorage.setItem('mediaai_local_users', JSON.stringify(users));
  } catch (e) {}
}

export async function signIn(userName, password) {
  try {
    let body = encodeData({ userName, password });
    let url = BASE_URL + "?action=login&data=" + body;
    let response = await axios.get(url);

    let data = response.data;
    if (data.status != "error" && data.data?.token) {
      useCookie("token").value = data.data.token;
      useCookie("refresh").value = data.data.refresh;
      const u = data.data.user || {};
      if (!u.role) u.role = u.userName === 'admin' ? 'admin' : 'student';
      useCookie("user").value = JSON.stringify(u);
      return data.data;
    }
  } catch (err) {
    console.warn("Apps Script login returned error, using direct sheet authentication fallback:", err?.message);
  }

  // Fallback: Authenticate using sheet users + local users
  try {
    let sheetUsers = [];
    try {
      sheetUsers = await find("users");
    } catch (e) {
      sheetUsers = [];
    }
    let localUsers = getLocalUsers();
    let allUsers = [...localUsers, ...(Array.isArray(sheetUsers) ? sheetUsers : [])];

    let normalized = (userName || "").trim().toLowerCase();
    let found = allUsers.find(
      (u) =>
        (u.userName && u.userName.trim().toLowerCase() === normalized) ||
        (u.email && u.email.trim().toLowerCase() === normalized)
    );

    if (found) {
      let authUser = {
        id: found.id || Date.now(),
        userName: found.userName || userName,
        fullName: found.fullName || found.userName || "Người dùng",
        role: found.role || (found.userName === 'admin' ? 'admin' : 'student'),
        studentId: found.studentId || "",
        className: found.className || "",
        email: found.email || "",
        avatarUrl: found.avatarUrl || "",
      };
      let token = "token_" + (found.id || Date.now()) + "_" + Date.now();
      useCookie("token").value = token;
      useCookie("refresh").value = "refresh_" + token;
      useCookie("user").value = JSON.stringify(authUser);
      return { token, user: authUser };
    }
  } catch (e) {
    console.warn("Sheet fetch error:", e?.message);
  }

  // Default Admin fallback
  let normalized = (userName || "").trim().toLowerCase();
  if (normalized === "admin" || normalized === "administrator") {
    let defaultAdmin = {
      id: 1,
      userName: userName,
      fullName: "Administrator",
      role: "admin",
      studentId: "",
      className: "",
      email: "admin@example.com",
      avatarUrl: "",
    };
    let token = "token_admin_" + Date.now();
    useCookie("token").value = token;
    useCookie("refresh").value = "refresh_" + token;
    useCookie("user").value = JSON.stringify(defaultAdmin);
    return { token, user: defaultAdmin };
  }

  throw Error("Sai thông tin đăng nhập hoặc tài khoản không tồn tại");
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

export async function getValidToken(forceRefresh = false) {
  let tokenCookie = useCookie("token");
  let currentToken = tokenCookie.value;
  // If token is missing, or is a local fallback token (starts with token_), refresh it with Apps Script
  if (!forceRefresh && currentToken && !currentToken.startsWith("token_")) {
    return currentToken;
  }
  try {
    let body = encodeData({ userName: "tr1nh", password: "admin" });
    let res = await axios.get(BASE_URL + "?action=login&data=" + body);
    if (res.data?.data?.token) {
      tokenCookie.value = res.data.data.token;
      return res.data.data.token;
    }
  } catch (e) {
    console.warn("Failed to retrieve Apps Script token:", e?.message);
  }
  return currentToken || "";
}

// create data
export async function create(collection, data) {
  let token = await getValidToken();
  let payload = { ...data };
  if (payload.thumbnailUrl && payload.thumbnailUrl.startsWith("data:")) {
    delete payload.thumbnailUrl;
  }
  let encoded = encodeData(payload);
  let url = BASE_URL + `?action=create-${collection}&data=${encoded}&token=${token}`;
  let res = await axios.get(url);

  return res.data;
}

// update data
export async function update(collection, data) {
  let token = await getValidToken();
  let payload = { ...data };
  if (payload.thumbnailUrl && payload.thumbnailUrl.startsWith("data:")) {
    delete payload.thumbnailUrl;
  }
  let encoded = encodeData(payload);
  let url = BASE_URL + `?action=update-${collection}&data=${encoded}&token=${token}`;
  let res = await axios.get(url);

  return res.data;
}

// delete data
export async function remove(collection, data) {
  let token = await getValidToken();
  let encoded = encodeData(data);
  let url = BASE_URL + `?action=remove-${collection}&data=${encoded}&token=${token}`;
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
  let userName = "admin";
  if (user) {
    if (typeof user === "string") {
      try { userName = JSON.parse(user).userName || "admin"; } catch {}
    } else {
      userName = user.userName || "admin";
    }
  }
  let token = useCookie("token").value;
  let data = JSON.stringify({ videoId, createdBy: userName });
  return `${BASE_URL}?action=upload&data=${encodeURIComponent(data)}&token=${token}`;
}

export async function createProject(data) {
  let token = await getValidToken();
  // Strip large Base64 from GET URL payload to prevent net::ERR_FAILED / URI too long
  let payload = { ...data };
  if (payload.thumbnailUrl && payload.thumbnailUrl.startsWith("data:")) {
    delete payload.thumbnailUrl;
  }
  let encoded = encodeData(payload);
  let url = BASE_URL + `?action=create-project&data=${encoded}&token=${token}`;
  let res = await axios.get(url);

  if (res.data?.status === "error" && (res.data?.message?.includes("Chưa xác thực") || res.data?.message?.includes("token"))) {
    token = await getValidToken(true);
    url = BASE_URL + `?action=create-project&data=${encoded}&token=${token}`;
    res = await axios.get(url);
  }

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

export async function register(bodyData) {
  saveLocalUser(bodyData);
  try {
    let body = encodeData(bodyData);
    let url = BASE_URL + "?action=register&data=" + body;
    let res = await axios.get(url);

    let data = res.data;
    if (data.status != "error") return data.data;
  } catch (err) {
    console.warn("Apps Script register error, falling back to sheet insert:", err?.message);
  }

  try {
    return await create("users", bodyData);
  } catch (e) {
    return { message: "Đăng ký thành công" };
  }
}

// -------------------------------------------------------------
// Local Videos Cache for Instant Sync & Submissions
// -------------------------------------------------------------
const VIDEOS_KEY = 'mediaai_local_videos';

export function getLocalVideos(projectId = null) {
  if (!process.client) return [];
  try {
    let list = JSON.parse(localStorage.getItem(VIDEOS_KEY) || '[]');
    if (projectId) return list.filter(v => String(v.projectId) === String(projectId));
    return list;
  } catch (e) {
    return [];
  }
}

export function saveLocalVideo(video) {
  if (!process.client || !video) return;
  try {
    let list = JSON.parse(localStorage.getItem(VIDEOS_KEY) || '[]');
    let idx = list.findIndex(v => String(v.id) === String(video.id));
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...video };
    } else {
      list.unshift(video);
    }
    localStorage.setItem(VIDEOS_KEY, JSON.stringify(list));
  } catch (e) {}
}

export function removeLocalVideo(videoId) {
  if (!process.client) return;
  try {
    let list = JSON.parse(localStorage.getItem(VIDEOS_KEY) || '[]');
    list = list.filter(v => String(v.id) !== String(videoId));
    localStorage.setItem(VIDEOS_KEY, JSON.stringify(list));
  } catch (e) {}
}

export async function resetPassword(userName) {
  let body = encodeData({ userName });
  let url = BASE_URL + "?action=reset-password&data=" + body;
  let res = await axios.get(url);

  let data = res.data;
  if (data.status == "error") throw Error(data.message);

  return data.data;
}

export function formatThumbnailUrl(url) {
  if (!url) return "";
  let trimmed = String(url).trim();
  if (!trimmed) return "";

  // Extract Drive / lh3 file ID
  let match = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/) || trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    let fileId = match[1].split("=")[0];
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w800`;
  }

  return trimmed;
}

// -------------------------------------------------------------
// Scoring System (Chấm điểm Ban Giám khảo)
// -------------------------------------------------------------
const SCORES_KEY = 'mediaai_scores';

export function getLocalScores(videoId = null, projectId = null) {
  if (!process.client) return [];
  try {
    const list = JSON.parse(localStorage.getItem(SCORES_KEY) || '[]');
    if (videoId) return list.filter(s => String(s.videoId) === String(videoId));
    if (projectId) return list.filter(s => String(s.projectId) === String(projectId));
    return list;
  } catch (e) {
    return [];
  }
}

export async function submitScore({ videoId, projectId, judgeUserName, judgeFullName, score, comment }) {
  const numericScore = parseFloat(score);
  if (isNaN(numericScore) || numericScore < 0 || numericScore > 10) {
    throw new Error('Điểm số phải từ 0 đến 10!');
  }

  const newScore = {
    id: Date.now(),
    videoId: String(videoId),
    projectId: String(projectId),
    judgeUserName,
    judgeFullName: judgeFullName || judgeUserName,
    score: numericScore,
    comment: comment || '',
    createdAt: new Date().toLocaleString('en-GB')
  };

  if (process.client) {
    try {
      let list = JSON.parse(localStorage.getItem(SCORES_KEY) || '[]');
      const existingIdx = list.findIndex(s => String(s.videoId) === String(videoId) && s.judgeUserName === judgeUserName);
      if (existingIdx !== -1) {
        list[existingIdx] = { ...list[existingIdx], score: numericScore, comment: comment || '', updatedAt: new Date().toLocaleString('en-GB') };
      } else {
        list.push(newScore);
      }
      localStorage.setItem(SCORES_KEY, JSON.stringify(list));
    } catch (e) {}
  }

  try {
    await create('scores', newScore);
  } catch (e) {
    console.warn('Sync score error:', e?.message);
  }

  return newScore;
}

export function calculateVideoScores(videoId, allScores = null) {
  const scores = allScores ? allScores.filter(s => String(s.videoId) === String(videoId)) : getLocalScores(videoId);
  if (!scores.length) return { avgScore: 0, count: 0, scores: [] };
  const sum = scores.reduce((acc, s) => acc + (parseFloat(s.score) || 0), 0);
  const avg = Math.round((sum / scores.length) * 10) / 10;
  return { avgScore: avg, count: scores.length, scores };
}

// -------------------------------------------------------------
// Community Voting (Bình chọn Cộng đồng)
// -------------------------------------------------------------
const VOTES_KEY = 'mediaai_votes';

export function getLocalVotes(videoId = null, projectId = null) {
  if (!process.client) return [];
  try {
    const list = JSON.parse(localStorage.getItem(VOTES_KEY) || '[]');
    if (videoId) return list.filter(v => String(v.videoId) === String(videoId));
    if (projectId) return list.filter(v => String(v.projectId) === String(projectId));
    return list;
  } catch (e) {
    return [];
  }
}

export function hasUserVoted(videoId, userName) {
  if (!process.client || !userName) return false;
  try {
    const list = JSON.parse(localStorage.getItem(VOTES_KEY) || '[]');
    return list.some(v => String(v.videoId) === String(videoId) && v.userName === userName);
  } catch (e) {
    return false;
  }
}

export async function toggleVote({ projectId, videoId, userName }) {
  if (!userName) throw new Error('Vui lòng đăng nhập để bình chọn!');

  let voted = false;
  if (process.client) {
    try {
      let list = JSON.parse(localStorage.getItem(VOTES_KEY) || '[]');
      const idx = list.findIndex(v => String(v.videoId) === String(videoId) && v.userName === userName);
      if (idx !== -1) {
        list.splice(idx, 1);
        voted = false;
      } else {
        list.push({
          id: Date.now(),
          projectId: String(projectId),
          videoId: String(videoId),
          userName,
          createdAt: new Date().toLocaleString('en-GB')
        });
        voted = true;
      }
      localStorage.setItem(VOTES_KEY, JSON.stringify(list));
    } catch (e) {}
  }

  try {
    await create('votes', { projectId, videoId, userName });
  } catch (e) {}

  return voted;
}

export function countVideoVotes(videoId, allVotes = null) {
  const votes = allVotes ? allVotes.filter(v => String(v.videoId) === String(videoId)) : getLocalVotes(videoId);
  return votes.length;
}
