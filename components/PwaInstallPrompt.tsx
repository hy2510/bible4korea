"use client";

import { useEffect, useState } from "react";
import { SiteLogo } from "@/components/SiteLogo";
import { SAFE_AREA } from "@/lib/safe-area";

const DISMISS_KEY = "bible4korea:pwa-install-dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandaloneMode() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator &&
      (navigator as Navigator & { standalone?: boolean }).standalone === true)
  );
}

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

export function PwaInstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [isIOSDevice, setIsIOSDevice] = useState(false);
  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (isStandaloneMode()) return;
    if (localStorage.getItem(DISMISS_KEY) === "1") return;

    setIsIOSDevice(isIOS());

    const showTimer = window.setTimeout(() => {
      if (isStandaloneMode()) return;
      if (localStorage.getItem(DISMISS_KEY) === "1") return;
      setVisible(true);
    }, 2500);

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
      setVisible(true);
    };

    const onAppInstalled = () => {
      setVisible(false);
      setInstallEvent(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      window.clearTimeout(showTimer);
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  };

  const handleInstall = async () => {
    if (!installEvent) return;

    await installEvent.prompt();
    const choice = await installEvent.userChoice;

    setInstallEvent(null);
    if (choice.outcome === "accepted") {
      setVisible(false);
      return;
    }

    dismiss();
  };

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-x-0 z-50 p-4 sm:inset-x-auto sm:max-w-sm sm:p-0 ${SAFE_AREA.overlayBar}`}
    >
      <div className="rounded-2xl border border-amber-200/80 bg-white p-4 shadow-xl">
        <div className="flex items-start gap-3">
          <SiteLogo size={40} className="h-10 w-10 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-stone-900">
              앱으로 설치해 보세요
            </p>
            <p className="mt-1 text-sm leading-relaxed text-stone-600">
              {isIOSDevice && !installEvent
                ? "Safari 공유 버튼을 누른 뒤 ‘홈 화면에 추가’를 선택하면 앱처럼 사용할 수 있어요."
                : "홈 화면에 추가하면 더 빠르고 편하게 성경을 읽을 수 있어요."}
            </p>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          {installEvent ? (
            <button
              type="button"
              onClick={handleInstall}
              className="flex-1 rounded-xl bg-amber-800 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-amber-900"
            >
              설치하기
            </button>
          ) : null}
          <button
            type="button"
            onClick={dismiss}
            className={`rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 ${
              installEvent ? "" : "flex-1"
            }`}
          >
            {installEvent ? "나중에" : "닫기"}
          </button>
        </div>
      </div>
    </div>
  );
}
