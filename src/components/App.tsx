import { useState, useEffect, useCallback } from 'react'
import pbCsv from '../data/powerball-1992-2009.csv?raw'
import mmCsv from '../data/megamillions-1996-2001.csv?raw'
import { parseCsv, parseApiRow, mergeAndDedup } from '../lib/parse'
import { saveToCache, loadFromCache, isCacheValid } from '../lib/cache'
import { analyze } from '../lib/analysis'
import type { Game, Mode, GameData, CachedAppData, AnalysisResult } from '../lib/types'
import Header from './Header'
import ModeToggle from './ModeToggle'
import SuggestedPick from './SuggestedPick'
import AnalysisPanels from './AnalysisPanels'
import BonusBallChart from './BonusBallChart'
import LoadingScreen from './LoadingScreen'
import ErrorCard from './ErrorCard'

const API_BASE = 'https://data.ny.gov/resource'
const PB_RESOURCE = 'd6yy-54nr'
const MM_RESOURCE = '5xaw-6ayf'
const LIMIT = 10000

async function fetchGameData(game: Game): Promise<GameData> {
  const resource = game === 'powerball' ? PB_RESOURCE : MM_RESOURCE
  const url = `${API_BASE}/${resource}.json?$limit=${LIMIT}&$order=draw_date+DESC`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${game} API returned ${res.status}`)
  const rows: Record<string, string>[] = await res.json()
  const apiDraws = rows.map(r => parseApiRow(game, r))

  const csvText = game === 'powerball' ? pbCsv : mmCsv
  const csvDraws = parseCsv(game, csvText)

  const draws = mergeAndDedup(csvDraws, apiDraws)
  const currentEraDraws = draws.filter(d => d.era === 'current')
  return { game, draws, currentEraDraws, fetchedAt: Date.now() }
}

type AppState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; pb: GameData; mm: GameData }

export default function App() {
  const [appState, setAppState] = useState<AppState>({ status: 'loading' })
  const [activeGame, setActiveGame] = useState<Game>('powerball')
  const [mode, setMode] = useState<Mode>('full')

  const load = useCallback(async () => {
    setAppState({ status: 'loading' })
    try {
      const cached = loadFromCache()
      if (cached && isCacheValid(cached)) {
        setAppState({ status: 'ready', pb: cached.powerball, mm: cached.megamillions })
        return
      }
      const [pb, mm] = await Promise.all([fetchGameData('powerball'), fetchGameData('megamillions')])
      const cacheData: CachedAppData = { powerball: pb, megamillions: mm, cachedAt: Date.now() }
      saveToCache(cacheData)
      setAppState({ status: 'ready', pb, mm })
    } catch (err) {
      setAppState({ status: 'error', message: err instanceof Error ? err.message : 'Unknown error' })
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleGameChange = (g: Game) => {
    setActiveGame(g)
    setMode('full')
  }

  if (appState.status === 'loading') return <LoadingScreen />
  if (appState.status === 'error') return <ErrorCard message={appState.message} onRetry={load} />

  const gameData = activeGame === 'powerball' ? appState.pb : appState.mm
  const result: AnalysisResult = analyze(gameData.currentEraDraws, activeGame)

  return (
    <div className="max-w-2xl mx-auto">
      <Header activeGame={activeGame} onGameChange={handleGameChange} />
      <div className="px-4 mb-4">
        <ModeToggle game={activeGame} mode={mode} onModeChange={setMode} />
      </div>
      <SuggestedPick game={activeGame} mode={mode} result={result} />
      <div className="px-4 mb-4">
        <BonusBallChart game={activeGame} scores={result.bonusScores} />
      </div>
      <AnalysisPanels game={activeGame} mode={mode} result={result} />
      <footer className="text-center text-xs text-gray-600 pb-6">
        {gameData.currentEraDraws.length} current-era draws analysed · data via NY Open Data
      </footer>
    </div>
  )
}
