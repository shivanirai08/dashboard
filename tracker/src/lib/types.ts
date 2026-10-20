export type Catalog = {
  exam: string;
  target: string;
  subjects: string[];
};

export type MockAttempt = {
  id: string;
  name: string;
  source: string;
  /** full mock, custom mock over chosen subjects, or a short subject test (1–2 subjects) */
  type?: "full" | "custom" | "test";
  /** subject tests: the topics covered (empty when `wholeSubject`) */
  topics?: string[];
  /** subject tests: the whole subject rather than specific topics */
  wholeSubject?: boolean;
  subjects?: string[];
  date: string;
  score: number;
  maxScore: number;
  accuracy?: number;
  timeMin?: number;
  /** result counts; wrong/skipped fall back to the mistake sheet */
  correct?: number;
  wrong?: number;
  skipped?: number;
  weakSubjects: string[];
  notes: string;
};

export type MistakeKind = "concept" | "implement" | "forgot" | "silly" | "calculation" | "misread" | "guess" | "time";

export type Mistake = {
  id: string;
  date: string;
  subject: string;
  topic: string;
  kind: MistakeKind;
  question: string;
  fix: string;
  resolved: boolean;
  /** which mock this question came from */
  mockId?: string;
  /** or a named revision / practice session (a "folder") */
  session?: string;
  qno?: number;
  marks?: number;
  result?: "wrong" | "skipped";
};

/** @deprecated standalone revision topics; migrated into tasks (`TodoItem.revision`) on load */
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

export type TaskNote = {
  id: string;
  text: string;
  createdAt: string;
  updatedAt?: string;
};

export type TodoItem = {
  id: string;
  title: string;
  status: TodoStatus;
  priority?: Priority;
  /** a task can cover several subjects */
  subjects?: string[];
  /** @deprecated single subject from older saves; migrated to `subjects` on load */
  subject?: string;
  /** set on spaced-repetition tasks: each "revised" closes this task and schedules the next one further out */
  revision?: {
    /** same for every repeat of one topic */
    key: string;
    intervalDays: number;
    lastReviewed: string;
    notes?: string;
  };
  /** the day it is scheduled on; no date = "keep in todo". In progress from this day until it is done */
  planned?: string;
  /** time of day on `planned`, "HH:MM" 24h; end is start + duration */
  start?: string;
  end?: string;
  /** deadline; after this an unfinished task is overdue */
  due?: string;
  /** deadline pushed back this many times */
  extensions?: number;
  originalDue?: string;
  /** days this task was left unfinished and then moved on; each stays on its original day as a faded copy */
  missed?: { date: string; start?: string; end?: string; due?: string }[];
  /** free-form notes the user jots down against this task (separate from the edit dialog) */
  notes?: TaskNote[];
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
  subject?: string;
};

/** Old standalone planner blocks; migrated into tasks on load (see store.tsx). */
export type LegacyBlock = {
  id: string;
  date: string;
  /** "HH:MM", 24h */
  start: string;
  end: string;
  title: string;
  subject?: string;
  /** optional link to a todo; completing the block completes the task */
  todoId?: string;
  done: boolean;
};

export type AppState = {
  mocks: MockAttempt[];
  mistakes: Mistake[];
  /** @deprecated always empty; revisions are tasks now */
  revisions: Revision[];
  todos: TodoItem[];
  pomodoros: PomodoroSession[];
  /** @deprecated migrated into `todos` */
  schedule?: LegacyBlock[];
  examDate?: string;
  /** named revision sessions, so empty folders persist */
  sessions?: string[];
  /** when on, no new tasks can be put on days that have already passed (existing ones can still be edited) */
  lockPastDays?: boolean;
  /** daily focus goal in minutes */
  dailyGoalMin?: number;
};
