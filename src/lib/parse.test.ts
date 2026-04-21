import { describe, it, expect } from 'vitest'
import { parseDrawDate, tagEra, parseCsvRow, parseApiRow, mergeAndDedup } from './parse'
import type { Draw } from './types'

describe('parseDrawDate', () => {
  it('normalises ISO datetime to YYYY-MM-DD', () => {
    expect(parseDrawDate('2024-01-03T00:00:00.000')).toBe('2024-01-03')
  })

  it('passes through plain date strings unchanged', () => {
    expect(parseDrawDate('2024-01-03')).toBe('2024-01-03')
  })
})

describe('tagEra', () => {
  it('tags powerball draw on or after 2015-10-07 as current', () => {
    expect(tagEra('powerball', '2015-10-07')).toBe('current')
    expect(tagEra('powerball', '2015-10-08')).toBe('current')
  })

  it('tags powerball draw before 2015-10-07 as legacy', () => {
    expect(tagEra('powerball', '2015-10-06')).toBe('legacy')
  })

  it('tags megamillions draw on or after 2017-10-28 as current', () => {
    expect(tagEra('megamillions', '2017-10-28')).toBe('current')
  })

  it('tags megamillions draw before 2017-10-28 as legacy', () => {
    expect(tagEra('megamillions', '2017-10-27')).toBe('legacy')
  })
})

describe('parseCsvRow', () => {
  it('parses a valid CSV row into a Draw', () => {
    const row = { draw_date: '2009-12-30', n1: '5', n2: '14', n3: '22', n4: '36', n5: '51', bonus: '18' }
    expect(parseCsvRow('powerball', row)).toEqual<Draw>({
      date: '2009-12-30',
      whites: [5, 14, 22, 36, 51],
      bonus: 18,
      game: 'powerball',
      era: 'legacy',
    })
  })

  it('sorts white balls ascending regardless of input order', () => {
    const row = { draw_date: '2009-01-01', n1: '51', n2: '5', n3: '36', n4: '14', n5: '22', bonus: '10' }
    expect(parseCsvRow('powerball', row).whites).toEqual([5, 14, 22, 36, 51])
  })
})

describe('parseApiRow', () => {
  it('parses powerball API row — bonus is 6th number in winning_numbers', () => {
    const row: Record<string, string> = {
      draw_date: '2024-01-03T00:00:00.000',
      winning_numbers: '06 18 26 46 54 12',
      multiplier: '2',
    }
    expect(parseApiRow('powerball', row)).toEqual<Draw>({
      date: '2024-01-03',
      whites: [6, 18, 26, 46, 54],
      bonus: 12,
      game: 'powerball',
      era: 'current',
    })
  })

  it('parses megamillions API row — bonus is in mega_ball field', () => {
    const row: Record<string, string> = {
      draw_date: '2024-01-02T00:00:00.000',
      winning_numbers: '05 14 32 41 62',
      mega_ball: '9',
    }
    expect(parseApiRow('megamillions', row)).toEqual<Draw>({
      date: '2024-01-02',
      whites: [5, 14, 32, 41, 62],
      bonus: 9,
      game: 'megamillions',
      era: 'current',
    })
  })
})

describe('mergeAndDedup', () => {
  it('deduplicates draws with the same date', () => {
    const shared: Draw = { date: '2010-01-01', whites: [1,2,3,4,5], bonus: 1, game: 'powerball', era: 'current' }
    const extra: Draw = { date: '2010-01-05', whites: [6,7,8,9,10], bonus: 2, game: 'powerball', era: 'current' }
    expect(mergeAndDedup([shared], [shared, extra])).toHaveLength(2)
  })

  it('sorts result by date ascending', () => {
    const a: Draw[] = [{ date: '2010-01-05', whites: [6,7,8,9,10], bonus: 2, game: 'powerball', era: 'current' }]
    const b: Draw[] = [{ date: '2010-01-01', whites: [1,2,3,4,5], bonus: 1, game: 'powerball', era: 'current' }]
    const result = mergeAndDedup(a, b)
    expect(result[0].date).toBe('2010-01-01')
    expect(result[1].date).toBe('2010-01-05')
  })
})
