<template>
  <input
    ref="inputRef"
    type="text"
    inputmode="decimal"
    class="mn-dim-input"
    :style="inputStyle"
    :value="model.value"
    @input="onInput"
    @pointerdown.stop
    @click.stop
    @keydown.stop="onKeyDown"
    @blur="onBlur"
  />
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps({
  model: {
    type: Object,
    required: true
  },
  inputStyle: {
    type: Object,
    required: true
  },
  setInputRef: {
    type: Function,
    default: null
  }
})

const emit = defineEmits(['update-value', 'key-down', 'blur'])

const inputRef = ref(null)

//=================
function syncInputRef() {
  if (props.setInputRef) props.setInputRef(inputRef.value)
} // End syncInputRef

//=================
function onInput(event) {
  emit('update-value', event.target.value)
} // End onInput

//=================
function onKeyDown(event) {
  emit('key-down', event)
} // End onKeyDown

//=================
function onBlur() {
  emit('blur')
} // End onBlur

onMounted(syncInputRef)
watch(inputRef, syncInputRef)

onBeforeUnmount(() => {
  if (props.setInputRef) props.setInputRef(null)
})
</script>

<style scoped>
.mn-dim-input {
  position: absolute;
  width: 72px;
  height: 26px;
  transform: translate(-50%, -50%);
  z-index: 20;
  border: 1px solid #1a73e8;
  border-radius: 3px;
  background: #ffffff;
  color: #111111;
  font-size: 13px;
  text-align: center;
  outline: none;
  box-shadow: none;
}
</style>
