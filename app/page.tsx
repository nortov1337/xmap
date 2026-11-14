"use client";

import dynamic from "next/dynamic";

const EditorShell = dynamic(() => import("@/components/EditorShell"), {
  ssr: false,
  loading: () => <div className="boot">Loading map…</div>,
});

export default function Page() {
  return <EditorShell />;
}
