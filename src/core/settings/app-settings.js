const APP_SETTINGS_KEY = 'MN_Solution_App_Settings'

export const DEFAULT_APP_SETTINGS = {
  font: 'arial',
  mode: 'dark',
  canvasBackground: 'gray'
}

const FONT_VALUE = {
  arial: 'Arial, Helvetica, sans-serif',
  timesNewRoman: '"Times New Roman", Times, serif',
  tahoma: 'Tahoma, Geneva, sans-serif'
}

const CANVAS_BACKGROUND_VALUE = {
  white: '#ffffff',
  gray: 'rgb(169,169,169)',
  yellow: 'rgb(255,255,240)'
}

//=================
function normalizeAppSettings(settings = {}) {
  const safeSettings = { ...DEFAULT_APP_SETTINGS, ...(settings || {}) }

  if (!FONT_VALUE[safeSettings.font]) safeSettings.font = DEFAULT_APP_SETTINGS.font
  if (!['light', 'dark'].includes(safeSettings.mode)) safeSettings.mode = DEFAULT_APP_SETTINGS.mode
  if (!CANVAS_BACKGROUND_VALUE[safeSettings.canvasBackground]) safeSettings.canvasBackground = DEFAULT_APP_SETTINGS.canvasBackground

  return safeSettings
} // End normalizeAppSettings

//=================
export function loadAppSettings() {
  try {
    const raw = localStorage.getItem(APP_SETTINGS_KEY)
    if (!raw) return { ...DEFAULT_APP_SETTINGS }

    return normalizeAppSettings(JSON.parse(raw))
  } catch (error) {
    return { ...DEFAULT_APP_SETTINGS }
  }
} // End loadAppSettings

//=================
export function saveAppSettings(settings) {
  const nextSettings = normalizeAppSettings(settings)
  localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(nextSettings))
  return nextSettings
} // End saveAppSettings

//=================
export function resetAppSettings() {
  const nextSettings = { ...DEFAULT_APP_SETTINGS }
  localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(nextSettings))
  return nextSettings
} // End resetAppSettings

//=================
export function exportAppSettings(settings) {
  const nextSettings = normalizeAppSettings(settings)
  const blob = new Blob([JSON.stringify(nextSettings, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')

  a.href = url
  a.download = 'mn-solution-settings.json'
  a.click()

  URL.revokeObjectURL(url)
} // End exportAppSettings

//=================
export function importAppSettingsFromFile() {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json,application/json'

    input.addEventListener('change', () => {
      const file = input.files && input.files[0]
      if (!file) {
        reject(new Error('NO_FILE_SELECTED'))
        return
      }

      const reader = new FileReader()

      reader.onload = () => {
        try {
          const data = JSON.parse(String(reader.result || '{}'))
          resolve(normalizeAppSettings(data))
        } catch (error) {
          reject(error)
        }
      }

      reader.onerror = () => reject(reader.error || new Error('READ_FILE_ERROR'))
      reader.readAsText(file)
    })

    input.click()
  })
} // End importAppSettingsFromFile

//=================
export function applyAppSettings(settings) {
  const nextSettings = normalizeAppSettings(settings)
  const root = document.documentElement

  root.style.setProperty('--mn-font-main', FONT_VALUE[nextSettings.font])
  root.style.setProperty('--mn-bg-canvas', CANVAS_BACKGROUND_VALUE[nextSettings.canvasBackground])
  root.setAttribute('data-mn-mode', nextSettings.mode)

  window.dispatchEvent(new Event('resize'))
  window.dispatchEvent(new CustomEvent('mn-app-settings-applied', { detail: nextSettings }))

  return nextSettings
} // End applyAppSettings
