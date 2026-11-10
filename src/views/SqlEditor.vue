<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import CodeMirrorEditor from '@/components/base/CodeMirrorEditor.vue'
import { useI18n } from 'vue-i18n'
import { format } from 'sql-formatter'
import { sql } from '@codemirror/lang-sql'
import BaseIcon from '@/components/base/BaseIcon.vue'
import { useToast } from '@/composables/useToast'
import { useHistory } from '@/composables/useHistory'

const { t } = useI18n()
const { showToast } = useToast()
const { history, hasHistory, addToHistory, clearHistory } = useHistory('sql-editor')

// History dropdown state
const showHistoryDropdown = ref(false)
const historyWrapperRef = ref<HTMLElement | null>(null)

// Click outside to close dropdown
const handleClickOutside = (event: MouseEvent) => {
  if (historyWrapperRef.value && !historyWrapperRef.value.contains(event.target as Node)) {
    showHistoryDropdown.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

// State
const inputSql = ref('')
const selectedDialect = ref('mysql')
const error = ref<string | null>(null)
const processing = ref(false)

const dialects = [
  { value: 'mysql', label: 'MySQL' },
  { value: 'postgresql', label: 'PostgreSQL' },
  { value: 'sqlite', label: 'SQLite' },
  { value: 'transactsql', label: 'SQL Server' },
  { value: 'plsql', label: 'Oracle (PL/SQL)' },
  { value: 'bigquery', label: 'BigQuery' },
  { value: 'spark', label: 'Spark SQL' },
  { value: 'sql', label: 'Standard SQL' },
]

// Stats
const stats = computed(() => ({
  size: new Blob([inputSql.value]).size,
  lines: inputSql.value ? inputSql.value.split('\n').length : 0,
}))

// Actions
const formatSql = () => {
  if (!inputSql.value.trim()) return

  processing.value = true
  error.value = null

  try {
    inputSql.value = format(inputSql.value, {
      language: selectedDialect.value as any,
      tabWidth: 2,
      keywordCase: 'upper',
      linesBetweenQueries: 2,
    })
  } catch (e: any) {
    error.value = e.message
  } finally {
    setTimeout(() => {
      processing.value = false
      if (!error.value) {
        addToHistory(inputSql.value)
        showToast(t('formatted'))
      }
    }, 200)
  }
}

const clearAll = () => {
  inputSql.value = ''
  error.value = null
  showToast(t('cleared'), 'info')
}

const copyContent = async () => {
  if (inputSql.value) {
    await navigator.clipboard.writeText(inputSql.value)
    showToast(t('copied'))
  }
}

const loadFromHistory = (content: string) => {
  inputSql.value = content
  showHistoryDropdown.value = false
}

const handleClearHistory = () => {
  clearHistory()
  showToast(t('historyCleared'), 'info')
  showHistoryDropdown.value = false
}

const formatTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleString()
}
</script>

<template>
  <div class="editor-layout">
    <div class="pane input-pane">
      <div class="pane-header">
        <div class="pane-left">
          <div class="select-wrapper">
            <select v-model="selectedDialect" class="dialect-select">
              <option v-for="dialect in dialects" :key="dialect.value" :value="dialect.value">
                {{ dialect.label }}
              </option>
            </select>
            <BaseIcon name="chevronDown" class="select-icon" :size="12" />
          </div>
          <h3 class="pane-title">
            <span class="status-dot" :class="{ active: inputSql.trim() }"></span>
            {{ t('inputSql') }}
          </h3>
        </div>

        <div class="pane-actions">
          <button class="action-btn" @click="copyContent" :title="t('copy')">
            <BaseIcon name="copy" :size="16" />
            &nbsp;&nbsp;{{ t('copy') }}&nbsp;&nbsp;
          </button>
          <div ref="historyWrapperRef" class="history-wrapper">
            <button
              class="action-btn"
              @click="showHistoryDropdown = !showHistoryDropdown"
              :title="t('history')"
            >
              <BaseIcon name="clock" :size="16" />
              &nbsp;&nbsp;{{ t('history') }}&nbsp;&nbsp;
            </button>
            <div v-if="showHistoryDropdown" class="history-dropdown">
              <div class="history-header">
                <span>{{ t('history') }}</span>
                <button v-if="hasHistory" class="clear-btn" @click="handleClearHistory">
                  {{ t('clearHistory') }}
                </button>
              </div>
              <div v-if="!hasHistory" class="history-empty">{{ t('noHistory') }}</div>
              <div v-else class="history-list">
                <div
                  v-for="(item, index) in history"
                  :key="index"
                  class="history-item"
                  @click="loadFromHistory(item.content)"
                >
                  <div class="history-preview">{{ item.preview }}</div>
                  <div class="history-time">{{ formatTime(item.timestamp) }}</div>
                </div>
              </div>
            </div>
          </div>
          <div class="pane-meta">
            <span class="meta-text">{{ stats.size }} B</span>
            <span class="meta-divider">|</span>
            <span class="meta-text">{{ stats.lines }} {{ t('lines') }}</span>
          </div>
        </div>
      </div>

      <div class="editor-container">
        <CodeMirrorEditor
          v-model="inputSql"
          :extensions="[sql()]"
          :placeholder="t('pasteSqlHere')"
        />

        <!-- Error Toast -->
        <Transition name="slide-up">
          <div v-if="error" class="error-toast">
            <BaseIcon name="alertCircle" :size="16" />
            {{ error }}
          </div>
        </Transition>
      </div>
    </div>

    <!-- Center Actions (Floating) -->
    <div class="center-actions">
      <button class="tool-btn primary large" @click="formatSql" :disabled="!inputSql || processing">
        <BaseIcon v-if="processing" name="loader" class="spin" :size="16" />
        <BaseIcon v-else name="play" :size="16" />
        {{ t('formatSql') }}
      </button>

      <button class="tool-btn danger" @click="clearAll" :title="t('clear')">
        <BaseIcon name="clear" :size="16" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.editor-layout {
  display: flex;
  height: 90%;
  gap: 24px;
  position: relative;
  overflow: hidden;
  width: 75%;
  margin: 0 auto;
  padding-top: 80px;
}

.pane {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
  min-width: 0;
}

.pane-header {
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-primary);
  flex-shrink: 0;
}

.pane-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.pane-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--text-muted);
  transition: background 0.2s;
}

.status-dot.active {
  background: rgb(34 197 94 / var(--tw-bg-opacity, 1));
}

.pane-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.select-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.dialect-select {
  appearance: none;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 0.8rem;
  padding: 4px 24px 4px 8px;
  height: 28px;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 500;
}

.dialect-select:hover {
  border-color: var(--accent-color);
}

.dialect-select:focus {
  outline: none;
  border-color: var(--accent-color);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}

.select-icon {
  position: absolute;
  right: 6px;
  pointer-events: none;
  color: var(--text-muted);
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 28px;
  border: 1px solid transparent;
  background: transparent;
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
  border-color: var(--border-color);
}

.editor-container {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  gap: 20px;
}

.pane-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8rem;
  color: var(--text-muted);
}

.meta-divider {
  opacity: 0.4;
}

/* Center Actions (Floating at bottom for single pane?) 
   Or maybe just put them in the header? 
   No, let's make them floating at the bottom center of the pane content area 
   or below the pane?
   
   Actually, with single pane, we can put a large action bar at the bottom 
   or floating over the editor.
   
   Let's position them absolute at the bottom center of the editor layout.
*/
.center-actions {
  position: absolute;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 12px;
  z-index: 10;
  background: var(--bg-primary);
  padding: 6px;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--border-color);
}

.tool-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.tool-btn:hover {
  border-color: var(--accent-color);
  color: var(--accent-color);
  background: var(--bg-primary);
}

.tool-btn.primary {
  background: var(--accent-color);
  color: white;
  border-color: var(--accent-color);
}

.tool-btn.primary:hover {
  background: var(--accent-hover);
  border-color: var(--accent-hover);
}

.tool-btn.danger:hover {
  border-color: var(--error-color);
  color: var(--error-color);
}

.tool-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.error-toast {
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--error-bg);
  color: var(--error-text);
  padding: 8px 16px;
  border-radius: var(--radius-md);
  font-size: 0.875rem;
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--error-border);
  box-shadow: var(--shadow-md);
  z-index: 20;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translate(-50%, 20px);
}

/* History Dropdown */
.history-wrapper {
  position: relative;
}

.history-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 8px;
  width: 300px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  z-index: 100;
  overflow: hidden;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
  font-weight: 600;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.clear-btn {
  background: transparent;
  border: none;
  color: var(--error-color);
  font-size: 0.75rem;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: var(--radius-sm);
}
.clear-btn:hover {
  background: var(--error-bg);
}

.history-empty {
  padding: 24px;
  text-align: center;
  color: var(--text-muted);
  font-size: 0.85rem;
}

.history-list {
  max-height: 300px;
  overflow-y: auto;
}

.history-item {
  padding: 12px 16px;
  cursor: pointer;
  border-bottom: 1px solid var(--border-color);
  transition: background 0.15s;
}
.history-item:last-child {
  border-bottom: none;
}
.history-item:hover {
  background: var(--bg-secondary);
}

.history-preview {
  font-family: var(--font-mono);
  font-size: 0.8rem;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 4px;
}

.history-time {
  font-size: 0.7rem;
  color: var(--text-muted);
}
</style>
