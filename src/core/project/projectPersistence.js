//=================
export function getProjectPayload(cabinetState, panels) {
  return JSON.stringify({ cabinet: cabinetState, panels }, null, 2)
} // End getProjectPayload

//=================
export function saveProjectOffline(payload, storageKey = 'MN_Solution_Project') {
  localStorage.setItem(storageKey, payload)
} // End saveProjectOffline

//=================
export function exportProjectJson(payload, filename = 'mn-solution-project.json') {
  const blob = new Blob([payload], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')

  a.href = url
  a.download = filename
  a.click()

  URL.revokeObjectURL(url)
} // End exportProjectJson
