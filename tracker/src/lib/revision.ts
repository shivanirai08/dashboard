import type { TodoItem } from "./types";

/** spaced repetition: each successful review pushes the next one further out */
export const nextInterval = (d: number) => (d < 1 ? 1 : d < 3 ? 3 : d < 7 ? 7 : d < 14 ? 14 : d < 30 ? 30 : 60);

export const isRevision = (t: TodoItem) => !!t.revision;
