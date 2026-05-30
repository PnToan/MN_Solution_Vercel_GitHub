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
          <button class="mn-settings-btn mn-settings-btn-primary" type="button">Auto Update</button>
          <button class="mn-settings-btn" type="button">Lưu</button>
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
            <section class="mn-settings-section">
              <h2>{{ activeTab.label }}</h2>
              <p>{{ activeTab.description }}</p>
            </section>

            <section class="mn-settings-section">
              <h2>Thông tin thiết lập</h2>
              <p>Tab này đang được tạo nền tảng giao diện. Thông số chi tiết sẽ bổ sung theo từng chức năng ở bước sau.</p>
            </section>
          </div>
        </main>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

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

const activeTabId = ref('general')

const activeTab = computed(() => tabs.find(tab => tab.id === activeTabId.value) || tabs[0])

//=================
function setActiveTab(tabId) {
  activeTabId.value = tabId
} // End setActiveTab

//=================
function emitClose() {
  emit('close')
} // End emitClose
</script>
