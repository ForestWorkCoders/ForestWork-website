// Tournament results in one shape for every game (WL2f).
// A tournament is a list of phases; each phase is drawn by its stage:
// standings + matches by round (league, swiss, simple) or a bracket (sections of rounds).

export type Stage = 'simple' | 'league' | 'swiss' | 'single_elim' | 'double_elim' | 'gauntlet' | 'custom_bracket'

// A player or a team
export interface Entrant {
  id?: string
  name: string
  avatar?: string | null
  short?: string | null
  colour?: string | null
}

// Which stats a standings table shows, in order. `key` is a key of Row.stats.
export interface Column {
  key: string
  label: string
}

export interface Row {
  rank: number | 'DNF'
  entrant: Entrant
  stats: Record<string, number | null>
}

// One side of a match: a team in a duel, a seat at a mahjong table
export interface Side {
  entrant: Entrant | null   // null = not decided yet (bracket slot)
  score: number | null
  points?: number           // mahjong: points after uma
  seat?: string             // mahjong: 東 南 西 北
  winner?: boolean
}

export interface Match {
  id: string
  title?: string
  time?: string | null
  status?: string | null
  url?: string | null       // mahjong: replay (paipu)
  sides: Side[]
  next?: string | null      // bracket: where the winner goes
  nextLoser?: string | null // bracket: where the loser goes
}

export interface Round {
  id: string
  title: string
  matches: Match[]
}

// A bracket lane: upper, lower, or the only one
export interface Section {
  id: string
  title: string
  rounds: Round[]
}

export interface Group {
  id: string
  title?: string
  standings?: Row[]
  rounds: Round[]
  sections?: Section[]
}

export interface Phase {
  id: string
  title: string
  subtitle?: string
  stage: Stage
  sides: number             // 2 = duel, more = FFA
  entrant: 'player' | 'team'
  final?: boolean
  columns: Column[]
  promotedRanks?: number[]
  disqualifiedRanks?: number[]
  groups: Group[]
}
