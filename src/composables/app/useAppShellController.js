import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useDrawingStore } from '../../stores/useDrawingStore'
import { useAppStore } from '../../stores/useAppStore'
import { useCabinetStore } from '../../stores/useCabinetStore'
import { useCabinetInfoStore } from '../../stores/useCabinetInfoStore'
import { applyAppSettings, loadAppSettings } from '../../core/settings/app-settings'
import { findShortcutAction, loadShortcutSettings, shortcutEventToText } from '../../core/settings/shortcut-settings'
import { applyMachinePanelSettingsToStores, isEditableShortcutTarget } from '../../core/app/appShellActions'
import { exportProjectJson, getProjectPayload, saveProjectOffline } from '../../core/project/projectPersistence'

//=================
export function useAppShellController() {
  const drawingStore = useDrawingStore()
  const app = useAppStore()
  const cabinet = useCabinetStore()
  const cabinetInfo = useCabinetInfoStore()
  const isRightPanelHidden = ref(true)
  const rightPanelWidth = ref(224)
  let rightPanelResizing = false

  //=================
  function applyRightPanelWidth(width) {
    const safeWidth = Math.max(180, Math.min(520, Math.round(width)))

    rightPanelWidth.value = safeWidth
    document.documentElement.style.setProperty('--mn-right-panel-width', `${safeWidth}px`)

    requestAnimationFrame(() => {
      window.dispatchEvent(new Event('resize'))
    })
  } // End applyRightPanelWidth

  //=================
  function onRightPanelResizeMove(event) {
    if (!rightPanelResizing) return

    const nextWidth = window.innerWidth - event.clientX

    applyRightPanelWidth(nextWidth)
  } // End onRightPanelResizeMove

  //=================
  function stopRightPanelResize() {
    if (!rightPanelResizing) return

    rightPanelResizing = false
    document.body.classList.remove('mn-right-panel-is-resizing')
    window.removeEventListener('pointermove', onRightPanelResizeMove)
    window.removeEventListener('pointerup', stopRightPanelResize)
  } // End stopRightPanelResize

  //=================
  function startRightPanelResize(event) {
    rightPanelResizing = true
    document.body.classList.add('mn-right-panel-is-resizing')

    event?.preventDefault?.()
    event?.stopPropagation?.()

    window.addEventListener('pointermove', onRightPanelResizeMove)
    window.addEventListener('pointerup', stopRightPanelResize)
  } // End startRightPanelResize

  //=================
  function toggleRightPanel() {
    isRightPanelHidden.value = !isRightPanelHidden.value

    requestAnimationFrame(() => {
      window.dispatchEvent(new Event('resize'))
    })
  } // End toggleRightPanel

  //=================
  function hideRightPanel() {
    if (isRightPanelHidden.value) return

    isRightPanelHidden.value = true

    requestAnimationFrame(() => {
      window.dispatchEvent(new Event('resize'))
    })
  } // End hideRightPanel

  //=================
  function projectPayload() {
    return getProjectPayload(cabinet.state, drawingStore.state.panels)
  } // End projectPayload

  //=================
  function newProject() {
    drawingStore.state.panels = []
    drawingStore.clearSelection()
    drawingStore.rebuildZones()
    app.setStatus('Đã tạo project mới')
  } // End newProject

  //=================
  function saveOfflineProject() {
    saveProjectOffline(projectPayload())
    app.setStatus('Đã lưu offline vào trình duyệt')
  } // End saveOfflineProject

  //=================
  function exportProjectFile() {
    exportProjectJson(projectPayload())
    app.setStatus('Đã xuất file project')
  } // End exportProjectFile

  //=================
  function runShortcutAction(action) {
    if (!action) return false

    if (action.type === 'tool') {
      app.setTool(action.value)
      if (action.value === 'select') app.setStatus('Select')
      return true
    }

    if (action.type === 'view') {
      app.setView(action.value)
      return true
    }

    if (action.type === 'toggle3d') {
      app.toggleMini3D()
      return true
    }

    if (action.type === 'toggleInfo') {
      toggleRightPanel()
      return true
    }

    if (action.value === 'newProject') {
      newProject()
      return true
    }

    if (action.value === 'saveOffline') {
      saveOfflineProject()
      return true
    }

    if (action.value === 'exportFile') {
      exportProjectFile()
      return true
    }

    if (action.value === 'openSettings') {
      window.dispatchEvent(new CustomEvent('mn-open-settings'))
      return true
    }

    return false
  } // End runShortcutAction

  //=================
  function onGlobalKeyDown(event) {
    if (drawingStore.state.panelEdit?.active) return

    if (isEditableShortcutTarget(event)) return

    const shortcutText = shortcutEventToText(event)
    const action = findShortcutAction(shortcutText, loadShortcutSettings())

    if (!action) return

    if (!runShortcutAction(action)) return

    event.preventDefault()
    event.stopPropagation()
  } // End onGlobalKeyDown

  watch(() => drawingStore.state.panelEdit?.active, (active) => {
    if (!active) return

    hideRightPanel()
  })

  onMounted(() => {
    const machineSettings = loadAppSettings()

    applyAppSettings(machineSettings)
    applyMachinePanelSettingsToStores(machineSettings, cabinet, cabinetInfo)
    drawingStore.ensureDefaultTestCabinet?.()
    drawingStore.rebuildZones()
    applyRightPanelWidth(rightPanelWidth.value)
    window.addEventListener('keydown', onGlobalKeyDown, true)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('keydown', onGlobalKeyDown, true)
    stopRightPanelResize()
  })

  return {
    isRightPanelHidden,
    rightPanelWidth,
    startRightPanelResize,
    toggleRightPanel
  }
} // End useAppShellController
