import { createErpAuth } from "./erpAuth.js";

export async function loadCompanySeal(client) {
  const session = await createErpAuth(client).verifiedSession();
  if (!session || !["owner", "tax"].includes(session.role)) return "";
  const { data, error } = await client.from("erp_company_assets").select("value").eq("key", "seal").maybeSingle();
  if (error) throw new Error("公司印章读取失败");
  const image = data?.value?.dataUrl;
  if (typeof image !== "string" || image.length > 1500000 || !/^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(image)) throw new Error("公司印章尚未配置");
  return image;
}
