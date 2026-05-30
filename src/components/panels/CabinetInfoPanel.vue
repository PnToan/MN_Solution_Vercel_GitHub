<template>
  <section class="mn-panel-section compact mn-info-panel">
    <div class="mn-panel-title">MN Solution Info</div>

    <details open>
      <summary>Khung chính</summary>
      <div class="mn-info-grid">
        <label>Rộng<input v-model="info.state.form.width" type="number" step="0.1" /></label>
        <label>Cao<input v-model="info.state.form.height" type="number" step="0.1" /></label>
        <label>Sâu<input v-model="info.state.form.depth" type="number" step="0.1" /></label>
        <label>Dày tấm<input v-model="info.state.form.thickness" type="number" step="0.1" /></label>
      </div>
      <div class="mn-info-checks">
        <label><input v-model="info.state.form.leftSide" type="checkbox" /> Hông trái</label>
        <label><input v-model="info.state.form.rightSide" type="checkbox" /> Hông phải</label>
        <label><input v-model="info.state.form.top" type="checkbox" /> Nóc</label>
        <label><input v-model="info.state.form.bottom" type="checkbox" /> Đáy</label>
        <label><input v-model="info.state.form.topOverlay" type="checkbox" /> Nóc trùm</label>
        <label><input v-model="info.state.form.bottomOverlay" type="checkbox" /> Đáy trùm</label>
      </div>
    </details>

    <details>
      <summary>Hậu</summary>
      <div class="mn-info-checks">
        <label><input v-model="info.state.form.back" type="checkbox" /> Hậu</label>
        <label><input v-model="info.state.form.topBackOverlay" type="checkbox" /> Nóc trùm hậu</label>
        <label><input v-model="info.state.form.bottomBackOverlay" type="checkbox" /> Đáy trùm hậu</label>
      </div>
      <div class="mn-info-grid">
        <label>Rãnh hậu<input v-model="info.state.form.backGrooveDepth" type="number" step="0.1" /></label>
        <label>Dày hậu<input v-model="info.state.form.backThickness" type="number" step="0.1" /></label>
        <label>Lùi hậu<input v-model="info.state.form.backRetreat" type="number" step="0.1" /></label>
        <label>Công thức<input v-model="info.state.form.backSplitFormula" type="text" placeholder="/2 hoặc 400,300" /></label>
      </div>
    </details>

    <details>
      <summary>Chỉ nóc</summary>
      <div class="mn-info-checks">
        <label><input v-model="info.state.form.topRail" type="checkbox" /> Thanh chỉ nóc</label>
        <label><input v-model="info.state.form.topRailInset" type="checkbox" /> Nóc lọt</label>
      </div>
      <div class="mn-info-grid">
        <label>Kích thước<input v-model="info.state.form.topRailHeight" type="number" step="0.1" /></label>
        <label>Âm mặt<input v-model="info.state.form.topRailFaceOffset" type="number" step="0.1" /></label>
      </div>
    </details>

    <details>
      <summary>Diềm tay nắm</summary>
      <div class="mn-info-checks">
        <label><input v-model="info.state.form.handleRail" type="checkbox" /> Diềm tay nắm</label>
      </div>
      <div class="mn-info-grid">
        <label>Số lượng<input v-model="info.state.form.handleRailCount" type="number" step="1" /></label>
        <label>Kích thước<input v-model="info.state.form.handleRailSize" type="number" step="0.1" /></label>
        <label>Âm mặt<input v-model="info.state.form.handleRailFaceOffset" type="number" step="0.1" /></label>
        <label>Thanh sau<input v-model="info.state.form.handleRailBackCount" type="number" step="1" /></label>
        <label>Bổ sung<input v-model="info.state.form.handleRailSupportCount" type="number" step="1" /></label>
      </div>
    </details>

    <details>
      <summary>Thanh chặn cánh</summary>
      <div class="mn-info-checks">
        <label><input v-model="info.state.form.doorStop" type="checkbox" /> Thanh chặn cánh</label>
        <label><input v-model="info.state.form.doorStopHorizontal" type="checkbox" /> Ngang</label>
      </div>
      <div class="mn-info-grid">
        <label>Công thức<input v-model="info.state.form.doorStopFormula" type="text" placeholder="/2 hoặc 300,200" /></label>
        <label>Kích thước<input v-model="info.state.form.doorStopSize" type="number" step="0.1" /></label>
        <label>Âm mặt<input v-model="info.state.form.doorStopFaceOffset" type="number" step="0.1" /></label>
      </div>
    </details>

    <details>
      <summary>Len chân</summary>
      <div class="mn-info-checks">
        <label><input v-model="info.state.form.toeKick" type="checkbox" /> Len chân</label>
        <label><input v-model="info.state.form.toeKickDetached" type="checkbox" /> Len chân rời</label>
        <label><input v-model="info.state.form.toeKickBack" type="checkbox" /> Thanh chân sau</label>
      </div>
      <div class="mn-info-grid">
        <label>Cao len<input v-model="info.state.form.toeKickHeight" type="number" step="0.1" /></label>
        <label>Lùi len<input v-model="info.state.form.toeKickRetreat" type="number" step="0.1" /></label>
        <label>Bổ sung<input v-model="info.state.form.toeKickSupportCount" type="number" step="1" /></label>
      </div>
    </details>

    <details>
      <summary>Nẹp gia giảm / lùi đợt</summary>
      <div class="mn-info-checks">
        <label><input v-model="info.state.form.leftScribeRotate" type="checkbox" /> Xoay nẹp trái</label>
        <label><input v-model="info.state.form.rightScribeRotate" type="checkbox" /> Xoay nẹp phải</label>
      </div>
      <div class="mn-info-grid">
        <label>Nẹp trái<input v-model="info.state.form.leftScribe" type="number" step="0.1" /></label>
        <label>Nẹp phải<input v-model="info.state.form.rightScribe" type="number" step="0.1" /></label>
        <label>Lùi đợt đứng<input v-model="info.state.form.verticalShelfRetreat" type="number" step="0.1" /></label>
        <label>Lùi đợt nằm<input v-model="info.state.form.horizontalShelfRetreat" type="number" step="0.1" /></label>
      </div>
    </details>

    <div class="mn-info-actions">
      <button type="button" @click="applyInfo">Tạo tủ</button>
      <button type="button" @click="previewInfo">Check</button>
      <button type="button" @click="clearInfo">Xóa Info</button>
    </div>

    <div class="mn-status-box" v-if="info.state.lastLayout">
      Box: {{ info.state.lastLayout.box.width }} x {{ info.state.lastLayout.box.depth }} x {{ info.state.lastLayout.box.height }}<br />
      Chi tiết: {{ info.state.lastLayout.panels.length }}
    </div>
    <div class="mn-status-box" v-if="info.state.lastError">{{ info.state.lastError }}</div>
  </section>
</template>

<script setup>
import { useCabinetInfoStore } from '../../stores/useCabinetInfoStore'

const info = useCabinetInfoStore()

//=================
function previewInfo() {
  info.buildPreview()
} // End previewInfo

//=================
function applyInfo() {
  info.applyToDrawing()
} // End applyInfo

//=================
function clearInfo() {
  info.clearCabinetInfo()
} // End clearInfo
</script>

<style scoped>
.mn-info-panel {
  max-height: 58vh;
  overflow: auto;
}

.mn-info-panel details {
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  margin-bottom: 6px;
  padding: 6px;
}

.mn-info-panel summary {
  cursor: pointer;
  font-weight: 600;
  margin-bottom: 6px;
}

.mn-info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.mn-info-grid label,
.mn-info-checks label {
  display: flex;
  flex-direction: column;
  gap: 3px;
  font-size: 11px;
}

.mn-info-checks {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px 8px;
  margin-bottom: 6px;
}

.mn-info-checks label {
  flex-direction: row;
  align-items: center;
}

.mn-info-grid input {
  min-width: 0;
  height: 22px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 4px;
  padding: 2px 5px;
  background: rgba(255, 255, 255, 0.08);
  color: inherit;
}

.mn-info-actions {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 6px;
  margin: 8px 0;
}

.mn-info-actions button {
  height: 26px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.1);
  color: inherit;
  cursor: pointer;
}
</style>
