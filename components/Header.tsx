import { Suspense } from "react";
import { HeaderBrand } from "@/components/HeaderBrand";
import { HeaderNav } from "@/components/HeaderNav";
import { SiteLogo } from "@/components/SiteLogo";
import { SAFE_AREA } from "@/lib/safe-area";

export function Header() {
  return (
    <header
      className={`notranslate sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur-md ${SAFE_AREA.top}`}
    >
      <div
        className={`mx-auto flex h-14 max-w-5xl items-center justify-between ${SAFE_AREA.x}`}
      >
        <Suspense
          fallback={
            <SiteLogo
              size={32}
              variant="plain"
              className="h-8 w-8 shrink-0"
            />
          }
        >
          <HeaderBrand />
        </Suspense>
        <Suspense fallback={<div className="h-8 w-40" />}>
          <HeaderNav />
        </Suspense>
      </div>
    </header>
  );
}
