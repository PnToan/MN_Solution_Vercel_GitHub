<template>
  <aside class="mn-right-panel">
    <section class="mn-box-info-panel">
      <div class="mn-box-info-title">Info</div>

      <div v-if="!activeBox" class="mn-box-empty">
        Hãy chọn Khung tủ
      </div>

      <div v-else class="mn-box-info-body">
        <div class="mn-box-main-title">Thông tin Tủ</div>

        <div class="mn-box-name-row">
          <label class="mn-box-label">Tên Nhóm</label>
          <input
            class="mn-box-name-input"
            type="text"
            :value="activeBox.name || ''"
            @input="onBoxNameInput"
          />
        </div>

        <div class="mn-accordion">
          <div
            v-for="section in sections"
            :key="section.key"
            class="mn-accordion-item"
          >
            <button class="mn-accordion-header" type="button" @click="toggleSection(section.key)">
              <span class="mn-accordion-arrow">{{ openedSections[section.key] ? '▼' : '▶' }}</span>
              <span class="mn-accordion-title">{{ section.title }}</span>
            </button>

            <div v-if="openedSections[section.key]" class="mn-accordion-content">
              <template v-for="field in section.fields" :key="field.key">
                <label v-if="field.type === 'number'" class="mn-info-field">
                  <span>{{ field.label }}</span>
                  <input
                    class="mn-info-input"
                    type="number"
                    :value="getBoxInfoValue(field.key)"
                    @input="onNumberInput(field.key, $event)"
                  />
                </label>

                <label v-else class="mn-info-check">
                  <input
                    type="checkbox"
                    :checked="getBoxInfoValue(field.key)"
                    @change="onCheckInput(field.key, $event)"
                  />
                  <span>{{ field.label }}</span>
                </label>
              </template>
            </div>
          </div>
        </div>
      </div>
    </section>
  </aside>
</template>

<script setup>
import { computed, reactive } from 'vue'
import { useBoxStore } from '../../stores/useBoxStore'

const box = useBoxStore()

const activeBox = computed(() => box.getActiveBox?.() || null)

const openedSections = reactive({
  general: false,
  back: false,
  topTrim: false,
  handleRail: false,
  doorStop: false,
  plinth: false,
  adjustStrip: false,
  shelfInset: false
})

const sections = [
  {
    key: 'general',
    title: 'Thông tin chung',
    fields: [
      { key: 'topOverlay', label: 'Nóc Trùm', type: 'check' },
      { key: 'bottomOverlay', label: 'Đáy Trùm', type: 'check' },
      { key: 'width', label: 'Rộng khung:', type: 'number' },
      { key: 'height', label: 'Cao khung:', type: 'number' },
      { key: 'depth', label: 'Sâu khung:', type: 'number' },
      { key: 'panelThickness', label: 'Độ dày tấm:', type: 'number' },
      { key: 'leftSideEnabled', label: 'Hông trái', type: 'check' },
      { key: 'rightSideEnabled', label: 'Hông Phải', type: 'check' },
      { key: 'topEnabled', label: 'Nóc', type: 'check' },
      { key: 'bottomEnabled', label: 'Đáy', type: 'check' }
    ]
  },
  {
    key: 'back',
    title: 'Hậu',
    fields: [
      { key: 'backGrooveDepth', label: 'Độ Sâu rãnh hậu:', type: 'number' },
      { key: 'backPanelThickness', label: 'Dày tấm hậu:', type: 'number' },
      { key: 'backDivideFormula', label: 'Công thức chia:', type: 'number' },
      { key: 'backTopOverlay', label: 'Nóc trùm hậu', type: 'check' },
      { key: 'backBottomOverlay', label: 'Đáy trùm Hậu', type: 'check' }
    ]
  },
  {
    key: 'topTrim',
    title: 'Thanh Chỉ Nóc',
    fields: [
      { key: 'topTrimInside', label: 'Nóc Lọt', type: 'check' },
      { key: 'topTrimSize', label: 'Kích thước chỉ Nóc:', type: 'number' },
      { key: 'topTrimInset', label: 'Âm mặt:', type: 'number' }
    ]
  },
  {
    key: 'handleRail',
    title: 'Diềm Tay Nắm',
    fields: [
      { key: 'handleRailCount', label: 'Số Lượng:', type: 'number' },
      { key: 'handleRailSize', label: 'Kích thước:', type: 'number' },
      { key: 'handleRailInset', label: 'Âm mặt:', type: 'number' },
      { key: 'handleRailBackCount', label: 'Số lượng Thanh sau:', type: 'number' },
      { key: 'handleRailExtraCount', label: 'SL thanh Bổ Sung:', type: 'number' }
    ]
  },
  {
    key: 'doorStop',
    title: 'Thanh Chặn Cánh',
    fields: [
      { key: 'doorStopDivideFormula', label: 'Công thức chia:', type: 'number' },
      { key: 'doorStopSize', label: 'Kích thước:', type: 'number' },
      { key: 'doorStopHorizontal', label: 'Ngang', type: 'check' },
      { key: 'doorStopInset', label: 'Âm mặt:', type: 'number' }
    ]
  },
  {
    key: 'plinth',
    title: 'Len Chân',
    fields: [
      { key: 'plinthSeparate', label: 'Len chân rời', type: 'check' },
      { key: 'plinthHeight', label: 'Cao Len Chân:', type: 'number' },
      { key: 'plinthInset', label: 'Lùi Len chân:', type: 'number' },
      { key: 'plinthBackRail', label: 'Thanh chân sau', type: 'check' },
      { key: 'plinthExtraRail', label: 'Thanh chân Bổ sung:', type: 'number' }
    ]
  },
  {
    key: 'adjustStrip',
    title: 'Nẹp Gia Giảm',
    fields: [
      { key: 'leftAdjustStrip', label: 'Nẹp trái:', type: 'number' },
      { key: 'leftAdjustStripRotate', label: 'Xoay trái', type: 'check' },
      { key: 'rightAdjustStrip', label: 'Nẹp Phải:', type: 'number' },
      { key: 'rightAdjustStripRotate', label: 'Xoay phải', type: 'check' }
    ]
  },
  {
    key: 'shelfInset',
    title: 'Lùi Đợt',
    fields: [
      { key: 'verticalShelfInset', label: 'Lùi đợt Đứng:', type: 'number' },
      { key: 'horizontalShelfInset', label: 'Lùi đợt nằm:', type: 'number' }
    ]
  }
]

const defaultBoxInfo = {
  topOverlay: false,
  bottomOverlay: false,
  leftSideEnabled: true,
  rightSideEnabled: true,
  topEnabled: true,
  bottomEnabled: true,
  backGrooveDepth: 0,
  backPanelThickness: 0,
  backDivideFormula: 0,
  backTopOverlay: false,
  backBottomOverlay: false,
  topTrimInside: false,
  topTrimSize: 0,
  topTrimInset: 0,
  handleRailCount: 0,
  handleRailSize: 0,
  handleRailInset: 0,
  handleRailBackCount: 0,
  handleRailExtraCount: 0,
  doorStopDivideFormula: 0,
  doorStopSize: 0,
  doorStopHorizontal: false,
  doorStopInset: 0,
  plinthSeparate: false,
  plinthHeight: 0,
  plinthInset: 0,
  plinthBackRail: false,
  plinthExtraRail: 0,
  leftAdjustStrip: 0,
  leftAdjustStripRotate: false,
  rightAdjustStrip: 0,
  rightAdjustStripRotate: false,
  verticalShelfInset: 0,
  horizontalShelfInset: 0
}

//=================
function ensureBoxInfo() {
  if (!activeBox.value) return null

  if (!activeBox.value.info) {
    activeBox.value.info = { ...defaultBoxInfo }
  }

  return activeBox.value.info
} // End ensureBoxInfo

//=================
function getBoxInfoValue(key) {
  if (!activeBox.value) return ''

  if (key === 'width') return Math.round(Number(activeBox.value.width || 0))
  if (key === 'height') return Math.round(Number(activeBox.value.height || 0))
  if (key === 'depth') return Math.round(Number(activeBox.value.depth || 0))
  if (key === 'panelThickness') return Math.round(Number(activeBox.value.panelThickness || 0))

  const info = ensureBoxInfo()

  return info?.[key] ?? defaultBoxInfo[key] ?? 0
} // End getBoxInfoValue

//=================
function onBoxNameInput(event) {
  if (!activeBox.value) return

  activeBox.value.name = event?.target?.value || ''
} // End onBoxNameInput

//=================
function onNumberInput(key, event) {
  if (!activeBox.value) return

  const rawValue = Number(event?.target?.value)

  if (!Number.isFinite(rawValue)) return

  const value = Math.round(rawValue)

  if (key === 'width' || key === 'height' || key === 'depth' || key === 'panelThickness') {
    box.setBoxSize(activeBox.value.id, key, value)
    return
  }

  const info = ensureBoxInfo()

  if (!info) return

  info[key] = value
} // End onNumberInput

//=================
function onCheckInput(key, event) {
  const info = ensureBoxInfo()

  if (!info) return

  info[key] = Boolean(event?.target?.checked)
} // End onCheckInput

//=================
function toggleSection(key) {
  openedSections[key] = !openedSections[key]
} // End toggleSection
</script>

<style scoped>
.mn-right-panel {
  width: 224px;
  min-width: 224px;
  height: 100%;
  background: #202020;
  border-left: 1px solid #3a3a3a;
  color: #f2f2f2;
  box-sizing: border-box;
  padding: 8px;
  overflow-y: auto;
}

.mn-box-info-panel {
  width: 100%;
}

.mn-box-info-title {
  font-size: 12px;
  text-transform: uppercase;
  margin-bottom: 8px;
  color: #ffffff;
}

.mn-box-empty {
  border: 1px solid #444;
  border-radius: 4px;
  padding: 12px;
  color: #ffffff;
  background: #1b1b1b;
  font-size: 13px;
}

.mn-box-info-body {
  background: #f2f2f2;
  color: #000000;
  border: 2px solid #000000;
  padding: 8px;
  min-height: calc(100vh - 90px);
  box-sizing: border-box;
}

.mn-box-main-title {
  height: 24px;
  line-height: 22px;
  border: 2px solid #000000;
  text-align: center;
  font-weight: 700;
  font-size: 15px;
  margin-bottom: 8px;
  box-sizing: border-box;
}

.mn-box-name-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
}

.mn-box-label {
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.mn-box-name-input {
  flex: 1;
  height: 20px;
  border: 2px solid #000000;
  background: #ffffff;
  color: #000000;
  padding: 0 4px;
  box-sizing: border-box;
}

.mn-accordion-item {
  margin-bottom: 6px;
}

.mn-accordion-header {
  width: 100%;
  height: 22px;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0;
  border: none;
  background: transparent;
  color: #000000;
  cursor: pointer;
}

.mn-accordion-arrow {
  width: 18px;
  font-size: 14px;
  line-height: 20px;
}

.mn-accordion-title {
  flex: 1;
  height: 22px;
  line-height: 19px;
  border: 2px solid #000000;
  background: #ffffff;
  font-size: 12px;
  font-weight: 700;
  text-align: left;
  padding: 0 6px;
  box-sizing: border-box;
}

.mn-accordion-content {
  border-left: 2px solid #000000;
  border-right: 2px solid #000000;
  border-bottom: 2px solid #000000;
  background: #ffffff;
  padding: 6px;
  margin-left: 22px;
  box-sizing: border-box;
}

.mn-info-field {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  font-size: 12px;
  margin-bottom: 5px;
}

.mn-info-input {
  width: 72px;
  height: 20px;
  border: 1px solid #000000;
  background: #ffffff;
  color: #000000;
  padding: 0 4px;
  box-sizing: border-box;
}

.mn-info-check {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  margin-bottom: 5px;
}

.mn-info-check input {
  width: 14px;
  height: 14px;
}
</style>