<template>
  <section class="mn-bottom-params">
    <div class="mn-bottom-param-group">
      <label class="mn-bottom-param-label">Rộng</label>
      <input
        class="mn-bottom-param-input"
        type="number"
        :value="activeWidth"
        @change="onParamChange('width', $event)"
      />
    </div>

    <div class="mn-bottom-param-group">
      <label class="mn-bottom-param-label">Sâu</label>
      <input
        class="mn-bottom-param-input"
        type="number"
        :value="activeDepth"
        @change="onParamChange('depth', $event)"
      />
    </div>

    <div class="mn-bottom-param-group">
      <label class="mn-bottom-param-label">Cao</label>
      <input
        class="mn-bottom-param-input"
        type="number"
        :value="activeHeight"
        @change="onParamChange('height', $event)"
      />
    </div>

    <div class="mn-bottom-param-group">
      <label class="mn-bottom-param-label">Dày tấm</label>
      <input
        class="mn-bottom-param-input"
        type="number"
        :value="activePanelThickness"
        @change="onParamChange('panelThickness', $event)"
      />
    </div>

    <div class="mn-bottom-param-group">
      <label class="mn-bottom-param-label">Đơn vị</label>
      <select class="mn-bottom-param-input" :value="activeUnit" @change="onUnitChange">
        <option value="mm">mm</option>
        <option value="cm">cm</option>
        <option value="m">m</option>
      </select>
    </div>

    <div class="mn-bottom-param-status">
      {{ app.state.status }} <span v-if="app.state.commandBuffer"> | Lệnh: {{ app.state.commandBuffer }}</span>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { useAppStore } from '../../stores/useAppStore'
import { useCabinetStore } from '../../stores/useCabinetStore'
import { useDrawingStore } from '../../stores/useDrawingStore'
import { useBoxStore } from '../../stores/useBoxStore'

const app = useAppStore()
const cabinet = useCabinetStore()
const drawing = useDrawingStore()
const box = useBoxStore()

const activeBox = computed(() => box.getActiveBox?.() || null)
const activeWidth = computed(() => activeBox.value?.width ?? cabinet.state.width)
const activeDepth = computed(() => activeBox.value?.depth ?? cabinet.state.depth)
const activeHeight = computed(() => activeBox.value?.height ?? cabinet.state.height)
const activePanelThickness = computed(() => activeBox.value?.panelThickness ?? cabinet.state.panelThickness)
const activeUnit = computed(() => activeBox.value?.unit ?? cabinet.state.unit)

//=================
function normalizeInputValue(event) {
  const rawValue = Number(event?.target?.value)

  if (!Number.isFinite(rawValue) || rawValue <= 0) return null

  return rawValue
} // End normalizeInputValue

//=================
function onParamChange(key, event) {
  const value = normalizeInputValue(event)

  if (value === null) return

  if (activeBox.value) {
    box.setBoxSize(activeBox.value.id, key, value)
    app.setStatus(`Đã cập nhật ${activeBox.value.name}`)
    return
  }

  cabinet.setSize(key, value)
  drawing.rebuildZones()
  app.setStatus('Đã cập nhật kích thước tủ')
} // End onParamChange

//=================
function onUnitChange(event) {
  const unit = event?.target?.value || 'mm'

  if (activeBox.value) {
    activeBox.value.unit = unit
    app.setStatus(`Đã cập nhật đơn vị ${activeBox.value.name}`)
    return
  }

  cabinet.setUnit(unit)
  app.setStatus('Đã cập nhật đơn vị tủ')
} // End onUnitChange
</script>