// Palette constants shared with recharts (which needs raw hex, not Tailwind classes).
export const C = {
  void: '#08090D',
  base: '#0C0E13',
  surface: '#12141B',
  card: '#151822',
  raised: '#1B1F2B',
  border: '#242938',
  line: '#323848',
  gold: '#E8B86D',
  goldDim: '#8C6A3C',
  teal: '#4ECDC4',
  positive: '#3FB950',
  warning: '#E3A008',
  negative: '#F0616D',
  muted: '#636B7E',
  soft: '#9098AB',
  bright: '#C6CEDE',
  white: '#EAEFF7',
}

export const verdictColor = (v) =>
  v === 'GO' ? C.positive : v === 'NO-GO' ? C.negative : C.warning

export const scoreColor = (n) =>
  n >= 70 ? C.positive : n >= 50 ? C.gold : n >= 35 ? C.warning : C.negative

export const riskColor = (level) =>
  level === 'LOW' ? C.positive : level === 'MEDIUM' ? C.warning : C.negative

// Compact USD formatter: 12_300_000_000 -> "$12.3B"
export function fmtUSD(v) {
  if (v == null || isNaN(v)) return '—'
  const n = Number(v)
  if (n >= 1e12) return `$${(n / 1e12).toFixed(1)}T`
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`
  return `$${n.toFixed(0)}`
}

export function fmtNum(v) {
  if (v == null || isNaN(v)) return '—'
  return Number(v).toLocaleString('en-US')
}
