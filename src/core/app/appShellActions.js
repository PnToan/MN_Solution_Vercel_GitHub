//=================
export function isEditableShortcutTarget(event) {
  const target = event.target
  if (!target) return false
  if (target.closest?.('.mn-settings-dialog')) return true

  const tagName = String(target.tagName || '').toLowerCase()
  return tagName === 'input' || tagName === 'textarea' || tagName === 'select' || target.isContentEditable
} // End isEditableShortcutTarget

//=================
export function applyMachinePanelSettingsToStores(settings, cabinet, cabinetInfo) {
  const defaultThickness = Math.round(Number(settings?.panel?.defaultThickness || 17.4) * 10) / 10
  const backThickness = Math.round(Number(settings?.panel?.backThickness || 10) * 10) / 10

  cabinet.state.panelThickness = defaultThickness
  cabinetInfo.state.info.general.panelThickness = defaultThickness
  cabinetInfo.state.info.back.thickness = backThickness
} // End applyMachinePanelSettingsToStores
