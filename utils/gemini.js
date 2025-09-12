import axios from "axios";

const BASE_URL = "https://script.google.com/macros/s/AKfycbxfE3czBF6xSMDrKqdEs-rWnB2HY7uv4W2ZB8o10NBG2RT8PNej3n2a0pwciGw0pJ69OQ/exec";

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
