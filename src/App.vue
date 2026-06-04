<template>
  <AppShell
    :commit-sha="appCommitSha"
    :commit-name="appCommitName"
  />
</template>

<script setup>
import AppShell from './app/AppShell.vue'

const appCommitSha = typeof __APP_COMMIT_SHA__ !== 'undefined' ? __APP_COMMIT_SHA__ : 'local'
const appCommitName = typeof __APP_COMMIT_NAME__ !== 'undefined' ? __APP_COMMIT_NAME__ : 'local dev'
</script>