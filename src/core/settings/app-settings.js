import { getDefaultShortcutSettings, normalizeShortcutSettings, saveShortcutSettings } from './shortcut-settings'

const APP_SETTINGS_KEY = 'MN_Solution_App_Settings'

export const DEFAULT_APP_SETTINGS = {
  font: 'arial',
  mode: 'dark',
  canvasBackground: 'gray',
  shortcuts: getDefaultShortcutSettings(),
  panel: {
    defaultThickness: 17.4,
    backThickness: 10,
    panelColor: '#87ceff',
    selectedLineColor: '#008cff',
    opacity: 80,
    backColor: '#87ceff',
    backOpacity: 80,
    names: {
      topRail: 'Chỉ Nóc',
      leftSide: 'Hông Trái',
      rightSide: 'Hông Phải',
      upperReducerLeft: 'Gia Giảm',
      upperReducerRight: 'Gia Giảm',
      handleRail: 'Diềm Tay Nắm',
      midRail: 'Thanh Chặn Cánh',
      bottom: 'Đáy',
      toeKick: 'Len Chân',
      back: 'Hậu'
    }
  }
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

const DEFAULT_PANEL_NAMES = DEFAULT_APP_SETTINGS.panel.names

//=================
function cloneDefaultSettings() {
  return JSON.parse(JSON.stringify(DEFAULT_APP_SETTINGS))
} // End cloneDefaultSettings

//=================
function normalizeHexColor(value, fallback) {
  let text = String(value || '').trim()

  if (!text) return fallback
  if (!text.startsWith('#')) text = `#${text}`

  if (/^#[0-9a-fA-F]{3}$/.test(text)) {
    text = `#${text[1]}${text[1]}${text[2]}${text[2]}${text[3]}${text[3]}`
  }

  if (!/^#[0-9a-fA-F]{6}$/.test(text)) return fallback

  return text.toLowerCase()
} // End normalizeHexColor

//=================
function normalizeNumber(value, fallback, min = 0, max = Number.POSITIVE_INFINITY) {
  const numberValue = Number(value)

  if (!Number.isFinite(numberValue)) return fallback

  const clampedValue = Math.max(min, Math.min(max, numberValue))

  return Math.round(clampedValue * 10) / 10
} // End normalizeNumber

//=================
function normalizePanelNames(names = {}) {
  const safeNames = { ...DEFAULT_PANEL_NAMES, ...(names || {}) }

  Object.keys(DEFAULT_PANEL_NAMES).forEach(key => {
    const value = String(safeNames[key] || '').trim()
    safeNames[key] = value || DEFAULT_PANEL_NAMES[key]
  })

  return safeNames
} // End normalizePanelNames

//=================
function normalizePanelSettings(panel = {}) {
  const defaultPanel = DEFAULT_APP_SETTINGS.panel
  const safePanel = { ...defaultPanel, ...(panel || {}) }

  return {
    defaultThickness: normalizeNumber(safePanel.defaultThickness, defaultPanel.defaultThickness, 0),
    backThickness: normalizeNumber(safePanel.backThickness, defaultPanel.backThickness, 0),
    panelColor: normalizeHexColor(safePanel.panelColor, defaultPanel.panelColor),
    selectedLineColor: normalizeHexColor(safePanel.selectedLineColor, defaultPanel.selectedLineColor),
    opacity: normalizeNumber(safePanel.opacity, defaultPanel.opacity, 0, 100),
    backColor: normalizeHexColor(safePanel.backColor, defaultPanel.backColor),
    backOpacity: normalizeNumber(safePanel.backOpacity, defaultPanel.backOpacity, 0, 100),
    names: normalizePanelNames(safePanel.names)
  }
} // End normalizePanelSettings

//=================
function normalizeAppSettings(settings = {}) {
  const safeSettings = { ...cloneDefaultSettings(), ...(settings || {}) }

  if (!FONT_VALUE[safeSettings.font]) safeSettings.font = DEFAULT_APP_SETTINGS.font
  if (!['light', 'dark'].includes(safeSettings.mode)) safeSettings.mode = DEFAULT_APP_SETTINGS.mode
  if (!CANVAS_BACKGROUND_VALUE[safeSettings.canvasBackground]) safeSettings.canvasBackground = DEFAULT_APP_SETTINGS.canvasBackground
  safeSettings.shortcuts = normalizeShortcutSettings(safeSettings.shortcuts)
  safeSettings.panel = normalizePanelSettings(safeSettings.panel)

  return safeSettings
} // End normalizeAppSettings

//=================
export function loadAppSettings() {
  try {
    const raw = localStorage.getItem(APP_SETTINGS_KEY)
    if (!raw) return cloneDefaultSettings()

    return normalizeAppSettings(JSON.parse(raw))
  } catch (error) {
    return cloneDefaultSettings()
  }
} // End loadAppSettings

//=================
export function saveAppSettings(settings) {
  const nextSettings = normalizeAppSettings(settings)
  localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(nextSettings))
  saveShortcutSettings(nextSettings.shortcuts)
  return nextSettings
} // End saveAppSettings

//=================
export function resetAppSettings() {
  const nextSettings = cloneDefaultSettings()
  localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(nextSettings))
  saveShortcutSettings(nextSettings.shortcuts)
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
  root.style.setProperty('--mn-panel-color', nextSettings.panel.panelColor)
  root.style.setProperty('--mn-panel-selected-line-color', nextSettings.panel.selectedLineColor)
  root.style.setProperty('--mn-panel-opacity', String(nextSettings.panel.opacity / 100))
  root.style.setProperty('--mn-back-panel-color', nextSettings.panel.backColor)
  root.style.setProperty('--mn-back-panel-opacity', String(nextSettings.panel.backOpacity / 100))
  root.setAttribute('data-mn-mode', nextSettings.mode)

  window.dispatchEvent(new Event('resize'))
  window.dispatchEvent(new CustomEvent('mn-app-settings-applied', { detail: nextSettings }))

  return nextSettings
} // End applyAppSettings

//=================
export function getPanelPartName(partKey, settings = loadAppSettings()) {
  const panelSettings = normalizePanelSettings(settings.panel)

  return panelSettings.names[partKey] || DEFAULT_PANEL_NAMES[partKey] || partKey
} // End getPanelPartName
