'use client'

import type { RevisionPriorityBlock } from '@/lib/types'

interface ManageViewProps {
  revisionBlocks: RevisionPriorityBlock[]
}

export function ManageView({ revisionBlocks }: ManageViewProps) {
  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 px-4 py-8">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wider text-[#E0532C]">Répertoire</p>
        <h1 className="font-serif text-2xl font-semibold text-foreground">Gérer</h1>
        <p className="text-sm text-muted-foreground">Arbre des ouvertures par priorité</p>
      </header>

      {revisionBlocks.length === 0 ? (
        <p className="rounded-xl border border-white/6 bg-card px-4 py-8 text-center text-sm text-muted-foreground">
          Aucune ouverture importée. Collez vos fichiers dans Réglages.
        </p>
      ) : (
        <div className="space-y-4">
          {revisionBlocks.map((block) => (
            <section key={block.priority} className="rounded-xl border border-white/6 bg-card p-4">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-[#E0532C]">{block.priority}</h2>
              <ul className="mt-3 space-y-3">
                {block.studies.map((study) => (
                  <li key={study.name}>
                    <p className="text-sm font-medium text-foreground">{study.name}</p>
                    <ul className="mt-1 space-y-0.5 pl-3 font-mono text-xs text-muted-foreground">
                      {study.chapters.map((chapter) => (
                        <li key={chapter}>{chapter}</li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
