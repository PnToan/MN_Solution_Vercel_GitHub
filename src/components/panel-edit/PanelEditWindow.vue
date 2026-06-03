<template>
  <section class="mn-panel-edit-window">
    <header class="mn-panel-edit-header">
      <div class="mn-panel-edit-tools">
        <button
          v-for="tool in panelEditTools"
          :key="tool.id"
          type="button"
          class="mn-panel-edit-tool-btn"
          :class="{ active: currentShapeTool === tool.id || currentTool === tool.id }"
          :title="tool.label"
          @pointerdown.stop.prevent="emitSelectTool(tool.id)"
          @click.stop.prevent="emitSelectTool(tool.id)"
        >
          <img :src="tool.icon" :alt="tool.label" class="mn-panel-edit-tool-icon" />
        </button>
      </div>
      <div class="mn-panel-edit-face-switch">
        <button
          v-for="face in activeContext.faceOptions"
          :key="face.id"
          type="button"
          class="mn-panel-edit-face-btn"
          :class="{ active: activeContext.faceSide === face.id }"
          @pointerdown.stop.prevent="emitSelectFace(face.id)"
          @click.stop.prevent="emitSelectFace(face.id)"
        >
          {{ face.label }}
        </button>
      </div>
      <div class="mn-panel-edit-title">
        {{ activeContext.panelName }} · {{ activeContext.faceLabel }} · {{ activeContext.axesText }} · {{ activeContext.rearLabel }}
      </div>
      <button type="button" class="mn-panel-edit-apply" @click.stop.prevent="emitApply">Áp dụng</button>
    </header>

    <canvas
      ref="canvasRef"
      tabindex="0"
      class="mn-panel-edit-canvas"
      :class="canvasCursorClass"
      @pointerdown.stop.prevent="emitPanelPointerDown"
      @pointermove.stop.prevent="emitPanelPointerMove"
      @pointerup.stop.prevent="emitPanelPointerUp"
      @pointerleave.stop.prevent="emitPanelPointerUp"
      @wheel.stop.prevent="emitPanelWheel"
      @contextmenu.prevent
    />

    <div
      v-if="pendingAction"
      class="mn-panel-edit-action-dialog"
      @pointerdown.stop.prevent
      @click.stop.prevent
    >
      <button type="button" class="mn-panel-edit-action-btn" @click.stop.prevent="emitConfirmAction('none')">None</button>
      <button type="button" class="mn-panel-edit-action-btn danger" @click.stop.prevent="emitConfirmAction('cutout')">Khấu</button>
    </div>

    <footer class="mn-panel-edit-footer">
      {{ footerText }}
    </footer>
  </section>
</template>

<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps({
  activeContext: { type: Object, required: true },
  panelEditTools: { type: Array, required: true },
  currentShapeTool: { type: String, default: null },
  currentTool: { type: String, default: null },
  canvasCursorClass: { type: String, default: '' },
  pendingAction: { type: Object, default: null },
  footerText: { type: String, default: '' },
  setCanvasRef: { type: Function, required: true }
})

const emit = defineEmits([
  'select-tool',
  'select-face',
  'apply',
  'panel-pointer-down',
  'panel-pointer-move',
  'panel-pointer-up',
  'panel-wheel',
  'confirm-action'
])

const canvasRef = ref(null)

//=================
function syncCanvasRef() {
  props.setCanvasRef(canvasRef.value)
} // End syncCanvasRef

//=================
function emitSelectTool(toolId) {
  emit('select-tool', toolId)
} // End emitSelectTool

//=================
function emitSelectFace(faceId) {
  emit('select-face', faceId)
} // End emitSelectFace

//=================
function emitApply() {
  emit('apply')
} // End emitApply

//=================
function emitPanelPointerDown(event) {
  emit('panel-pointer-down', event)
} // End emitPanelPointerDown

//=================
function emitPanelPointerMove(event) {
  emit('panel-pointer-move', event)
} // End emitPanelPointerMove

//=================
function emitPanelPointerUp(event) {
  emit('panel-pointer-up', event)
} // End emitPanelPointerUp

//=================
function emitPanelWheel(event) {
  emit('panel-wheel', event)
} // End emitPanelWheel

//=================
function emitConfirmAction(action) {
  emit('confirm-action', action)
} // End emitConfirmAction

onMounted(() => {
  nextTick(syncCanvasRef)
})

watch(canvasRef, syncCanvasRef)

onBeforeUnmount(() => {
  props.setCanvasRef(null)
})
</script>

<style scoped>
.mn-panel-edit-canvas.mn-cursor-move {
  cursor: url("data:image/svg+xml,%3Csvg width='32' height='32' viewBox='0 0 32 32' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='4' y='4' width='24' height='24' rx='4' fill='%23111111' stroke='%23ffffff' stroke-width='1.8'/%3E%3Cpath d='M16 7 V25 M7 16 H25' stroke='%23ffffff' stroke-width='2' stroke-linecap='round'/%3E%3Cpath d='M16 7 L12.5 10.5 M16 7 L19.5 10.5 M16 25 L12.5 21.5 M16 25 L19.5 21.5 M7 16 L10.5 12.5 M7 16 L10.5 19.5 M25 16 L21.5 12.5 M25 16 L21.5 19.5' stroke='%23ffffff' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E") 16 16, move;
}

.mn-panel-edit-canvas.mn-cursor-crosshair {
  cursor: crosshair;
}

.mn-panel-edit-window {
  position: absolute;
  inset: 18px;
  z-index: 25;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--mn-border-main);
  border-radius: 8px;
  background: var(--mn-bg-panel);
  box-shadow: 0 12px 36px rgba(0, 0, 0, .32);
  overflow: hidden;
}

.mn-panel-edit-header {
  height: 42px;
  display: grid;
  grid-template-columns: auto auto 1fr 92px;
  align-items: center;
  gap: 8px;
  padding: 5px 8px;
  border-bottom: 1px solid var(--mn-border-main);
  background: var(--mn-bg-top);
}

.mn-panel-edit-tools {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  overflow: hidden;
}

.mn-panel-edit-tool-btn {
  width: 32px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 1px solid var(--mn-border-main);
  border-radius: 5px;
  background: var(--mn-bg-panel-soft);
  color: var(--mn-text-main);
  font-size: 11px;
  cursor: pointer;
  white-space: nowrap;
}

.mn-panel-edit-tool-btn:hover,
.mn-panel-edit-tool-btn.active {
  border-color: var(--mn-accent);
  color: var(--mn-accent);
}

.mn-panel-edit-tool-icon {
  width: 15px;
  height: 15px;
  object-fit: contain;
  pointer-events: none;
}

.mn-panel-edit-face-switch {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.mn-panel-edit-face-btn {
  height: 28px;
  padding: 0 10px;
  border: 1px solid var(--mn-border-main);
  border-radius: 5px;
  background: var(--mn-bg-panel-soft);
  color: var(--mn-text-main);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}

.mn-panel-edit-face-btn:hover,
.mn-panel-edit-face-btn.active {
  border-color: var(--mn-accent);
  color: var(--mn-accent);
}

.mn-panel-edit-title {
  min-width: 0;
  overflow: hidden;
  color: var(--mn-text-sub);
  font-size: 11px;
  text-align: right;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mn-panel-edit-apply {
  height: 28px;
  border: 1px solid var(--mn-accent);
  border-radius: 5px;
  background: var(--mn-accent);
  color: #ffffff;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.mn-panel-edit-canvas {
  width: 100%;
  height: calc(100% - 72px);
  display: block;
  background: var(--mn-bg-canvas);
  touch-action: none;
  cursor: crosshair;
}

.mn-cursor-panel-tape {
  cursor: url("data:image/svg+xml,%3Csvg width='32' height='32' viewBox='0 0 32 32' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M4 2 L4 23 L9 18 L13 29 L17 27 L13 16 L21 16 Z' fill='white' stroke='%23111111' stroke-width='1.4' stroke-linejoin='round'/%3E%3Cg transform='translate(15 21) rotate(-18)'%3E%3Crect x='0' y='0' width='15' height='5' rx='1' fill='%23fff7c2' stroke='%23111111' stroke-width='1'/%3E%3Cpath d='M3 0 L3 3 M6 0 L6 2 M9 0 L9 3 M12 0 L12 2' stroke='%23111111' stroke-width='1'/%3E%3C/g%3E%3C/svg%3E") 4 2, crosshair;
}

.mn-cursor-panel-rect {
  cursor: url("data:image/svg+xml,%3Csvg width='32' height='32' viewBox='0 0 32 32' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M4 2 L4 22 L9 17 L13 27 L17 25 L13 15 L20 15 Z' fill='white' stroke='%23111111' stroke-width='1.4' stroke-linejoin='round'/%3E%3Crect x='13' y='21' width='14' height='8' rx='1.5' fill='%23dbefff' stroke='%230077CC' stroke-width='1.5'/%3E%3C/svg%3E") 4 2, crosshair;
}

.mn-cursor-panel-circle {
  cursor: url("data:image/svg+xml,%3Csvg width='32' height='32' viewBox='0 0 32 32' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M4 2 L4 22 L9 17 L13 27 L17 25 L13 15 L20 15 Z' fill='white' stroke='%23111111' stroke-width='1.4' stroke-linejoin='round'/%3E%3Ccircle cx='22' cy='24' r='6' fill='%23ffffff' stroke='%230077CC' stroke-width='1.7'/%3E%3Ccircle cx='22' cy='24' r='1.5' fill='%230077CC'/%3E%3C/svg%3E") 4 2, crosshair;
}

.mn-cursor-panel-line {
  cursor: url("data:image/svg+xml,%3Csvg width='32' height='32' viewBox='0 0 32 32' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M4 2 L4 22 L9 17 L13 27 L17 25 L13 15 L20 15 Z' fill='white' stroke='%23111111' stroke-width='1.4' stroke-linejoin='round'/%3E%3Cline x1='14' y1='27' x2='28' y2='20' stroke='%230077CC' stroke-width='2.4' stroke-linecap='round'/%3E%3Ccircle cx='14' cy='27' r='2' fill='%23ffffff' stroke='%230077CC' stroke-width='1.4'/%3E%3Ccircle cx='28' cy='20' r='2' fill='%23ffffff' stroke='%230077CC' stroke-width='1.4'/%3E%3C/svg%3E") 4 2, crosshair;
}

.mn-panel-edit-action-dialog {
  position: absolute;
  left: 50%;
  top: 58px;
  z-index: 30;
  width: 150px;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--mn-border-main);
  border-radius: 7px;
  background: var(--mn-bg-panel);
  box-shadow: 0 10px 24px rgba(0, 0, 0, .24);
}

.mn-panel-edit-action-btn {
  height: 32px;
  border: 0;
  border-bottom: 1px solid var(--mn-border-main);
  background: var(--mn-bg-panel);
  color: var(--mn-text-main);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.mn-panel-edit-action-btn:last-child {
  border-bottom: 0;
}

.mn-panel-edit-action-btn:hover {
  background: var(--mn-bg-panel-soft);
}

.mn-panel-edit-action-btn.danger {
  color: #d90000;
}

.mn-panel-edit-footer {
  height: 30px;
  display: flex;
  align-items: center;
  padding: 0 12px;
  border-top: 1px solid var(--mn-border-main);
  background: var(--mn-bg-top);
  color: var(--mn-text-main);
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mn-panel-edit-canvas.mn-cursor-select {
  cursor: url("data:image/svg+xml,%3Csvg width='32' height='32' viewBox='0 0 32 32' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M4 2 L4 23 L9 18 L13 29 L17 27 L13 16 L21 16 Z' fill='white' stroke='%23111111' stroke-width='1.4' stroke-linejoin='round'/%3E%3Ccircle cx='23' cy='24' r='4' fill='%23ffffff' stroke='%230077CC' stroke-width='1.5'/%3E%3C/svg%3E") 4 2, default;
}

</style>
