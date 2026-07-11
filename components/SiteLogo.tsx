import { BrandMark } from "@/components/BrandMark";

interface SiteLogoProps {
  size?: number;
  className?: string;
  variant?: "filled" | "plain";
}

export function SiteLogo({
  size = 32,
  className,
  variant = "filled",
}: SiteLogoProps) {
  return <BrandMark size={size} className={className} variant={variant} />;
}
