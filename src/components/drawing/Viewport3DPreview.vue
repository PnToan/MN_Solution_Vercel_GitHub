<template>
  <Mini3DPreview v-if="visible" />
  <button class="mn-preview-toggle" type="button" @click="$emit('toggle')">
    {{ visible ? 'Ẩn 3D' : 'Hiện 3D' }}
  </button>
</template>

<script setup>
import Mini3DPreview from '../preview/Mini3DPreview.vue'

defineProps({
  visible: {
    type: Boolean,
    default: false
  }
})

defineEmits(['toggle'])
</script>
