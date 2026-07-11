import { createSiteIcon } from "@/lib/site-icon";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default async function Icon() {
  return createSiteIcon(32);
}
