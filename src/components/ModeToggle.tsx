import type { Game, Mode } from '../lib/types'
import { GAME_CONFIG } from '../lib/types'

interface Props {
  game: Game
  mode: Mode
  onModeChange: (m: Mode) => void
}

export default function ModeToggle({ game, mode, onModeChange }: Props) {
  const bonusLabel = GAME_CONFIG[game].bonusLabel
  return (
    <div className="flex gap-1 bg-gray-900 rounded-lg p-1 w-fit mx-auto">
      <button
        onClick={() => onModeChange('full')}
        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
          mode === 'full' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
        }`}
      >
        Full Pick
      </button>
      <button
        onClick={() => onModeChange('bonus')}
        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
          mode === 'bonus' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
        }`}
      >
        {bonusLabel} Only
      </button>
    </div>
  )
}
