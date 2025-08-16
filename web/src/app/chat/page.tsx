// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { Suspense } from "react";

import { Logo } from "../../components/deer-flow/logo";
import { ThemeToggle } from "../../components/deer-flow/theme-toggle";
import { SettingsDialog } from "../settings/dialogs/settings-dialog";

const Main = dynamic(() => import("./main"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center">
      Loading JiuWen DeepResearch...
    </div>
  ),
});

export default function HomePage() {
  const t = useTranslations("chat.page");

  return (
    <div className="flex h-screen w-screen justify-center overscroll-none">
      <header className="fixed top-0 left-0 flex h-12 w-full items-center justify-between px-4">
        <Logo />
        <div className="flex items-center">
          <ThemeToggle />
          <Suspense>
            <SettingsDialog />
          </Suspense>
        </div>
      </header>
      <Main />
      <footer className="fixed bottom-0 left-0 flex h-6 w-full items-center justify-center px-4 text-center">
        <p className="flex text-xs opacity-50">
          JiuWen DeepResearch Web UI界面引用自DeerFlow
        </p>
      </footer>
    </div>
  );
}
