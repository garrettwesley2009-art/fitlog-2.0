import { ProgramBuilder } from '@/components/program-builder'

export default function NewProgramPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Build your own program</h1>
        <p className="mt-1 text-sm text-muted">
          Add your own days and exercises. This becomes your current program once saved.
        </p>
      </div>
      <ProgramBuilder />
    </div>
  )
}
