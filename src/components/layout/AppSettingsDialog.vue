<template>
  <div class="mn-settings-overlay" @pointerdown.self="emitClose">
    <section class="mn-settings-dialog" role="dialog" aria-modal="true" aria-label="MN Solution Settings">
      <header class="mn-settings-header">
        <div class="mn-settings-brand">
          <div class="mn-settings-logo">mn</div>
          <div>
            <div class="mn-settings-title">MN_Solution_Setup</div>
            <div class="mn-settings-subtitle">Bảng cài đặt chính</div>
          </div>
        </div>

        <div class="mn-settings-actions">
          <button class="mn-settings-btn" type="button" @click="saveCurrentSettings">Lưu</button>
          <button class="mn-settings-btn" type="button" @click="emitClose">Đóng</button>
        </div>
      </header>

      <div class="mn-settings-main-title">Settings</div>

      <div class="mn-settings-layout">
        <aside class="mn-settings-tabs-wrap">
          <div class="mn-settings-tabs-title">Tính Năng</div>

          <div class="mn-settings-tabs" role="tablist" aria-label="MN Solution settings tabs">
            <button
              v-for="tab in tabs"
              :key="tab.id"
              class="mn-settings-tab"
              :class="{ active: activeTabId === tab.id }"
              type="button"
              role="tab"
              :aria-selected="activeTabId === tab.id ? 'true' : 'false'"
              @click="setActiveTab(tab.id)"
            >
              {{ tab.label }}
            </button>
          </div>
        </aside>

        <main class="mn-settings-content-wrap">
          <div class="mn-settings-content-title">Bảng Cài Đặt</div>

          <div class="mn-settings-panel" role="tabpanel">
            <section v-if="activeTabId === 'general'" class="mn-settings-section">
              <h2>Cài đặt chung</h2>

              <div class="mn-settings-grid">
                <div class="mn-settings-field">
                  <label class="mn-settings-label" for="mn_setting_font">Font</label>
                  <select id="mn_setting_font" v-model="form.font" class="mn-settings-control" @change="applyCurrentSettings">
                    <option value="arial">Arial</option>
                    <option value="timesNewRoman">Times New Roman</option>
                    <option value="tahoma">Tahoma</option>
                  </select>
                </div>

                <div class="mn-settings-field">
                  <label class="mn-settings-label" for="mn_setting_mode">Chế độ</label>
                  <select id="mn_setting_mode" v-model="form.mode" class="mn-settings-control" @change="applyCurrentSettings">
                    <option value="light">Sáng</option>
                    <option value="dark">Tối</option>
                  </select>
                </div>

                <div class="mn-settings-field">
                  <label class="mn-settings-label" for="mn_setting_canvas_bg">Màu nền canvas</label>
                  <select id="mn_setting_canvas_bg" v-model="form.canvasBackground" class="mn-settings-control" @change="applyCurrentSettings">
                    <option value="white">Trắng</option>
                    <option value="gray">Xám - rgb(169,169,169)</option>
                    <option value="yellow">Vàng - rgb(255,255,240)</option>
                  </select>
                </div>
              </div>
            </section>

            <section v-if="activeTabId === 'general'" class="mn-settings-section">
              <h2>Nhập / Xuất dữ liệu</h2>

              <div class="mn-settings-row">
                <button class="mn-settings-btn mn-settings-btn-primary" type="button" @click="loadDefaultSettings">Load Setting</button>
                <button class="mn-settings-btn mn-settings-btn-primary" type="button" @click="importSettings">Nhập Setting</button>
                <button class="mn-settings-btn mn-settings-btn-primary" type="button" @click="exportSettings">Xuất nesting</button>
              </div>

              <p class="mn-settings-hint">Load Setting: đưa về mặc định. Nhập/Xuất: dùng file .json cho setting chung và phím tắt.</p>
            </section>

            <template v-if="activeTabId === 'shortcut'">
              <section class="mn-settings-section mn-shortcut-section">
                <h2>Cài đặt Phím tắt</h2>

                <div class="mn-shortcut-filter-row">
                  <label class="mn-settings-label" for="mn_shortcut_filter">Tìm kiếm chức năng</label>
                  <input
                    id="mn_shortcut_filter"
                    v-model="shortcutFilter"
                    class="mn-settings-control"
                    type="text"
                    placeholder="Nhập tên chức năng..."
                  />
                </div>

                <div class="mn-shortcut-layout">
                  <div class="mn-shortcut-left">
                    <div class="mn-shortcut-title">Function</div>

                    <div class="mn-shortcut-function-list">
                      <button
                        v-for="item in filteredShortcutFunctions"
                        :key="item.id"
                        class="mn-shortcut-function"
                        :class="{ active: selectedShortcutId === item.id }"
                        type="button"
                        @click="selectShortcutFunction(item.id)"
                      >
                        <span>{{ item.group }}/{{ item.label }}</span>
                        <strong v-if="shortcutSettings[item.id]?.length">{{ shortcutSettings[item.id].join(', ') }}</strong>
                      </button>
                    </div>
                  </div>

                  <div class="mn-shortcut-right">
                    <div class="mn-shortcut-title">Add Shortcut</div>

                    <div class="mn-shortcut-add-row">
                      <input
                        v-model="newShortcutText"
                        class="mn-settings-control"
                        type="text"
                        placeholder="Bấm tổ hợp phím..."
                        @keydown.prevent.stop="captureShortcut"
                      />
                      <button class="mn-shortcut-icon-btn" type="button" @click="addShortcut">+</button>
                    </div>

                    <div class="mn-shortcut-title assigned">Assigned</div>

                    <div class="mn-shortcut-assigned-list">
                      <div v-if="assignedShortcuts.length === 0" class="mn-shortcut-empty">Chưa có phím tắt.</div>

                      <div v-for="shortcut in assignedShortcuts" :key="shortcut" class="mn-shortcut-assigned-item">
                        <span>{{ shortcut }}</span>
                        <button class="mn-shortcut-icon-btn" type="button" @click="removeShortcut(shortcut)">-</button>
                      </div>
                    </div>

                    <button class="mn-settings-btn mn-shortcut-reset" type="button" @click="resetAllShortcuts">Reset All</button>
                  </div>
                </div>
              </section>
            </template>

            <template v-if="activeTabId !== 'general' && activeTabId !== 'shortcut'">
              <section class="mn-settings-section">
                <h2>{{ activeTab.label }}</h2>
                <p>{{ activeTab.description }}</p>
              </section>

              <section class="mn-settings-section">
                <h2>Thông tin thiết lập</h2>
                <p>Tab này đang được tạo nền tảng giao diện. Thông số chi tiết sẽ bổ sung theo từng chức năng ở bước sau.</p>
              </section>
            </template>
          </div>
        </main>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import {
  applyAppSettings,
  exportAppSettings,
  importAppSettingsFromFile,
  loadAppSettings,
  resetAppSettings,
  saveAppSettings
} from '../../core/settings/app-settings'
import {
  SHORTCUT_FUNCTIONS,
  hasShortcutConflict,
  normalizeShortcutSettings,
  resetShortcutSettings,
  saveShortcutSettings,
  shortcutEventToText
} from '../../core/settings/shortcut-settings'

const emit = defineEmits(['close'])

const tabs = [
  { id: 'general', label: 'Cài đặt chung', description: 'Thiết lập chung cho toàn bộ app.' },
  { id: 'shortcut', label: 'Cài đặt Phím tắt', description: 'Thiết lập hệ phím tắt thao tác nhanh.' },
  { id: 'panel', label: 'Panel', description: 'Thiết lập thông số panel.' },
  { id: 'camLock', label: 'Cam chốt', description: 'Thiết lập thông số cam chốt.' },
  { id: 'tenon', label: 'Mộng', description: 'Thiết lập thông số mộng.' },
  { id: 'pilotDrill', label: 'Khoan mồi', description: 'Thiết lập khoan mồi.' },
  { id: 'shelfPin', label: 'Chốt đợt', description: 'Thiết lập chốt đợt.' },
  { id: 'amDuong', label: 'Khấu âm dương', description: 'Thiết lập khấu âm dương.' },
  { id: 'hinge', label: 'Bản lề', description: 'Thiết lập bản lề.' },
  { id: 'edgeBanding', label: 'Nẹp dán cạnh', description: 'Thiết lập nẹp dán cạnh.' },
  { id: 'groove', label: 'Rãnh', description: 'Thiết lập rãnh.' },
  { id: 'label', label: 'Tem Nhãn', description: 'Thiết lập tem nhãn.' },
  { id: 'postProcessor', label: 'Post processor', description: 'Thiết lập post processor.' }
]

const loadedSettings = loadAppSettings()
const activeTabId = ref('general')
const form = reactive(loadedSettings)
const shortcutSettings = reactive(normalizeShortcutSettings(loadedSettings.shortcuts))
const selectedShortcutId = ref(SHORTCUT_FUNCTIONS[0]?.id || '')
const newShortcutText = ref('')
const shortcutFilter = ref('')

const activeTab = computed(() => tabs.find(tab => tab.id === activeTabId.value) || tabs[0])
const selectedShortcutFunction = computed(() => SHORTCUT_FUNCTIONS.find(item => item.id === selectedShortcutId.value) || SHORTCUT_FUNCTIONS[0])
const assignedShortcuts = computed(() => shortcutSettings[selectedShortcutId.value] || [])
const filteredShortcutFunctions = computed(() => {
  const text = shortcutFilter.value.trim().toLowerCase()
  if (!text) return SHORTCUT_FUNCTIONS

  return SHORTCUT_FUNCTIONS.filter(item => `${item.group}/${item.label}`.toLowerCase().includes(text))
})

//=================
function syncShortcutSettings(settings) {
  Object.keys(shortcutSettings).forEach(key => {
    delete shortcutSettings[key]
  })

  const normalized = normalizeShortcutSettings(settings)
  Object.keys(normalized).forEach(key => {
    shortcutSettings[key] = normalized[key]
  })
} // End syncShortcutSettings

//=================
function currentSettingsPayload() {
  return {
    font: form.font,
    mode: form.mode,
    canvasBackground: form.canvasBackground,
    shortcuts: normalizeShortcutSettings(shortcutSettings)
  }
} // End currentSettingsPayload

//=================
function syncForm(settings) {
  form.font = settings.font
  form.mode = settings.mode
  form.canvasBackground = settings.canvasBackground
  syncShortcutSettings(settings.shortcuts)
} // End syncForm

//=================
function setActiveTab(tabId) {
  activeTabId.value = tabId
} // End setActiveTab

//=================
function applyCurrentSettings() {
  const savedSettings = saveAppSettings(currentSettingsPayload())
  syncShortcutSettings(savedSettings.shortcuts)
  applyAppSettings(savedSettings)
} // End applyCurrentSettings

//=================
function saveCurrentSettings() {
  applyCurrentSettings()
} // End saveCurrentSettings

//=================
function loadDefaultSettings() {
  const defaultSettings = resetAppSettings()
  syncForm(defaultSettings)
  applyAppSettings(defaultSettings)
} // End loadDefaultSettings

//=================
async function importSettings() {
  try {
    const importedSettings = await importAppSettingsFromFile()
    const savedSettings = saveAppSettings(importedSettings)
    syncForm(savedSettings)
    applyAppSettings(savedSettings)
  } catch (error) {
    if (error && error.message === 'NO_FILE_SELECTED') return
    alert('File setting không hợp lệ.')
  }
} // End importSettings

//=================
function exportSettings() {
  exportAppSettings(currentSettingsPayload())
} // End exportSettings

//=================
function selectShortcutFunction(functionId) {
  selectedShortcutId.value = functionId
  newShortcutText.value = ''
} // End selectShortcutFunction

//=================
function captureShortcut(event) {
  const shortcut = shortcutEventToText(event)
  if (!shortcut) return

  newShortcutText.value = shortcut
} // End captureShortcut

//=================
function addShortcut() {
  const target = selectedShortcutFunction.value
  const shortcut = newShortcutText.value.trim()
  if (!target || !shortcut) return

  const conflict = hasShortcutConflict(target.id, shortcut, shortcutSettings)
  if (conflict) {
    alert(`Phím tắt này đã dùng cho: ${conflict.group}/${conflict.label}`)
    return
  }

  if (!Array.isArray(shortcutSettings[target.id])) shortcutSettings[target.id] = []
  if (!shortcutSettings[target.id].includes(shortcut)) shortcutSettings[target.id].push(shortcut)

  saveShortcutSettings(shortcutSettings)
  applyCurrentSettings()
  newShortcutText.value = ''
} // End addShortcut

//=================
function removeShortcut(shortcut) {
  const target = selectedShortcutFunction.value
  if (!target) return

  shortcutSettings[target.id] = (shortcutSettings[target.id] || []).filter(item => item !== shortcut)

  saveShortcutSettings(shortcutSettings)
  applyCurrentSettings()
} // End removeShortcut

//=================
function resetAllShortcuts() {
  const defaults = resetShortcutSettings()
  syncShortcutSettings(defaults)
  applyCurrentSettings()
  newShortcutText.value = ''
} // End resetAllShortcuts

//=================
function emitClose() {
  emit('close')
} // End emitClose
</script>
