import type { Game, Mode, AnalysisResult } from '../lib/types'
import { GAME_CONFIG } from '../lib/types'

interface Props {
  game: Game
  mode: Mode
  result: AnalysisResult
}

function Ball({ num, color }: { num: number; color: string }) {
  return (
    <div className={`${color} rounded-full w-12 h-12 flex items-center justify-center font-bold text-white text-lg shadow-lg`}>
      {num}
    </div>
  )
}

export default function SuggestedPick({ game, mode, result }: Props) {
  const cfg = GAME_CONFIG[game]
  const { pick, bonusPick } = result

  if (mode === 'bonus') {
    return (
      <section className="flex flex-col items-center gap-3 py-6">
        <h2 className="text-sm font-medium text-gray-400 uppercase tracking-widest">{cfg.bonusLabel} Pick</h2>
        <Ball num={bonusPick.bonus} color={cfg.bonusColor} />
        <p className="text-xs text-gray-500">Confidence {bonusPick.confidence}%</p>
      </section>
    )
  }

  return (
    <section className="flex flex-col items-center gap-3 py-6">
      <h2 className="text-sm font-medium text-gray-400 uppercase tracking-widest">Suggested Pick</h2>
      <div className="flex flex-wrap justify-center gap-2">
        {pick.whites.map(n => (
          <Ball key={n} num={n} color="bg-gray-700" />
        ))}
        <Ball num={pick.bonus} color={cfg.bonusColor} />
      </div>
      <p className="text-xs text-gray-500">Confidence {pick.confidence}%</p>
    </section>
  )
}
