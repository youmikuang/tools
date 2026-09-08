<script setup lang="ts">
import { computed, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useTheme } from '@/composables/useTheme'
import BaseIcon from '@/components/base/BaseIcon.vue'
import ToastContainer from '@/components/base/ToastContainer.vue'

const { isDark, toggleTheme } = useTheme()
const { t, locale } = useI18n()
const router = useRouter()
const route = useRoute()

const STORAGE_KEY = 'json-editor-locale'

const localeLabel = computed(() => (locale.value === 'en' ? '中' : 'EN'))

function toggleLocale() {
  const next = locale.value === 'en' ? 'zh' : 'en'
  locale.value = next
  localStorage.setItem(STORAGE_KEY, next)
}

// Compute active tab from current route name
const activeTab = computed(() => {
  const name = route.name
  return (typeof name === 'string' ? name : 'json') as string
})

// Theme toggle with View Transitions API (BewlyCat style)
function handleThemeToggle(e: MouseEvent) {
  // Check if View Transitions API is supported
  const isAppearanceTransition =
    typeof document !== 'undefined' &&
    !!(document as any).startViewTransition &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (!isAppearanceTransition) {
    toggleTheme()
    return
  }

  const x = e.clientX
  const y = e.clientY
  const endRadius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))

  // Inject style to disable all CSS transitions during the animation
  const disableTransitionsStyle = document.createElement('style')
  disableTransitionsStyle.textContent = `
    *, *::before, *::after {
      -webkit-transition: none !important;
      -moz-transition: none !important;
      -o-transition: none !important;
      transition: none !important;
    }
  `
  document.head.appendChild(disableTransitionsStyle)

  // Inject style to disable default view transition animations
  const viewTransitionStyle = document.createElement('style')
  viewTransitionStyle.textContent = `
    ::view-transition-old(root),
    ::view-transition-new(root) {
      animation: none !important;
      mix-blend-mode: normal;
    }
  `
  document.head.appendChild(viewTransitionStyle)

  // Start view transition
  const transition = (document as any).startViewTransition(async () => {
    toggleTheme()
    await nextTick()
  })

  transition.ready.then(() => {
    // Check the NEW theme state (after toggle)
    const isDarkNow = isDark.value

    // 浅->深：新主题(new)从点击点向外扩散铺开
    // 深->浅：旧主题(old)从四周向点击点收缩退去
    const targetPseudo = isDarkNow ? '::view-transition-new(root)' : '::view-transition-old(root)'
    const zIndexStyle = document.createElement('style')
    zIndexStyle.textContent = `
      ::view-transition-old(root) { z-index: ${isDarkNow ? 1 : 9999}; }
      ::view-transition-new(root) { z-index: ${isDarkNow ? 9999 : 1}; }
    `
    document.head.appendChild(zIndexStyle)

    // 圆形扩散：面积 ∝ r²。按"前快后慢"的节奏分配半径：
    // 面积占比 a_k = (k/N)^EXP（EXP<1 → 前期 a 增长快、后期收敛慢），
    // 半径 r_k = R·√a_k = R·(k/N)^(EXP/2)。
    // EXP=1 为均匀面积等分；EXP=0.5 即半径 R·(k/N)^0.25，前半段跳跃多、后半段少。
    const cx = (x / innerWidth) * 100
    const cy = (y / innerHeight) * 100
    const N = 12
    const EXP = 1
    const radii: number[] = []
    for (let k = 0; k <= N; k++) radii.push(endRadius * Math.pow(k / N, EXP / 2))
    // expand = 从 0 扩散到 R（浅->深）；contract = 反向（深->浅）
    const order = isDarkNow ? radii : [...radii].reverse()
    const clips: string[] = order.map((r) => `circle(${r}px at ${cx}% ${cy}%)`)

    // 用单个连续 keyframes 动画（而非多段递归），避免段间空隙导致的闪烁，
    // 尤其是深->浅收缩时 old 在最底层、段间隙会让环带边缘反复闪。
    const keyframes = clips.map((c, idx) => ({
      clipPath: c,
      offset: idx / (clips.length - 1),
    }))
    const animation = document.documentElement.animate(keyframes, {
      duration: N * 14,
      easing: 'linear',
      pseudoElement: targetPseudo,
    })
    animation.finished.then(() => {
      zIndexStyle.remove()
    })
  })

  transition.finished.then(() => {
    disableTransitionsStyle.remove()
    viewTransitionStyle.remove()
  })
}
</script>

<template>
  <div class="container">
    <header class="header">
      <div class="header-left">
        <div class="brand" @click="router.push('/')" style="cursor: pointer">
          <BaseIcon name="logo" :size="24" />
          Tools
        </div>

        <nav class="nav-tabs">
          <router-link to="/" class="nav-tab" :class="{ active: activeTab === 'json' }">
            <BaseIcon name="json" :size="16" />
            {{ t('json') }}
          </router-link>
          <router-link to="/diff" class="nav-tab" :class="{ active: activeTab === 'jsonDiff' }">
            <BaseIcon name="diff" :size="16" />
            {{ t('jsonDiff') }}
          </router-link>
          <router-link to="/sql" class="nav-tab" :class="{ active: activeTab === 'sql' }">
            <BaseIcon name="sql" :size="16" />
            {{ t('sqlFormat') }}
          </router-link>
          <router-link to="/time" class="nav-tab" :class="{ active: activeTab === 'time' }">
            <BaseIcon name="time" :size="16" />
            {{ t('time') }}
          </router-link>
          <router-link to="/base64" class="nav-tab" :class="{ active: activeTab === 'base64' }">
            <BaseIcon name="base64" :size="16" />
            {{ t('base64') }}
          </router-link>
          <router-link to="/card" class="nav-tab" :class="{ active: activeTab === 'card' }">
            <BaseIcon name="image" :size="16" />
            {{ t('card') }}
          </router-link>
        </nav>
      </div>

      <div class="header-right">
        <button class="lang-btn" @click="toggleLocale">
          {{ localeLabel }}
        </button>
        <span class="lang-separator">|</span>
        <a
          class="lang-btn"
          href="https://github.com/youmikuang/tool"
          target="_blank"
          rel="noopener noreferrer"
        >
          <BaseIcon name="github" :size="18" />
        </a>
        <span class="lang-separator">|</span>
        <button
          class="btn-icon theme-btn"
          @click="handleThemeToggle"
          :title="isDark ? t('switchToLight') : t('switchToDark')"
        >
          <BaseIcon v-if="isDark" name="sun" :size="18" />
          <BaseIcon v-else name="moon" :size="18" />
        </button>
      </div>
    </header>

    <main class="main">
      <router-view v-slot="{ Component }">
        <KeepAlive>
          <component :is="Component" />
        </KeepAlive>
      </router-view>
    </main>

    <ToastContainer />

    <footer class="footer">
      <div class="footer-content">
        <span class="copyright">Copyright © 2026 GAOHENG & </span>
        <span class="footer-links">
          <a href="https://beian.miit.gov.cn">京ICP备16016944号-3</a>
        </span>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: transparent;
}

.header {
  height: 64px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-6);
  background: var(--bg-primary);
  z-index: 10;
}

.header-left {
  display: flex;
  align-items: center;
  height: 100%;
  gap: var(--space-6);
}

.header-right {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.brand {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  user-select: none;
  height: 100%;
}

.logo-icon {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.9rem;
  font-family: var(--font-mono);
}

.logo-text {
  font-weight: 700;
  font-size: 1.25rem;
  color: var(--text-primary);
  letter-spacing: -0.5px;
}

.nav-tabs {
  display: flex;
  height: 100%;
  gap: 10px;
}

.nav-tab {
  position: relative;
  display: flex;
  align-items: center;
  height: 100%;
  padding: 0 20px;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-secondary);
  background: transparent;
  border: none;
  border-radius: 0;
  cursor: pointer;
  transition: color 0.2s;
  gap: 6px;
}

.nav-tab.active {
  color: var(--accent-color);
  font-weight: 600;
}

.nav-tab.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--accent-color);
  border-radius: 1px;
}

.lang-btn {
  padding: 8px 15px;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-secondary);
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s;
}

.lang-btn:hover {
  color: var(--accent-color);
  background: rgba(0, 0, 0, 0.05);
}

[data-theme='dark'] .lang-btn:hover {
  background: rgba(255, 255, 255, 0.08);
}

.lang-separator {
  color: var(--border-color);
  font-weight: 300;
  user-select: none;
}

.btn-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  border: none;
  background: transparent;
  font-size: 1.1rem;
  cursor: pointer;
  color: var(--text-secondary);
  transition: all 0.2s;
}

.btn-icon:hover {
  color: var(--accent-color);
  background: rgba(0, 0, 0, 0.05);
}

[data-theme='dark'] .btn-icon:hover {
  background: rgba(255, 255, 255, 0.08);
}

.main {
  flex: 1;
  display: flex;
  overflow: hidden;
  position: relative;
  background: var(--bg-app);
}

.footer {
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 var(--space-6);
  flex-shrink: 0;
}

.footer-content {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.8rem;
  color: var(--text-muted);
}

.footer-links {
  display: flex;
  align-items: center;
  gap: 8px;
}

.footer-links a {
  color: var(--text-muted);
  transition: color 0.2s;
}

a {
  text-decoration: none;
}

.footer-links a:hover {
  color: var(--accent-color);
}
</style>
