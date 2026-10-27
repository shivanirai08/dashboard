# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

A single user: the owner, preparing for GATE CSE. They use it throughout the day on a laptop (sometimes a phone) to plan the day, run a focus timer against tasks, log mock/test results and mistakes, and revise topics on a spaced schedule.

## Product Purpose

Personal GATE CSE preparation tracker: schedule and task board (calendar + board views of the same tasks, multi-day tasks with deadlines), focus stopwatch with session logs, mock and subject-test analysis, mistake log, spaced revision, subject notes. PYQs and custom mocks are done on GateQA; results are logged here. Success: the daily plan-study-log loop is fast and the state of preparation is clear at a glance.

## Capabilities and Constraints

- Data stored in the browser (localStorage), optional JSON-file link and optional Supabase sync. UI work must not change storage or task/schedule logic.
- Stack: React 19, Vite, Tailwind CSS 4, lucide-react, recharts, react-router. Light and dark themes exist.
- Pages: Dashboard, Schedule & Tasks, Mocks & Tests, Subject Notes, Mistake Log, Revision, Settings & Sync.
- Terminology: task, revision, mock, test, custom mock, mistake, session, deadline, overdue.

## Product Principles

- Daily flow first: planning, starting the timer and logging should take the fewest steps.
- Clarity at a glance: status (done, in progress, overdue, upcoming) is readable without opening anything.
- One task is one unit across calendar, board and logs.
- Visual look is open to redesign; behavior and data stay as they are.

## Evidence on Hand

No user research, screenshots or brand assets recorded. Visual identity (indigo "brand" palette, light/dark) exists only in code.
