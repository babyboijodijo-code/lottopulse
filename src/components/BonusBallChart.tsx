import type { Game, NumberScore } from '../lib/types'
import { GAME_CONFIG } from '../lib/types'

interface Props {
  game: Game
  scores: NumberScore[]
}

export default function BonusBallChart({ game, scores }: Props) {
  const cfg = GAME_CONFIG[game]
  // Sort by number ascending for x-axis display
  const sorted = [...scores].sort((a, b) => a.number - b.number)
  const maxApp = Math.max(...sorted.map(s => s.appearances), 1)

  return (
    <div className="bg-gray-900 rounded-xl p-4 px-4">
      <h3 className="text-sm font-semibold text-gray-300 mb-3">{cfg.bonusLabel} Frequency</h3>
      <div className="flex items-end gap-px h-24 overflow-x-auto">
        {sorted.map(s => {
          const pct = s.appearances / maxApp
          return (
            <div key={s.number} className="flex flex-col items-center gap-0.5 flex-1 min-w-[10px]">
              <div
                className={`w-full ${cfg.bonusColor} rounded-t-sm opacity-80`}
                style={{ height: `${Math.max(pct * 80, 2)}px` }}
                title={`${s.number}: ${s.appearances}×`}
              />
              <span className="text-[8px] text-gray-600 leading-none">{s.number}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
