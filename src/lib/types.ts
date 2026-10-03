export type ProgramExercise = {
  exercise_name: string
  order_index: number
  target_sets: number | null
  target_reps: string | null
  notes: string | null
}

export type ProgramDay = {
  day_label: string
  order_index: number
  exercises: ProgramExercise[]
}

// The shape the AI assistant proposes when asked to create or customize a
// program. Kept simple and flat on purpose -- easy for the model to produce
// reliably, easy to render, easy to insert into user_program_days / exercises.
export type ProgramDraft = {
  name: string
  days: ProgramDay[]
}
