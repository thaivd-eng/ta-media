import axios from "axios";

const BASE_URL = "https://script.google.com/macros/s/AKfycbxM4LsX0MfXbvGvjGIvzAoyGTwrtq0qJZhObBe_MPxoLV_7p9quGvnqsy23LG2VkTyapQ/exec";

export async function ask(data) {
  console.log('DEBUG API');

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
