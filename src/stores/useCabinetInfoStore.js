import { createSimpleStore } from './createStore'
import { useAppStore } from './useAppStore'
import { useBoxStore } from './useBoxStore'
import { useDrawingStore } from './useDrawingStore'
import { createDefaultCabinetInfoState } from '../core/cabinet-info/cabinetInfoDefaults'
import { buildCabinetInfoPanels } from '../core/cabinet-info/cabinetInfoBuilder'

//=================
function cloneValue(value) {
  return JSON.parse(JSON.stringify(value))
} // End cloneValue

//=================
function setNestedValue(target, path, value) {
  const keys = String(path || '').split('.').filter(Boolean)

  if (!keys.length) return

  let cursor = target

  keys.slice(0, -1).forEach((key) => {
    if (!cursor[key] || typeof cursor[key] !== 'object') {
      cursor[key] = {}
    }

    cursor = cursor[key]
  })

  cursor[keys[keys.length - 1]] = value
} // End setNestedValue

//=================
function removeCabinetInfoPanelsForBox(panels, boxId) {
  return panels.filter((panel) => {
    const sameBox = panel.linkedFrameId === boxId
      || panel.frameId === boxId
      || panel.sourceBoxId === boxId
      || panel.baseObjectId === boxId

    return !(sameBox && panel.sourceType === 'cabinet-info')
  })
} // End removeCabinetInfoPanelsForBox

const store = createSimpleStore({
  info: createDefaultCabinetInfoState(),
  openSections: {
    general: false,
    back: false,
    topStrip: false,
    handleRail: false,
    doorStop: false,
    toeKick: false,
    filler: false,
    shelfInset: false
  },
  autoApply: true
}, (state) => ({
  //=================
  resetInfo() {
    state.info = createDefaultCabinetInfoState()
  }, // End resetInfo

  //=================
  toggleSection(key) {
    state.openSections[key] = !state.openSections[key]
  }, // End toggleSection

  //=================
  setAutoApply(value) {
    state.autoApply = value === true
  }, // End setAutoApply

  //=================
  setValue(path, value) {
    setNestedValue(state.info, path, value)

    if (state.autoApply) {
      this.applyToSelectedBox(false)
    }
  }, // End setValue

  //=================
  getSelectedBox() {
    const boxStore = useBoxStore()

    return boxStore.getSelectedBox ? boxStore.getSelectedBox() : null
  }, // End getSelectedBox

  //=================
  syncGroupNameFromSelectedBox() {
    const selectedBox = this.getSelectedBox()

    if (!selectedBox) return

    state.info.groupName = selectedBox.name || state.info.groupName || 'Box 1'
  }, // End syncGroupNameFromSelectedBox

  //=================
  applyToSelectedBox(pushHistory = true) {
    const selectedBox = this.getSelectedBox()
    const drawing = useDrawingStore()
    const app = useAppStore()

    if (!selectedBox) {
      app.setStatus('Info: chưa chọn Box')
      return false
    }

    const nextPanels = buildCabinetInfoPanels(selectedBox, cloneValue(state.info))
    const oldPanels = removeCabinetInfoPanelsForBox(drawing.state.panels, selectedBox.id)

    if (pushHistory) {
      drawing.pushHistorySnapshot('MN Solution Info')
    }

    drawing.state.panels = [
      ...oldPanels,
      ...nextPanels
    ]

    drawing.state.selectedPanelId = nextPanels[0]?.id || null
    drawing.state.selectedPanelIds = nextPanels[0] ? [nextPanels[0].id] : []
    drawing.rebuildZones()
    app.setStatus(`Info: đã tạo ${nextPanels.length} chi tiết cho ${selectedBox.name || selectedBox.id}`)

    return true
  }, // End applyToSelectedBox

  //=================
  clearSelectedBoxInfoPanels() {
    const selectedBox = this.getSelectedBox()
    const drawing = useDrawingStore()
    const app = useAppStore()

    if (!selectedBox) {
      app.setStatus('Info: chưa chọn Box')
      return false
    }

    drawing.pushHistorySnapshot('Xóa MN Solution Info')
    drawing.state.panels = removeCabinetInfoPanelsForBox(drawing.state.panels, selectedBox.id)
    drawing.state.selectedPanelId = null
    drawing.state.selectedPanelIds = []
    drawing.rebuildZones()
    app.setStatus(`Info: đã xóa chi tiết Info của ${selectedBox.name || selectedBox.id}`)

    return true
  } // End clearSelectedBoxInfoPanels
}))

//=================
export function useCabinetInfoStore() {
  return store
} // End useCabinetInfoStore
