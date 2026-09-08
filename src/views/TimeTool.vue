<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from '@/composables/useToast'
import BaseIcon from '@/components/base/BaseIcon.vue'

const { t } = useI18n()
const { showToast } = useToast()

const isMillisecond = ref(false)
const isRunning = ref(true)
const nowTimestamp = ref(Date.now())
let timer: ReturnType<typeof setInterval> | null = null

const currentTimestamp = computed(() => {
  return isMillisecond.value ? nowTimestamp.value : Math.floor(nowTimestamp.value / 1000)
})

const currentTimeStr = computed(() => {
  return new Date(nowTimestamp.value).toLocaleString()
})

const startTimer = () => {
  if (timer) return
  isRunning.value = true
  nowTimestamp.value = Date.now()
  timer = setInterval(() => {
    nowTimestamp.value = Date.now()
  }, 1000)
}

const stopTimer = () => {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
  isRunning.value = false
}

const copyCurrentTimestamp = async () => {
  await navigator.clipboard.writeText(String(currentTimestamp.value))
  showToast(t('copied'))
}

const timestampInput = ref('')
const timestampUnit = ref<'s' | 'ms'>('s')
const timestampToDateResult = ref('')

const dateInput = ref('')
const dateUnit = ref<'s' | 'ms'>('s')
const dateToTimestampResult = ref('')

const timezones = [
  { value: 'Asia/Shanghai', label: 'Asia/Shanghai' },
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'America/New_York' },
  { value: 'Europe/London', label: 'Europe/London' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo' },
]
const selectedTimezone = ref('Asia/Shanghai')

const padZero = (n: number) => String(n).padStart(2, '0')

const formatDateInTimezone = (date: Date, tz: string): string => {
  try {
    const formatter = new Intl.DateTimeFormat('zh-CN', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
    return formatter.format(date)
  } catch {
    return date.toLocaleString()
  }
}

const convertTimestampToDate = () => {
  if (!timestampInput.value.trim()) {
    showToast('Please enter a timestamp', 'warning')
    return
  }
  const ts = Number(timestampInput.value)
  if (isNaN(ts)) {
    showToast('Invalid timestamp', 'warning')
    return
  }
  const date = timestampUnit.value === 's' ? new Date(ts * 1000) : new Date(ts)
  timestampToDateResult.value = formatDateInTimezone(date, selectedTimezone.value)
}

const toggleUnit = () => {
  isMillisecond.value = !isMillisecond.value
  // 同步「时间戳转日期」输入框的单位，保证数值与解析单位一致
  const prevUnit = timestampUnit.value
  timestampUnit.value = isMillisecond.value ? 'ms' : 's'

  const raw = timestampInput.value.trim()
  const ts = Number(raw)
  if (!raw || isNaN(ts)) {
    // 无有效输入时，直接填入当前时间戳（按新单位）
    timestampInput.value = String(currentTimestamp.value)
  } else {
    // 按切换前的单位换算：秒 -> 毫秒 ×1000；毫秒 -> 秒 ÷1000
    timestampInput.value = String(prevUnit === 's' ? ts * 1000 : Math.floor(ts / 1000))
  }
  convertTimestampToDate()
}

const convertDateToTimestamp = () => {
  if (!dateInput.value.trim()) {
    showToast('Please enter a date', 'warning')
    return
  }
  const date = new Date(dateInput.value)
  if (isNaN(date.getTime())) {
    showToast('Invalid date format', 'warning')
    return
  }
  const ts = date.getTime()
  dateToTimestampResult.value = dateUnit.value === 's' ? String(Math.floor(ts / 1000)) : String(ts)
}

const copyResult = async (result: string) => {
  if (!result) return
  await navigator.clipboard.writeText(result)
  showToast(t('copied'))
}

const fillCurrentTimestamp = () => {
  timestampInput.value = String(currentTimestamp.value)
  timestampUnit.value = isMillisecond.value ? 'ms' : 's'
}

const fillCurrentDate = () => {
  const now = new Date()
  dateInput.value = `${now.getFullYear()}-${padZero(now.getMonth() + 1)}-${padZero(now.getDate())} ${padZero(now.getHours())}:${padZero(now.getMinutes())}:${padZero(now.getSeconds())}`
}

// 单位/时区/输入变化时自动刷新结果，避免显示与当前单位不一致
watch([timestampUnit, selectedTimezone, timestampInput], () => {
  if (timestampInput.value.trim()) convertTimestampToDate()
})
watch([dateUnit, dateInput], () => {
  if (dateInput.value.trim()) convertDateToTimestamp()
})

onMounted(() => {
  startTimer()
  fillCurrentDate()
  timestampInput.value = String(currentTimestamp.value)
  timestampUnit.value = isMillisecond.value ? 'ms' : 's'
  convertTimestampToDate()
  convertDateToTimestamp()
})

onUnmounted(() => {
  stopTimer()
})
</script>

<template>
  <div class="time-tool-page">
    <div class="tool-container">
      <div class="convert-section">
        <div class="convert-content">
          <div class="current-timestamp-card">
            <div class="card-label">{{ t('currentTimestamp') }}</div>
            <div class="timestamp-display">
              <span class="timestamp-value">{{ currentTimestamp }}</span>
              <span class="timestamp-unit">{{
                isMillisecond ? t('milliseconds') : t('seconds')
              }}</span>
            </div>
            <div class="current-time">{{ t('currentTime') }}: {{ currentTimeStr }}</div>
            <div class="action-row">
              <button class="action-btn" @click="toggleUnit">
                <BaseIcon name="swap" :size="16" />
                {{ t('toggleUnit') }}
              </button>
              <button class="action-btn" @click="copyCurrentTimestamp">
                <BaseIcon name="copy" :size="16" />
                {{ t('copy') }}
              </button>
              <button v-if="isRunning" class="action-btn danger" @click="stopTimer">
                <BaseIcon name="clear" :size="16" />
                {{ t('stop') }}
              </button>
              <button v-else class="action-btn success" @click="startTimer">
                <BaseIcon name="play" :size="16" />
                {{ t('start') }}
              </button>
            </div>
          </div>

          <div class="convert-row">
            <div class="convert-row-header">
              <BaseIcon name="clock" :size="18" />
              <span>{{ t('timestampToDate') }}</span>
            </div>
            <div class="convert-row-body">
              <div class="input-group">
                <input
                  type="text"
                  v-model="timestampInput"
                  class="text-input"
                  placeholder="1782442569"
                />
                <select v-model="timestampUnit" class="unit-select">
                  <option value="s">秒(s)</option>
                  <option value="ms">毫秒(ms)</option>
                </select>
                <button class="convert-btn" @click="convertTimestampToDate">
                  {{ t('convert') }}
                </button>
              </div>
              <div class="result-group">
                <input
                  type="text"
                  :value="timestampToDateResult"
                  class="text-input result-input"
                  readonly
                />
                <select v-model="selectedTimezone" class="unit-select">
                  <option v-for="tz in timezones" :key="tz.value" :value="tz.value">
                    {{ tz.label }}
                  </option>
                </select>
                <button
                  class="action-btn small"
                  @click="copyResult(timestampToDateResult)"
                  :disabled="!timestampToDateResult"
                >
                  <BaseIcon name="copy" :size="14" />
                </button>
                <button class="action-btn small" @click="fillCurrentTimestamp">
                  <BaseIcon name="clock" :size="14" />
                </button>
              </div>
            </div>
          </div>

          <div class="convert-row">
            <div class="convert-row-header">
              <BaseIcon name="fileText" :size="18" />
              <span>{{ t('dateToTimestamp') }}</span>
            </div>
            <div class="convert-row-body">
              <div class="input-group">
                <input
                  type="text"
                  v-model="dateInput"
                  class="text-input"
                  placeholder="2026-06-26 10:56:09"
                />
                <select v-model="selectedTimezone" class="unit-select">
                  <option v-for="tz in timezones" :key="tz.value" :value="tz.value">
                    {{ tz.label }}
                  </option>
                </select>
                <button class="convert-btn" @click="convertDateToTimestamp">
                  {{ t('convert') }}
                </button>
              </div>
              <div class="result-group">
                <input
                  type="text"
                  :value="dateToTimestampResult"
                  class="text-input result-input"
                  readonly
                />
                <select v-model="dateUnit" class="unit-select">
                  <option value="s">秒(s)</option>
                  <option value="ms">毫秒(ms)</option>
                </select>
                <button
                  class="action-btn small"
                  @click="copyResult(dateToTimestampResult)"
                  :disabled="!dateToTimestampResult"
                >
                  <BaseIcon name="copy" :size="14" />
                </button>
                <button class="action-btn small" @click="fillCurrentDate">
                  <BaseIcon name="clock" :size="14" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.time-tool-page {
  width: 100%;
  height: 100%;
  padding: 80px 24px 48px;
  overflow-y: disabled;
}

.tool-container {
  max-width: 70%;
  margin: 0 auto;
}

.current-timestamp-card {
  padding: 32px;
  margin-bottom: 35px;
  padding-bottom: 28px;
  border-bottom: 1px solid var(--border-color);
}

.card-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 12px;
}

.timestamp-display {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 12px;
}

.timestamp-value {
  font-size: 2.8rem;
  font-weight: 700;
  font-family: var(--font-mono);
  color: var(--text-primary);
  word-break: break-all;
}

.timestamp-unit {
  font-size: 1rem;
  color: var(--text-muted);
  background: var(--bg-secondary);
  padding: 6px 12px;
  border-radius: var(--radius-sm);
}

.current-time {
  font-size: 0.9rem;
  color: var(--text-muted);
  margin-bottom: 20px;
  font-family: var(--font-mono);
}

.action-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  border-color: var(--accent-color);
  color: var(--accent-color);
  background: var(--bg-primary);
}

.action-btn.danger:hover {
  border-color: var(--error-color);
  color: var(--error-color);
}

.action-btn.success:hover {
  border-color: var(--success-color);
  color: var(--success-color);
}

.action-btn.small {
  padding: 8px 12px;
  font-size: 0.8rem;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.convert-section {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}

.convert-content {
  padding: 28px;
  padding-bottom: 50px;
}

.convert-row {
  margin-bottom: 35px;
  padding-bottom: 28px;
  border-bottom: 1px solid var(--border-color);
}

.convert-row:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

.convert-row-header {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 16px;
}

.convert-row-body {
  display: flex;
  align-items: center;
  gap: 24px;
  flex-wrap: wrap;
}

.input-group,
.result-group {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.input-group .text-input {
  flex: 1;
  min-width: 300px;
}

.result-group .text-input {
  flex: 1;
  min-width: 200px;
}

.result-label {
  font-size: 0.85rem;
  color: var(--text-muted);
  white-space: nowrap;
  min-width: 90px;
  font-weight: 500;
}

.text-input {
  flex: 1;
  min-width: 200px;
  padding: 10px 14px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 0.875rem;
  font-family: var(--font-mono);
  transition: all 0.2s;
}

.text-input:focus {
  outline: none;
  border-color: var(--accent-color);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}

.result-input {
  background: var(--bg-tertiary);
  cursor: default;
}

.unit-select {
  padding: 10px 14px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 180px;
}

.unit-select:hover {
  border-color: var(--accent-color);
}

.unit-select:focus {
  outline: none;
  border-color: var(--accent-color);
}

.convert-btn {
  padding: 10px 24px;
  border: none;
  background: var(--accent-color);
  color: white;
  border-radius: var(--radius-md);
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.convert-btn:hover {
  background: var(--accent-hover);
}

.batch-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px;
  color: var(--text-muted);
}

.batch-placeholder p {
  margin-top: 16px;
  font-size: 0.95rem;
}
</style>
