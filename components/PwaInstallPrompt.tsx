"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { SiteLogo } from "@/components/SiteLogo";
import { SAFE_AREA } from "@/lib/safe-area";

const DISMISS_KEY = "bible4korea:pwa-install-dismissed:v2";

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

function isSamsungInternet() {
  return /SamsungBrowser/i.test(navigator.userAgent);
}

type InstallEnvironment = "checking" | "ios" | "samsung" | "other";

function subscribeToInstallEnvironment() {
  return () => {};
}

function getInstallEnvironmentSnapshot(): InstallEnvironment {
  if (isSamsungInternet()) return "samsung";
  if (isIOS()) return "ios";
  return "other";
}

function getServerInstallEnvironmentSnapshot(): InstallEnvironment {
  return "checking";
}

function openCurrentPageInChrome() {
  const currentUrl = new URL(window.location.href);
  const scheme = currentUrl.protocol.slice(0, -1);
  const target = `${currentUrl.host}${currentUrl.pathname}${currentUrl.search}`;
  const fallbackUrl = encodeURIComponent(currentUrl.href);

  window.location.href =
    `intent://${target}#Intent;scheme=${scheme};` +
    `package=com.android.chrome;S.browser_fallback_url=${fallbackUrl};end`;
}

export function PwaInstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const installEnvironment = useSyncExternalStore(
    subscribeToInstallEnvironment,
    getInstallEnvironmentSnapshot,
    getServerInstallEnvironmentSnapshot,
  );
  const isIOSDevice = installEnvironment === "ios";
  const requiresChromeInstall = installEnvironment === "samsung";

  useEffect(() => {
    if (isStandaloneMode()) return;
    if (localStorage.getItem(DISMISS_KEY) === "1") return;

    const showTimer = window.setTimeout(() => {
      if (isStandaloneMode()) return;
      if (localStorage.getItem(DISMISS_KEY) === "1") return;
      setVisible(true);
    }, 2500);

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      if (requiresChromeInstall) {
        setInstallEvent(null);
        setVisible(true);
        return;
      }
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
  }, [requiresChromeInstall]);

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
              {requiresChromeInstall
                ? "Samsung Internet에서는 Play Protect가 설치를 차단할 수 있어요. Chrome으로 연 뒤 앱을 설치해 주세요."
                : isIOSDevice && !installEvent
                ? "Safari 공유 버튼을 누른 뒤 ‘홈 화면에 추가’를 선택하면 앱처럼 사용할 수 있어요."
                : "홈 화면에 추가하면 더 빠르고 편하게 성경을 읽을 수 있어요."}
            </p>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          {requiresChromeInstall ? (
            <button
              type="button"
              onClick={openCurrentPageInChrome}
              className="flex-1 cursor-pointer rounded-xl bg-amber-800 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-amber-900"
            >
              Chrome에서 열기
            </button>
          ) : installEvent ? (
            <button
              type="button"
              onClick={handleInstall}
              className="flex-1 cursor-pointer rounded-xl bg-amber-800 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-amber-900"
            >
              설치하기
            </button>
          ) : null}
          <button
            type="button"
            onClick={dismiss}
            className={`cursor-pointer rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 ${
              installEvent || requiresChromeInstall ? "" : "flex-1"
            }`}
          >
            {installEvent || requiresChromeInstall ? "나중에" : "닫기"}
          </button>
        </div>
      </div>
    </div>
  );
}
