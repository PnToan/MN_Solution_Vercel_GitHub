<template>
  <aside class="mn-left-toolbar">
    <div class="mn-tool-group">
      <template v-for="tool in tools" :key="tool.id">
        <div v-if="tool.type === 'separator'" class="mn-tool-separator"></div>
        <button
          v-else
          type="button"
          class="mn-tool-btn"
          :class="{ active: app.state.currentTool === tool.id }"
          :title="tool.label"
          @pointerdown.stop.prevent="selectTool(tool.id)"
          @click.stop.prevent="selectTool(tool.id)"
        >
          <img :src="tool.icon" :alt="tool.label" class="mn-tool-icon" />
        </button>
      </template>
    </div>
  </aside>
</template>

<script setup>
import { useAppStore } from '../../stores/useAppStore'
import { useDrawingStore } from '../../stores/useDrawingStore'
import { isEditPanelTool } from '../../core/tools/editPanelTool'

const app = useAppStore()
const drawing = useDrawingStore()

const tools = [
  { id: 'select', label: 'Chọn', icon: '/icons/toolbar/select.svg' },
  { id: 'box', label: 'Box', icon: '/icons/toolbar/rect.svg' },
  { id: 'panel', label: 'Vẽ Tấm', icon: '/icons/toolbar/panel.svg' },
  { id: 'move', label: 'Di chuyển', icon: '/icons/toolbar/move.svg' },
  { id: 'dimensions', label: 'Dimensions', icon: '/icons/toolbar/measure.svg' },
  { id: 'separator-edit-panel', type: 'separator' },
  { id: 'editPanel', label: 'Edit Panel', icon: '/icons/toolbar/edit-panel.svg' }
]

//=================
function selectTool(toolId) {
  app.setTool(toolId)

  if (toolId === 'select') {
    drawing.clearPanelEdit()
    app.setStatus('Select')
    return
  }

  if (isEditPanelTool(toolId)) {
    const context = drawing.startPanelEdit()

    if (!context) {
      app.setStatus('Edit Panel: chọn 1 tấm trước')
      return
    }

    app.setView(context.viewKey)
    app.setStatus(`Edit Panel: ${context.panelName} | ${context.faceLabel} | ${context.rearLabel}`)
    return
  }
} // End selectTool
</script>