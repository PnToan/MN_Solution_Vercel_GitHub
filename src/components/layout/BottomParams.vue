<template>
  <section class="mn-bottom-params">
    <div class="mn-bottom-param-status">
      {{ app.state.status }}
      <span v-if="app.state.commandBuffer"> | Lệnh: {{ app.state.commandBuffer }}</span>
    </div>

    <div class="mn-bottom-view-bar">
      <button
        v-for="view in views"
        :key="view.id"
        class="mn-quick-view-btn"
        :class="{ active: app.state.currentView === view.id }"
        type="button"
        @click="app.setView(view.id)"
      >
        {{ view.label }}
      </button>
    </div>
  </section>
</template>

<script setup>
import { useAppStore } from '../../stores/useAppStore'

const app = useAppStore()

const views = [
  { id: 'front', label: 'Trước' },
  { id: 'back', label: 'Sau' },
  { id: 'left', label: 'Trái' },
  { id: 'right', label: 'Phải' },
  { id: 'top', label: 'Trên' },
  { id: 'bottom', label: 'Dưới' }
]
</script>