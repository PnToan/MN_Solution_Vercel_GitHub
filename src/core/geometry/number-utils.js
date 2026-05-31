export function roundOneDecimal(value, fallback = 0) {
  const number = Number(value)

  if (!Number.isFinite(number)) return fallback

  return Math.round(number * 10) / 10
}

export function normalizePositiveNumber(value, fallback = 1) {
  const number = Number(value)
  if (!Number.isFinite(number) || number <= 0) return fallback
  return roundOneDecimal(number, fallback)
}

export function roundMm(value) {
  return roundOneDecimal(value, 0)
}
