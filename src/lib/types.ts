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
// total_weeks is optional (4-12); it defaults to 8 when missing.
export type ProgramDraft = {
  name: string
  total_weeks?: number
  days: ProgramDay[]
}
