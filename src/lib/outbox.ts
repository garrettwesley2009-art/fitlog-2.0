'use client'

import { useSyncExternalStore } from 'react'
import { startWorkoutForCurrentDay, finishWorkout } from '@/app/actions/workouts'
import { saveExerciseFeedback, type FeedbackInput } from '@/app/actions/log'

// ---------------------------------------------------------------------------
// The outbox: everything the Log page wants to save goes here first, on the phone, and is
// sent to the server in order. With bad signal nothing is lost: the queue is kept on the
// phone (even if the app is closed) and sent the next time there is a connection.
//
// A workout is referred to by its real id, or by a "local:..." key before the server has
// created it. The first time the queue runs online, the server creates (or finds) the workout
// and the key is mapped to the real id.
// ---------------------------------------------------------------------------

const KEY = 'fitlog.outbox.v1'
const MAX_ATTEMPTS = 5 // the server said no this many times: give up on that one item
const TIMEOUT_MS = 20_000 // a request slower than this counts as "no signal"
const LOGIN_MESSAGE = 'Please log in again.'

export type SetOp = {
  type: 'set'
  workout: string
  exercise: string
  setIndex: number
  weight: number
  reps: number
}
export type FeedbackOp = {
  type: 'feedback'
  workout: string
  input: Omit<FeedbackInput, 'workoutId'>
}
export type FinishOp = { type: 'finish'; workout: string }
export type NewOp = SetOp | FeedbackOp | FinishOp
export type Op = NewOp & { id: string; attempts: number }

type State = { ops: Op[]; ids: Record<string, string>; failed: number }
const EMPTY: State = { ops: [], ids: {}, failed: 0 }

let memory: State | null = null // used if the phone will not let us store anything
let needsLogin = false
let inflight: Promise<void> | null = null

function load(): State {
  try {
    const raw = window.localStorage.getItem(KEY)
    if (raw) {
      const p = JSON.parse(raw) as Partial<State>
      if (p && Array.isArray(p.ops)) {
        return { ops: p.ops as Op[], ids: p.ids ?? {}, failed: Number(p.failed) || 0 }
      }
    }
    return EMPTY
  } catch {
    return memory ?? EMPTY
  }
}

function save(state: State) {
  memory = state
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* storage unavailable: the in-memory copy still works until the page closes */
  }
  notify()
}

function mutate(fn: (s: State) => State) {
  save(fn(load()))
}

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function withTimeout<T>(p: Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), TIMEOUT_MS)
    p.then(
      (v) => {
        clearTimeout(t)
        resolve(v)
      },
      (e) => {
        clearTimeout(t)
        reject(e)
      }
    )
  })
}

// ---- Status (for the little "syncing" pill) ----
export type OutboxStatus = { pending: number; failed: number; needsLogin: boolean }
const SERVER_STATUS: OutboxStatus = { pending: 0, failed: 0, needsLogin: false }
let snapshot: OutboxStatus = SERVER_STATUS
const listeners = new Set<() => void>()

function notify() {
  const s = load()
  if (s.ops.length !== snapshot.pending || s.failed !== snapshot.failed || needsLogin !== snapshot.needsLogin) {
    snapshot = { pending: s.ops.length, failed: s.failed, needsLogin }
  }
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useOutboxStatus(): OutboxStatus {
  return useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => SERVER_STATUS
  )
}

export function refreshStatus() {
  notify()
}

export function pendingCount(): number {
  return load().ops.length
}

export function clearFailed() {
  mutate((s) => ({ ...s, failed: 0 }))
}

// ---- Adding to the queue ----
export function enqueue(op: NewOp) {
  mutate((s) => {
    let ops = s.ops
    // A newer version of the same thing replaces the older one that has not been sent yet.
    if (op.type === 'set') {
      ops = ops.filter(
        (o) =>
          !(o.type === 'set' && o.workout === op.workout && o.exercise === op.exercise && o.setIndex === op.setIndex)
      )
    } else if (op.type === 'feedback') {
      ops = ops.filter(
        (o) =>
          !(o.type === 'feedback' && o.workout === op.workout && o.input.exerciseName === op.input.exerciseName)
      )
    } else {
      ops = ops.filter((o) => !(o.type === 'finish' && o.workout === op.workout))
    }
    return { ...s, ops: [...ops, { ...op, id: newId(), attempts: 0 } as Op] }
  })
}

// What is still waiting for one workout, so the Log page can show it after a reload.
export function readPending(ref: string): { sets: SetOp[]; feedback: FeedbackOp[] } {
  const s = load()
  const mine = s.ops.filter((o) => o.workout === ref || s.ids[o.workout] === ref)
  return {
    sets: mine.filter((o): o is SetOp & { id: string; attempts: number } => o.type === 'set'),
    feedback: mine.filter((o): o is FeedbackOp & { id: string; attempts: number } => o.type === 'feedback'),
  }
}

// A fresh local key must not point at an old workout from an earlier week.
export function resetLocal(ref: string) {
  if (!ref.startsWith('local:')) return
  const s = load()
  if (s.ops.some((o) => o.workout === ref) || !(ref in s.ids)) return
  const ids = { ...s.ids }
  delete ids[ref]
  save({ ...s, ids })
}

// ---- Sending ----
function removeOp(id: string) {
  mutate((s) => ({ ...s, ops: s.ops.filter((o) => o.id !== id) }))
}

// The server answered "no". Try again a few times, then give up on that one item so it cannot block the rest.
function rejectOp(id: string) {
  mutate((s) => {
    const op = s.ops.find((o) => o.id === id)
    if (!op) return s
    if (op.attempts + 1 >= MAX_ATTEMPTS) {
      return { ...s, ops: s.ops.filter((o) => o.id !== id), failed: s.failed + 1 }
    }
    return { ...s, ops: s.ops.map((o) => (o.id === id ? { ...o, attempts: o.attempts + 1 } : o)) }
  })
}

// Returns the real workout id, 'login' if the session ended, or null if the server refused.
async function resolveWorkout(ref: string): Promise<string | 'login' | null> {
  if (!ref.startsWith('local:')) return ref
  const known = load().ids[ref]
  if (known) return known
  const res = await withTimeout(startWorkoutForCurrentDay())
  if (res.ok) {
    mutate((s) => ({ ...s, ids: { ...s.ids, [ref]: res.workoutId } }))
    return res.workoutId
  }
  return res.error === LOGIN_MESSAGE ? 'login' : null
}

async function runQueue(): Promise<void> {
  needsLogin = false
  for (;;) {
    const op = load().ops[0]
    if (!op) break

    try {
      const workoutId = await resolveWorkout(op.workout)
      if (workoutId === 'login') {
        needsLogin = true
        break
      }
      if (!workoutId) {
        rejectOp(op.id)
        continue
      }

      if (op.type === 'set') {
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
        let res: Response
        try {
          res = await fetch('/api/sets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({
              workoutId,
              exerciseName: op.exercise,
              setIndex: op.setIndex,
              weight: op.weight,
              reps: op.reps,
              rpe: null,
              notes: null,
            }),
          })
        } finally {
          clearTimeout(timer)
        }
        if (res.status === 401) {
          needsLogin = true
          break
        }
        if (res.ok) removeOp(op.id)
        else rejectOp(op.id)
      } else if (op.type === 'feedback') {
        const res = await withTimeout(saveExerciseFeedback({ ...op.input, workoutId }))
        if (res.ok) removeOp(op.id)
        else if (res.error === LOGIN_MESSAGE) {
          needsLogin = true
          break
        } else rejectOp(op.id)
      } else {
        const res = await withTimeout(finishWorkout(workoutId))
        if (res.ok) {
          removeOp(op.id)
          // This workout is finished: forget the local key so next week starts fresh.
          mutate((st) => ({
            ...st,
            ids: Object.fromEntries(Object.entries(st.ids).filter(([, v]) => v !== workoutId)),
          }))
        }
        else if (res.error === LOGIN_MESSAGE) {
          needsLogin = true
          break
        } else rejectOp(op.id)
      }
    } catch {
      // No signal (or too slow): stop here and try again later. Nothing is thrown away.
      break
    }
  }
  notify()
}

// Sends whatever is waiting. Safe to call from anywhere, any number of times: only one run happens at a time.
export function flush(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if (!inflight) {
    inflight = runQueue().finally(() => {
      inflight = null
    })
  }
  return inflight
}
