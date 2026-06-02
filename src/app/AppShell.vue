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
import TopBar from '../components/layout/TopBar.vue'
import LibraryBar from '../components/library/LibraryBar.vue'
import LeftToolbar from '../components/layout/LeftToolbar.vue'
import DrawingViewport from '../components/drawing/DrawingViewport.vue'
import BottomParams from '../components/layout/BottomParams.vue'
import RightPanel from '../components/panels/RightPanel.vue'
import { useAppShellController } from '../composables/app/useAppShellController'

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

const {
  isRightPanelHidden,
  startRightPanelResize,
  toggleRightPanel
} = useAppShellController()
</script>