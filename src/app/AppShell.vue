<template>
  <div class="mn-app" :class="{ 'mn-right-panel-hidden': isRightPanelHidden }">
    <TopBar />
    <LibraryBar />
    <LeftToolbar />
    <DrawingViewport />
    <BottomParams
      :commit-sha="props.commitSha"
      :commit-name="props.commitName"
    />

    <div
      v-if="!isRightPanelHidden"
      class="mn-right-panel-resizer"
      @pointerdown="startRightPanelResize"
    ></div>

    <RightPanel />

    <button
      class="mn-right-panel-tab"
      type="button"
      @click="toggleRightPanel"
    >
      {{ isRightPanelHidden ? 'Info' : 'Ẩn Info' }}
    </button>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import TopBar from '../components/layout/TopBar.vue'
import LibraryBar from '../components/library/LibraryBar.vue'
import LeftToolbar from '../components/layout/LeftToolbar.vue'
import DrawingViewport from '../components/drawing/DrawingViewport.vue'
import BottomParams from '../components/layout/BottomParams.vue'
import RightPanel from '../components/panels/RightPanel.vue'
import { useDrawingStore } from '../stores/useDrawingStore'
import { useAppStore } from '../stores/useAppStore'
import { useCabinetStore } from '../stores/useCabinetStore'
import { useCabinetInfoStore } from '../stores/useCabinetInfoStore'
import { applyAppSettings, loadAppSettings } from '../core/settings/app-settings'
import { findShortcutAction, loadShortcutSettings, shortcutEventToText } from '../core/settings/shortcut-settings'

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
//=================
function toggleRightPanel() {
  isRightPanelHidden.value = !isRightPanelHidden.value

  requestAnimationFrame(() => {
    window.dispatchEvent(new Event('resize'))
  })
} // End toggleRightPanel

//=================
function isEditableShortcutTarget(event) {
  const target = event.target
  if (!target) return false
  if (target.closest?.('.mn-settings-dialog')) return true

  const tagName = String(target.tagName || '').toLowerCase()
  return tagName === 'input' || tagName === 'textarea' || tagName === 'select' || target.isContentEditable
} // End isEditableShortcutTarget

//=================
function projectPayload() {
  return JSON.stringify({ cabinet: cabinet.state, panels: drawingStore.state.panels }, null, 2)
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
  localStorage.setItem('MN_Solution_Project', projectPayload())
  app.setStatus('Đã lưu offline vào trình duyệt')
} // End saveOfflineProject

//=================
function exportProjectFile() {
  const blob = new Blob([projectPayload()], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')

  a.href = url
  a.download = 'mn-solution-project.json'
  a.click()

  URL.revokeObjectURL(url)
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
function applyMachinePanelSettings(settings) {
  const defaultThickness = Math.round(Number(settings?.panel?.defaultThickness || 17.4) * 10) / 10
  const backThickness = Math.round(Number(settings?.panel?.backThickness || 10) * 10) / 10

  cabinet.state.panelThickness = defaultThickness
  cabinetInfo.state.info.general.panelThickness = defaultThickness
  cabinetInfo.state.info.back.thickness = backThickness
} // End applyMachinePanelSettings

//=================
function onGlobalKeyDown(event) {
  if (isEditableShortcutTarget(event)) return

  const shortcutText = shortcutEventToText(event)
  const action = findShortcutAction(shortcutText, loadShortcutSettings())

  if (!action) return

  event.preventDefault()
  event.stopPropagation()

  runShortcutAction(action)
} // End onGlobalKeyDown

onMounted(() => {
  const machineSettings = loadAppSettings()

  applyAppSettings(machineSettings)
  applyMachinePanelSettings(machineSettings)
  drawingStore.rebuildZones()
  applyRightPanelWidth(rightPanelWidth.value)
  window.addEventListener('keydown', onGlobalKeyDown, true)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onGlobalKeyDown, true)
  stopRightPanelResize()
})
const props = defineProps({
  commitSha: {
    type: String,
    default: 'local'
  },
  commitName: {
    type: String,
    default: 'local dev'
  }
})
</script>