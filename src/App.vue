<template>
  <AppShell />
</template>

<script setup>
const appCommitSha = typeof __APP_COMMIT_SHA__ !== 'undefined' ? __APP_COMMIT_SHA__ : 'local'
const appCommitName = typeof __APP_COMMIT_NAME__ !== 'undefined' ? __APP_COMMIT_NAME__ : 'local dev'
import AppShell from './app/AppShell.vue'
</script>
