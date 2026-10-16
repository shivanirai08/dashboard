export type Catalog = {
  exam: string;
  target: string;
  subjects: string[];
};

export type MockAttempt = {
  id: string;
  name: string;
  source: string;
  type?: "full" | "custom";
  subjects?: string[];
  date: string;
  score: number;
  maxScore: number;
  accuracy?: number;
  timeMin?: number;
  weakSubjects: string[];
  notes: string;
};

export type MistakeKind = "concept" | "calculation" | "misread" | "guess" | "time";

export type Mistake = {
  id: string;
  date: string;
  subject: string;
  topic: string;
  kind: MistakeKind;
  question: string;
  fix: string;
  resolved: boolean;
};

export type Revision = {
  id: string;
  topic: string;
  subject: string;
  lastReviewed: string;
  nextDue: string;
  intervalDays: number;
  notes: string;
};

export type TodoStatus = "todo" | "doing" | "done";
export type Priority = "low" | "med" | "high";

export type TodoItem = {
  id: string;
  title: string;
  status: TodoStatus;
  priority?: Priority;
  due?: string;
  /** deadline pushed back this many times */
  extensions?: number;
  originalDue?: string;
  /** total minutes logged against this task */
  timeMin?: number;
  createdAt: string;
  doneAt?: string;
};

export type PomodoroSession = {
  id: string;
  startedAt: string;
  endedAt?: string;
  minutes: number;
  kind: "focus" | "break";
  label?: string;
  taskId?: string;
};

export type AppState = {
  mocks: MockAttempt[];
  mistakes: Mistake[];
  revisions: Revision[];
  todos: TodoItem[];
  pomodoros: PomodoroSession[];
  examDate?: string;
};
