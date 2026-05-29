<template>
  <section class="mn-bottom-params">
    <div class="mn-bottom-param-status">
      {{ app.state.status }}
      <span v-if="app.state.commandBuffer"> | Lệnh: {{ app.state.commandBuffer }}</span>
    </div>
  </section>
</template>

<script setup>
import { useAppStore } from '../../stores/useAppStore'

const app = useAppStore()
</script>