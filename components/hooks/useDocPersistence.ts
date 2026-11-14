import { useEffect } from "react";
import { saveDoc } from "@/lib/doc";
import { useApp } from "@/lib/store";

export function useDocPersistence() {
  const loaded = useApp((s) => s.loaded);
  const doc = useApp((s) => s.doc);

  useEffect(() => {
    if (!loaded) return;
    const timer = setTimeout(() => saveDoc(doc), 400);
    return () => clearTimeout(timer);
  }, [loaded, doc]);
}
