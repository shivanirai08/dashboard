import { useCallback } from "react";
import { useToast } from "../components/Toast";
import { useStore } from "./store";

type Key = "todos" | "mocks" | "mistakes" | "revisions";
type Row = { id: string };

/** Delete a row and offer an Undo toast that puts it back where it was. */
export function useRemove() {
  const { state, setState } = useStore();
  const toast = useToast();
  return useCallback(
    (key: Key, id: string, label: string) => {
      const list = state[key] as Row[];
      const idx = list.findIndex((x) => x.id === id);
      if (idx < 0) return;
      const item = list[idx];
      setState((s) => ({ ...s, [key]: (s[key] as Row[]).filter((x) => x.id !== id) }));
      toast(`${label} deleted`, () =>
        setState((s) => {
          const arr = [...(s[key] as Row[])];
          arr.splice(Math.min(idx, arr.length), 0, item);
          return { ...s, [key]: arr };
        }),
      );
    },
    [state, setState, toast],
  );
}
