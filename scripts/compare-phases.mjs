// scripts/compare-phases.mjs
// WL2f check: /phases shows the same results as the old endpoints, for every tournament.
// Mahjong moved to /phases in WL2g-1 (its old endpoint is gone); PB2 is still compared until WL2g-2.
//
//   node scripts/compare-phases.mjs                       old vs /phases on BASE_URL (default http://localhost:3100)
//   node scripts/compare-phases.mjs --against <url>       old endpoints on BASE_URL vs the same on <url>, byte for byte
//
// Each result is reduced to lines (one per standings row, one per match) and the two sides are diffed.
// Read-only: GET requests only.

const BASE_URL = process.env.BASE_URL || 'http://localhost:3100'
const againstAt = process.argv.indexOf('--against')
const AGAINST = againstAt > 0 ? process.argv[againstAt + 1] : null

const get = async (base, path) => {
  const res = await fetch(base + path)
  if (!res.ok) throw new Error(`${res.status} ${base}${path}`)
  return res.json()
}

const ids = async (game) => {
  const { ongoing = [], past = [], upcoming = [] } = await get(BASE_URL, `/api/${game}/tournaments`)
  return [...ongoing, ...past, ...upcoming].map(t => ({ id: t.id, title: t.title }))
}

// ---------- the same lines from the old and the new shape ----------

const duelOld = (m, winner) => `match ${m.id} ${m.teamA || null}:${m.scoreA} ${m.teamB || null}:${m.scoreB}${winner ? ` winner=${m.winner}` : ''}`
const statsOld = t => `row ${t.rank} ${t.name} ${t.pld}/${t.w}/${t.d}/${t.l} ${t.diff} ${t.pts}${t.qualified ? ' Q' : ''}`

const pb2Old = (league, bracket) => [
  ...league.standings.map(statsOld),
  ...league.rounds.flatMap(r => r.matches.map(m => `${r.roundName} ${duelOld(m)}`)),
  ...['upperBracket', 'lowerBracket'].flatMap(k => bracket[k].flatMap(r => r.matches.map(m => `${k} ${r.title} ${duelOld(m, true)}`)))
]

const pb2New = (phases) => {
  const league = phases.find(p => p.stage === 'league')
  const playoffs = phases.find(p => p.id === 'playoffs')
  const promoted = new Set(league?.promotedRanks ?? [])
  const duel = (m, winner) => {
    const [a, b] = m.sides
    const w = a.winner ? 'A' : b.winner ? 'B' : null
    return `match ${m.id} ${a.entrant?.name ?? null}:${a.score} ${b.entrant?.name ?? null}:${b.score}${winner ? ` winner=${w}` : ''}`
  }
  return [
    ...(league?.groups[0].standings ?? []).map(r => {
      const s = r.stats
      return `row ${r.rank} ${r.entrant.name} ${s.pld}/${s.w}/${s.d}/${s.l} ${s.diff} ${s.pts}${promoted.has(r.rank) ? ' Q' : ''}`
    }),
    ...(league?.groups[0].rounds ?? []).flatMap(r => r.matches.map(m => `${r.title} ${duel(m)}`)),
    ...(playoffs?.groups[0].sections ?? []).flatMap(s => s.rounds.flatMap(r =>
      r.matches.map(m => `${s.id}Bracket ${r.title} ${duel(m, true)}`)))
  ]
}

// ---------- per tournament ----------

const GAMES = {
  plazmaburst: {
    old: ['group-stage', 'bracket'],
    async compare(id) {
      const [league, bracket, phases] = await Promise.all(['group-stage', 'bracket', 'phases']
        .map(e => get(BASE_URL, `/api/plazmaburst/tournaments/${id}/${e}`)))
      return { a: pb2Old(league, bracket), b: pb2New(phases) }
    }
  }
}

// Old endpoints here vs there, byte for byte (proves moving the code to server/utils changed nothing)
async function compareAgainst(game, id) {
  const lines = async base => (await Promise.all(GAMES[game].old.map(async e =>
    `${e} ${JSON.stringify(await get(base, `/api/${game}/tournaments/${id}/${e}`))}`)))
  return { a: await lines(AGAINST), b: await lines(BASE_URL) }
}

const diff = (a, b) => {
  const sa = [...a].sort(), sb = [...b].sort()
  const missing = sa.filter(l => !sb.includes(l))
  const extra = sb.filter(l => !sa.includes(l))
  return { missing, extra, same: !missing.length && !extra.length && sa.length === sb.length }
}

let failed = 0, checked = 0, lines = 0
console.log(AGAINST ? `Old endpoints: ${BASE_URL} vs ${AGAINST}` : `Old vs /phases on ${BASE_URL}`)

for (const game of Object.keys(GAMES)) {
  for (const { id, title } of await ids(game)) {
    const { a, b } = AGAINST ? await compareAgainst(game, id) : await GAMES[game].compare(id)
    const { missing, extra, same } = diff(a, b)
    checked++
    lines += a.length
    if (same) continue
    failed++
    console.log(`\n✗ ${game} ${id} ${title}`)
    missing.slice(0, 5).forEach(l => console.log(`  - ${l.slice(0, 200)}`))
    extra.slice(0, 5).forEach(l => console.log(`  + ${l.slice(0, 200)}`))
  }
}

console.log(`\n${checked} tournaments, ${lines} lines compared, ${failed} different`)
process.exit(failed ? 1 : 0)
