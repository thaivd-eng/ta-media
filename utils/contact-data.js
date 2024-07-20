import fetchSheet from "~/utils/fetch-sheet.js";

const SHEET_ID = "1tzsIZ8GXCYI7HAVavgSB6eLzk8w-_MQlnUOfPs0-6Yg";

export async function findFAQ() {
  return await fetchSheet({
    gSheetId: SHEET_ID,
    wSheetName: "faq",
  });
}

export async function findContact() {
  return await fetchSheet({
    gSheetId: SHEET_ID,
    wSheetName: "contact",
  });
}

export async function findAbout() {
  return await fetchSheet({
    gSheetId: SHEET_ID,
    wSheetName: "about",
  });
}
