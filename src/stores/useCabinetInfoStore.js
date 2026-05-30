import { createSimpleStore } from './createStore'
import { useAppStore } from './useAppStore'
import { useBoxStore } from './useBoxStore'
import { useDrawingStore } from './useDrawingStore'
import { CABINET_INFO_DEFAULTS } from '../core/cabinet-info/cabinetInfoDefaults'
import { buildCabinetInfoLayout } from '../core/cabinet-info/cabinetInfoLayout'

const store = createSimpleStore({
  form: { ...CABINET_INFO_DEFAULTS },
  lastLayout: null,
  lastError: ''
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
  }, // End reset

  //=================
  buildPreview() {
    try {
      const layout = buildCabinetInfoLayout(state.form)
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
    const boxStore = useBoxStore()
    const app = useAppStore()
    const oldPanels = Array.isArray(drawing.state.panels) ? drawing.state.panels : []
    const oldBoxes = Array.isArray(boxStore.state.boxes) ? boxStore.state.boxes : []
    const nextPanels = oldPanels.filter((panel) => panel.sourceType !== 'cabinet-info')
    const nextBoxes = oldBoxes.filter((box) => box.sourceType !== 'cabinet-info')

    drawing.pushHistorySnapshot?.('MN Solution Info')
    boxStore.setBoxes?.([...nextBoxes, layout.box])
    drawing.state.panels = [...nextPanels, ...layout.panels]
    drawing.state.selectedPanelId = null
    drawing.state.selectedPanelIds = []
    drawing.rebuildZones?.()
    boxStore.selectBox?.(layout.box.id)
    app.setStatus?.(`MN Info: đã tạo ${layout.panels.length} chi tiết`)
    return true
  }, // End applyToDrawing

  //=================
  clearCabinetInfo() {
    const drawing = useDrawingStore()
    const boxStore = useBoxStore()
    const app = useAppStore()

    drawing.pushHistorySnapshot?.('Xóa MN Solution Info')
    drawing.state.panels = (drawing.state.panels || []).filter((panel) => panel.sourceType !== 'cabinet-info')
    boxStore.setBoxes?.((boxStore.state.boxes || []).filter((box) => box.sourceType !== 'cabinet-info'))
    drawing.rebuildZones?.()
    app.setStatus?.('MN Info: đã xóa chi tiết thông tin tủ')
  } // End clearCabinetInfo
}))

//=================
export function useCabinetInfoStore() {
  return store
} // End useCabinetInfoStore
