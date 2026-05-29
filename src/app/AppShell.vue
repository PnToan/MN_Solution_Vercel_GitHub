<template>
  <div class="mn-app" :class="{ 'mn-right-panel-hidden': isRightPanelHidden }">
    <TopBar />
    <LibraryBar />
    <LeftToolbar />
    <DrawingViewport />
    <BottomParams />

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

const drawingStore = useDrawingStore()
const app = useAppStore()
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
function onGlobalKeyDown(event) {
  const isSpace = event.key === ' ' || event.key === 'Spacebar' || event.code === 'Space'

  if (!isSpace) {
    return
  }

  event.preventDefault()
  event.stopPropagation()

  app.setTool('select')
  app.setStatus('Select')
} // End onGlobalKeyDown

onMounted(() => {
  drawingStore.rebuildZones()
  applyRightPanelWidth(rightPanelWidth.value)
  window.addEventListener('keydown', onGlobalKeyDown, true)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onGlobalKeyDown, true)
  stopRightPanelResize()
})
</script>