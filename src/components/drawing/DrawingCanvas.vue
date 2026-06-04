<template>
  <canvas
    :ref="setCanvasRef"
    class="mn-draw-canvas"
    :class="canvasCursorClass"
    @pointerdown="$emit('pointer-down', $event)"
    @pointermove="$emit('pointer-move', $event)"
    @pointerup="$emit('pointer-up', $event)"
    @pointerleave="$emit('pointer-up', $event)"
    @wheel.prevent="$emit('wheel', $event)"
    @contextmenu.prevent
  />
</template>

<script setup>
defineProps({
  canvasCursorClass: {
    type: String,
    default: 'mn-cursor-default'
  },
  setCanvasRef: {
    type: Function,
    required: true
  }
})

defineEmits([
  'pointer-down',
  'pointer-move',
  'pointer-up',
  'wheel'
])
</script>

<style scoped>
.mn-cursor-move {
  cursor: url("data:image/svg+xml,%3Csvg width='32' height='32' viewBox='0 0 32 32' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M16 5 V27 M5 16 H27' stroke='%23111111' stroke-width='5'/%3E%3Cpath d='M16 5 L12 9 M16 5 L20 9 M16 27 L12 23 M16 27 L20 23 M5 16 L9 12 M5 16 L9 20 M27 16 L23 12 M27 16 L23 20' stroke='%23111111' stroke-width='5'/%3E%3Cpath d='M16 5 V27 M5 16 H27' stroke='%23ffffff' stroke-width='2.2'/%3E%3Cpath d='M16 5 L12 9 M16 5 L20 9 M16 27 L12 23 M16 27 L20 23 M5 16 L9 12 M5 16 L9 20 M27 16 L23 12 M27 16 L23 20' stroke='%23ffffff' stroke-width='2.2'/%3E%3Ccircle cx='16' cy='16' r='1.4' fill='%23ffffff' stroke='%23111111' stroke-width='1.2'/%3E%3C/g%3E%3C/svg%3E") 16 16, move;
}

.mn-cursor-dimensions {
  cursor: url("data:image/svg+xml,%3Csvg width='34' height='34' viewBox='0 0 34 34' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M3 2 L3 23 L8 18 L12 29 L16 27 L12 16 L20 16 Z' fill='white' stroke='%23111111' stroke-width='1.4' stroke-linejoin='round'/%3E%3Cline x1='17' y1='24' x2='31' y2='24' stroke='%230077CC' stroke-width='2'/%3E%3Cline x1='17' y1='20' x2='17' y2='28' stroke='%230077CC' stroke-width='2'/%3E%3Cline x1='31' y1='20' x2='31' y2='28' stroke='%230077CC' stroke-width='2'/%3E%3Ctext x='24' y='19' font-size='8' text-anchor='middle' fill='%230077CC'%3EDIM%3C/text%3E%3C/svg%3E") 3 2, crosshair;
}

.mn-cursor-box {
  cursor: url("data:image/svg+xml,%3Csvg width='32' height='32' viewBox='0 0 32 32' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M4 2 L4 22 L9 17 L13 27 L17 25 L13 15 L20 15 Z' fill='white' stroke='%23111111' stroke-width='1.4' stroke-linejoin='round'/%3E%3Crect x='13' y='21' width='14' height='8' rx='1.5' fill='%23dbefff' stroke='%230077CC' stroke-width='1.5'/%3E%3C/svg%3E") 4 2, crosshair;
}

.mn-cursor-select {
  cursor: url("data:image/svg+xml,%3Csvg width='32' height='32' viewBox='0 0 32 32' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M4 2 L4 23 L9 18 L13 29 L17 27 L13 16 L21 16 Z' fill='white' stroke='%23111111' stroke-width='1.4' stroke-linejoin='round'/%3E%3Ccircle cx='23' cy='24' r='4' fill='%23ffffff' stroke='%230077CC' stroke-width='1.5'/%3E%3C/svg%3E") 4 2, default;
}

.mn-cursor-crosshair {
  cursor: crosshair;
}

.mn-cursor-default {
  cursor: default;
}

.mn-cursor-pointer {
  cursor: pointer;
}
</style>
