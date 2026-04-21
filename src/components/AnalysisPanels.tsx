import type { Game, Mode, AnalysisResult, NumberScore } from '../lib/types'
import { GAME_CONFIG } from '../lib/types'

interface Props {
  game: Game
  mode: Mode
  result: AnalysisResult
}

function ScoreBar({ value }: { value: number }) {
  return (
    <div className="w-full bg-gray-800 rounded-full h-1.5">
      <div
        className="bg-purple-500 h-1.5 rounded-full"
        style={{ width: `${Math.round(value * 100)}%` }}
      />
    </div>
  )
}

function ScoreTable({ scores, label }: { scores: NumberScore[]; label: string }) {
  const top = scores.slice(0, 10)
  return (
    <div className="bg-gray-900 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-gray-300 mb-3">{label} — Top 10</h3>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-gray-500 text-left">
            <th className="pb-2 w-8">#</th>
            <th className="pb-2 w-12">Ball</th>
            <th className="pb-2">Freq</th>
            <th className="pb-2">Recent</th>
            <th className="pb-2">Gap</th>
            <th className="pb-2 text-right w-12">Score</th>
          </tr>
        </thead>
        <tbody>
          {top.map((s, i) => (
            <tr key={s.number} className="border-t border-gray-800">
              <td className="py-1.5 text-gray-500">{i + 1}</td>
              <td className="py-1.5 font-bold text-white">{s.number}</td>
              <td className="py-1.5 pr-2"><ScoreBar value={s.freqScore} /></td>
              <td className="py-1.5 pr-2"><ScoreBar value={s.recencyScore} /></td>
              <td className="py-1.5 pr-2"><ScoreBar value={s.gapScore} /></td>
              <td className="py-1.5 text-right text-purple-300">{(s.combined * 100).toFixed(0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PairsPanel({ pairs }: { pairs: AnalysisResult['topPairs'] }) {
  if (pairs.length === 0) return null
  return (
    <div className="bg-gray-900 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-gray-300 mb-3">Top Co-occurring Pairs</h3>
      <div className="flex flex-wrap gap-2">
        {pairs.slice(0, 10).map(p => (
          <span key={`${p.a}-${p.b}`} className="bg-gray-800 text-gray-300 text-xs px-2 py-1 rounded-md">
            {p.a} + {p.b} <span className="text-gray-500">({p.count}×)</span>
          </span>
        ))}
      </div>
    </div>
  )
}

export default function AnalysisPanels({ game, mode, result }: Props) {
  const cfg = GAME_CONFIG[game]

  if (mode === 'bonus') {
    return (
      <div className="flex flex-col gap-4 px-4 pb-8">
        <ScoreTable scores={result.bonusScores} label={`${cfg.bonusLabel} Scores`} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 px-4 pb-8">
      <ScoreTable scores={result.whiteScores} label="White Ball Scores" />
      <ScoreTable scores={result.bonusScores} label={`${cfg.bonusLabel} Scores`} />
      <PairsPanel pairs={result.topPairs} />
    </div>
  )
}
