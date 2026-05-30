import { createSimpleStore } from './createStore'
import { useAppStore } from './useAppStore'
import { useBoxStore } from './useBoxStore'
import { useDrawingStore } from './useDrawingStore'
import { CABINET_INFO_DEFAULTS } from '../core/cabinet-info/cabinetInfoDefaults'
import { buildCabinetInfoLayout, normalizeSelectedCabinetFrame } from '../core/cabinet-info/cabinetInfoLayout'

//=================
function readSelectedIdFromStore(store) {
  const state = store?.state || {}
  const directKeys = ['selectedBoxId', 'activeBoxId', 'currentBoxId', 'selectedId']

  for (const key of directKeys) {
    if (state[key]) return state[key]
  }

  const arrayKeys = ['selectedBoxIds', 'selectedIds']
  for (const key of arrayKeys) {
    if (Array.isArray(state[key]) && state[key].length) return state[key][0]
  }

  return null
} // End readSelectedIdFromStore

//=================
function readBoxList(boxStore, drawing) {
  if (Array.isArray(boxStore?.state?.boxes)) return boxStore.state.boxes
  if (Array.isArray(boxStore?.boxes)) return boxStore.boxes
  if (Array.isArray(drawing?.state?.boxes)) return drawing.state.boxes
  return []
} // End readBoxList

//=================
function findSelectedBox(boxStore, drawing) {
  const boxes = readBoxList(boxStore, drawing)
  const selectedId = readSelectedIdFromStore(boxStore) || readSelectedIdFromStore(drawing)

  if (selectedId) {
    const box = boxes.find((item) => item.id === selectedId || item.boxId === selectedId)
    if (box) return box
  }

  const flaggedBox = boxes.find((item) => item.selected || item.isSelected || item.active)
  if (flaggedBox) return flaggedBox

  return null
} // End findSelectedBox

//=================
function isCabinetInfoPanelOfFrame(panel, frameId) {
  if (panel?.sourceType !== 'cabinet-info') return false
  return panel.frameId === frameId || panel.linkedFrameId === frameId || panel.sourceBoxId === frameId || panel.baseObjectId === frameId
} // End isCabinetInfoPanelOfFrame

const store = createSimpleStore({
  form: { ...CABINET_INFO_DEFAULTS },
  lastLayout: null,
  lastError: '',
  selectedFrame: null
}, (state) => ({
  //=================
  setValue(key, value) {
    if (!(key in state.form)) return
    state.form[key] = value
  }, // End setValue

  //=================
  reset() {
    state.form = { ...CABINET_INFO_DEFAULTS }
    state.lastLayout = null
    state.lastError = ''
    state.selectedFrame = null
  }, // End reset

  //=================
  getSelectedBox() {
    const drawing = useDrawingStore()
    const boxStore = useBoxStore()
    return findSelectedBox(boxStore, drawing)
  }, // End getSelectedBox

  //=================
  syncFromSelectedBox() {
    const selectedBox = this.getSelectedBox()
    if (!selectedBox) {
      state.lastError = 'MN Info: chọn box trước khi tạo thông tin tủ'
      state.selectedFrame = null
      return null
    }

    const frame = normalizeSelectedCabinetFrame(selectedBox, state.form)
    state.selectedFrame = frame
    state.form.width = frame.width
    state.form.height = frame.height
    state.form.depth = frame.depth
    if (!state.form.thickness) state.form.thickness = frame.panelThickness
    state.lastError = ''
    return selectedBox
  }, // End syncFromSelectedBox

  //=================
  getSelectedFrameLabel() {
    const selectedBox = this.getSelectedBox()
    if (!selectedBox) return 'Chưa chọn box'
    const frame = normalizeSelectedCabinetFrame(selectedBox, state.form)
    return `${frame.width} x ${frame.depth} x ${frame.height}`
  }, // End getSelectedFrameLabel

  //=================
  buildPreview() {
    try {
      const selectedBox = this.syncFromSelectedBox()
      if (!selectedBox) return null
      const layout = buildCabinetInfoLayout(state.form, selectedBox)
      state.lastLayout = layout
      state.lastError = ''
      return layout
    } catch (error) {
      state.lastError = error?.message || 'Không tạo được thông tin tủ'
      return null
    }
  }, // End buildPreview

  //=================
  applyToDrawing() {
    const layout = this.buildPreview()
    if (!layout) return false

    const drawing = useDrawingStore()
    const app = useAppStore()
    const oldPanels = Array.isArray(drawing.state.panels) ? drawing.state.panels : []
    const frameId = layout.meta.frameId
    const nextPanels = oldPanels.filter((panel) => !isCabinetInfoPanelOfFrame(panel, frameId))

    drawing.pushHistorySnapshot?.('MN Solution Info - Apply Selected Box')
    drawing.state.panels = [...nextPanels, ...layout.panels]
    drawing.state.selectedPanelId = null
    drawing.state.selectedPanelIds = []
    drawing.rebuildZones?.()
    app.setStatus?.(`MN Info: đã tạo ${layout.panels.length} chi tiết cho box đang chọn`)
    return true
  }, // End applyToDrawing

  //=================
  clearCabinetInfo() {
    const drawing = useDrawingStore()
    const app = useAppStore()
    const selectedBox = this.getSelectedBox()

    drawing.pushHistorySnapshot?.('Xóa MN Solution Info')

    if (selectedBox) {
      const frame = normalizeSelectedCabinetFrame(selectedBox, state.form)
      drawing.state.panels = (drawing.state.panels || []).filter((panel) => !isCabinetInfoPanelOfFrame(panel, frame.id))
      app.setStatus?.('MN Info: đã xóa chi tiết Info của box đang chọn')
    } else {
      drawing.state.panels = (drawing.state.panels || []).filter((panel) => panel.sourceType !== 'cabinet-info')
      app.setStatus?.('MN Info: đã xóa toàn bộ chi tiết Info')
    }

    state.lastLayout = null
    drawing.rebuildZones?.()
  } // End clearCabinetInfo
}))

//=================
export function useCabinetInfoStore() {
  return store
} // End useCabinetInfoStore
