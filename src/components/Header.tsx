import type { Game } from '../lib/types'
import { GAME_CONFIG } from '../lib/types'

interface Props {
  activeGame: Game
  onGameChange: (g: Game) => void
}

export default function Header({ activeGame, onGameChange }: Props) {
  return (
    <header className="flex flex-col items-center gap-4 py-6 px-4">
      <h1 className="text-3xl font-bold tracking-tight text-white">
        Lotto<span className="text-purple-400">Pulse</span>
      </h1>
      <div className="flex gap-2">
        {(['powerball', 'megamillions'] as Game[]).map(game => (
          <button
            key={game}
            onClick={() => onGameChange(game)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeGame === game
                ? `${GAME_CONFIG[game].tabColor} text-white`
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {GAME_CONFIG[game].label}
          </button>
        ))}
      </div>
    </header>
  )
}
