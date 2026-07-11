import { createSiteIcon } from "@/lib/site-icon";

export async function GET() {
  return createSiteIcon(192);
}
