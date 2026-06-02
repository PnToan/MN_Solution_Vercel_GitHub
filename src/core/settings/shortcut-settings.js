const SHORTCUT_SETTINGS_KEY = 'MN_Solution_Shortcut_Settings'

export const SHORTCUT_FUNCTIONS = [
  { id: 'tool.select', group: 'Thanh công cụ', label: 'Chọn', defaultShortcuts: ['Space'], type: 'tool', value: 'select' },
  { id: 'tool.box', group: 'Thanh công cụ', label: 'Box', defaultShortcuts: ['B'], type: 'tool', value: 'box' },
  { id: 'tool.panel', group: 'Thanh công cụ', label: 'Vẽ Tấm', defaultShortcuts: ['P'], type: 'tool', value: 'panel' },
  { id: 'tool.move', group: 'Thanh công cụ', label: 'Di chuyển', defaultShortcuts: ['M'], type: 'tool', value: 'move' },
  { id: 'tool.dimensions', group: 'Thanh công cụ', label: 'Dimensions', defaultShortcuts: ['D'], type: 'tool', value: 'dimensions' },

  { id: 'editPanel.select', group: 'Edit Panel', label: 'Edit Panel - Select', defaultShortcuts: ['S'], type: 'editPanelTool', value: 'editPanelSelect' },
  { id: 'editPanel.line', group: 'Edit Panel', label: 'Edit Panel - Line', defaultShortcuts: ['L'], type: 'editPanelTool', value: 'editPanelLine' },
  { id: 'editPanel.rect', group: 'Edit Panel', label: 'Edit Panel - Rectangle', defaultShortcuts: ['R'], type: 'editPanelTool', value: 'editPanelRect' },
  { id: 'editPanel.arc', group: 'Edit Panel', label: 'Edit Panel - Arc', defaultShortcuts: ['A'], type: 'editPanelTool', value: 'editPanelArc' },
  { id: 'editPanel.circle', group: 'Edit Panel', label: 'Edit Panel - Circle', defaultShortcuts: ['C'], type: 'editPanelTool', value: 'editPanelCircle' },
  { id: 'editPanel.tape', group: 'Edit Panel', label: 'Edit Panel - Tape', defaultShortcuts: ['T'], type: 'editPanelTool', value: 'editPanelTape' },

  { id: 'view.top', group: 'View', label: 'Mặt Trên', defaultShortcuts: ['Alt+T'], type: 'view', value: 'top' },
  { id: 'view.bottom', group: 'View', label: 'Mặt Dưới', defaultShortcuts: ['Alt+B'], type: 'view', value: 'bottom' },
  { id: 'view.front', group: 'View', label: 'Mặt Trước', defaultShortcuts: ['Alt+F'], type: 'view', value: 'front' },
  { id: 'view.back', group: 'View', label: 'Mặt Sau', defaultShortcuts: ['Alt+K'], type: 'view', value: 'back' },
  { id: 'view.left', group: 'View', label: 'Mặt Trái', defaultShortcuts: ['Alt+L'], type: 'view', value: 'left' },
  { id: 'view.right', group: 'View', label: 'Mặt Phải', defaultShortcuts: ['Alt+R'], type: 'view', value: 'right' },

  { id: 'view.toggle3d', group: 'Hiển thị', label: 'Ẩn / Hiện 3D', defaultShortcuts: ['F3'], type: 'toggle3d', value: 'mini3d' },
  { id: 'view.toggleInfo', group: 'Hiển thị', label: 'Ẩn / Hiện Info Panel', defaultShortcuts: ['F4'], type: 'toggleInfo', value: 'info' },

  { id: 'project.new', group: 'File', label: 'Tạo mới', defaultShortcuts: ['Ctrl+N'], type: 'custom', value: 'newProject' },
  { id: 'project.saveOffline', group: 'File', label: 'Lưu offline', defaultShortcuts: ['Ctrl+S'], type: 'custom', value: 'saveOffline' },
  { id: 'project.exportFile', group: 'File', label: 'Xuất file', defaultShortcuts: ['Ctrl+E'], type: 'custom', value: 'exportFile' },
  { id: 'settings.open', group: 'File', label: 'Mở Setting', defaultShortcuts: ['F2'], type: 'custom', value: 'openSettings' }
]

//=================
function normalizeShortcutText(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''

  const parts = raw.split('+').map(part => part.trim()).filter(Boolean)
  if (parts.length === 0) return ''

  const key = parts.pop()
  const modifierSet = new Set()

  parts.forEach(part => {
    const lower = part.toLowerCase()
    if (lower === 'ctrl' || lower === 'control') modifierSet.add('Ctrl')
    if (lower === 'alt') modifierSet.add('Alt')
    if (lower === 'shift') modifierSet.add('Shift')
    if (lower === 'meta' || lower === 'cmd' || lower === 'command') modifierSet.add('Meta')
  })

  const orderedModifiers = ['Ctrl', 'Alt', 'Shift', 'Meta'].filter(item => modifierSet.has(item))
  const normalizedKey = normalizeKeyName(key)

  return [...orderedModifiers, normalizedKey].join('+')
} // End normalizeShortcutText

//=================
function normalizeKeyName(key) {
  const raw = String(key || '').trim()
  if (!raw) return ''

  const lower = raw.toLowerCase()
  if (lower === ' ' || lower === 'space' || lower === 'spacebar') return 'Space'
  if (lower === 'esc' || lower === 'escape') return 'Escape'
  if (lower === 'del' || lower === 'delete') return 'Delete'
  if (lower === 'enter' || lower === 'return') return 'Enter'
  if (lower === 'arrowup') return 'ArrowUp'
  if (lower === 'arrowdown') return 'ArrowDown'
  if (lower === 'arrowleft') return 'ArrowLeft'
  if (lower === 'arrowright') return 'ArrowRight'
  if (/^f\d{1,2}$/i.test(raw)) return raw.toUpperCase()
  if (raw.length === 1) return raw.toUpperCase()

  return raw.charAt(0).toUpperCase() + raw.slice(1)
} // End normalizeKeyName

//=================
export function shortcutEventToText(event) {
  if (!event) return ''

  let key = event.key || ''
  if (key === ' ') key = 'Space'
  if (key === 'Control' || key === 'Alt' || key === 'Shift' || key === 'Meta') return ''

  const parts = []
  if (event.ctrlKey) parts.push('Ctrl')
  if (event.altKey) parts.push('Alt')
  if (event.shiftKey) parts.push('Shift')
  if (event.metaKey) parts.push('Meta')
  parts.push(normalizeKeyName(key))

  return normalizeShortcutText(parts.join('+'))
} // End shortcutEventToText

//=================
export function getDefaultShortcutSettings() {
  const out = {}

  SHORTCUT_FUNCTIONS.forEach(item => {
    out[item.id] = Array.isArray(item.defaultShortcuts) ? [...item.defaultShortcuts] : []
  })

  return out
} // End getDefaultShortcutSettings

//=================
export function normalizeShortcutSettings(settings = {}) {
  const defaults = getDefaultShortcutSettings()
  const out = {}
  const used = new Set()

  SHORTCUT_FUNCTIONS.forEach(item => {
    const source = Array.isArray(settings[item.id]) ? settings[item.id] : defaults[item.id]
    out[item.id] = []

    source.forEach(shortcut => {
      const normalized = normalizeShortcutText(shortcut)
      if (!normalized || used.has(normalized)) return

      used.add(normalized)
      out[item.id].push(normalized)
    })
  })

  return out
} // End normalizeShortcutSettings

//=================
export function loadShortcutSettings() {
  try {
    const raw = localStorage.getItem(SHORTCUT_SETTINGS_KEY)
    if (!raw) return getDefaultShortcutSettings()

    return normalizeShortcutSettings(JSON.parse(raw))
  } catch (error) {
    return getDefaultShortcutSettings()
  }
} // End loadShortcutSettings

//=================
export function saveShortcutSettings(settings) {
  const nextSettings = normalizeShortcutSettings(settings)
  localStorage.setItem(SHORTCUT_SETTINGS_KEY, JSON.stringify(nextSettings))
  return nextSettings
} // End saveShortcutSettings

//=================
export function resetShortcutSettings() {
  const nextSettings = getDefaultShortcutSettings()
  localStorage.setItem(SHORTCUT_SETTINGS_KEY, JSON.stringify(nextSettings))
  return nextSettings
} // End resetShortcutSettings

//=================
export function findShortcutAction(shortcutText, settings = loadShortcutSettings()) {
  const normalized = normalizeShortcutText(shortcutText)
  if (!normalized) return null

  const shortcutSettings = normalizeShortcutSettings(settings)
  const found = SHORTCUT_FUNCTIONS.find(item => shortcutSettings[item.id]?.includes(normalized))

  return found || null
} // End findShortcutAction

//=================
export function hasShortcutConflict(functionId, shortcutText, settings = loadShortcutSettings()) {
  const normalized = normalizeShortcutText(shortcutText)
  if (!normalized) return null

  const shortcutSettings = normalizeShortcutSettings(settings)
  const found = SHORTCUT_FUNCTIONS.find(item => item.id !== functionId && shortcutSettings[item.id]?.includes(normalized))

  return found || null
} // End hasShortcutConflict

export { normalizeShortcutText }
