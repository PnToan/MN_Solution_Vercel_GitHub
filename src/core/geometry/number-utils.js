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

//=================
export function clampValue(value, min, max) {
  return Math.max(min, Math.min(max, value))
} // End clampValue

//=================
export function getDistance(a, b) {
  const dx = Number(a?.x || 0) - Number(b?.x || 0)
  const dy = Number(a?.y || 0) - Number(b?.y || 0)

  return Math.hypot(dx, dy)
} // End getDistance
