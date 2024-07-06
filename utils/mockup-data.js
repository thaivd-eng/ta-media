import fetchSheet from "./fetch-sheet.js";

const SHEET_ID = '1h8cmTGN-JkKsRJY-LZDAaoYSqe0afVF2M0EKzMCcA48';

export async function findProject() {
  let options = {
    gSheetId: SHEET_ID,
    wSheetName: 'projects'
  };
  let res = await fetchSheet(options);
  return res;
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