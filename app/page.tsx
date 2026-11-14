"use client";

import dynamic from "next/dynamic";

const EditorShell = dynamic(() => import("@/components/EditorShell"), {
  ssr: false,
  loading: () => <div className="boot">Загрузка карты…</div>,
});

export default function Page() {
  return <EditorShell />;
}
