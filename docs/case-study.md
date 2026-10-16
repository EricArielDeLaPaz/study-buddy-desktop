# Study Buddy: Desktop UX Case Study

## Overview & Problem Statement
Modern students and knowledge workers face a constant friction between sustained deep work and the digital distractions present across multi-monitor setups. Traditional productivity timers and notification blockers often rely on jarring interruptions, full-screen lockouts, or rigid modals that break user momentum and induce frustration. 

**Study Buddy** is an ambient desktop companion app designed to solve this problem. It introduces non-intrusive, context-aware reminders for hydration, breaks, and digital distraction management—all while operating transparently over the user's workspace without blocking underlying interactions.

---

## User Persona & Research Insights
User research and student workflow analysis revealed three core friction points in existing desktop productivity tools:
* **Focus Fatigue:** Hard-stop pomodoro timers cause anxiety when terminating active coding or writing flows.
* **Ergonomic Neglect:** Extended deep work sessions lead to dehydration and stiffness because static notifications are easily ignored or dismissed on autopilot.
* **Distraction Loop:** Opening communication or social applications (e.g., Discord, Reddit) during study sessions frequently triggers hours of context-switching.

### Design Solutions
* **Pass-Through Transparency:** Utilizing native Electron window transparency (`transparent: true`, `frame: false`) so the app floats invisibly over the desktop while allowing mouse clicks to pass through empty canvas areas.
* **Low-Friction Break Extensions:** Providing an intuitive `+` popover (`+30s`, `+1m`, `+5m`) directly inside reminder cards so users can defer breaks without closing or resetting their flow.
* **Autonomous Cadence:** Running background session schedulers that balance hydration and bathroom intervals based on accumulated focus minutes.

---

## Design System & Component Architecture
The user interface and interaction models were meticulously prototyped and refined in **Figma**, focusing on component consistency, Auto Layout behavior, and accessible dark-mode color tokens.

* **Component Design:** Built modular UI widgets including floating reminder cards, movable scratchpads, and interactive developer control pills.
* **Auto Layout Sandwich Method:** Solved complex layout challenges (such as custom buttons with curved triangle end-caps and text boxes) by utilizing nested frames to enable dynamic center expansion while preserving fixed-width end caps.
* **Color Tokens & Typography:** Established a cohesive dark-mode token system utilizing deep purples (`#1A1626`, `#221D33`), vibrant accents (`#A594F9`, `#60A5FA`), and legible sans-serif hierarchy scales.
* **Chibi Mascot Engine:** Designed the Mambo companion vector character with distinct emotional states (`idle_studying`, `hydration`, `bathroom`, `intervention`, `celebrating`) to provide warm, empathetic feedback.

---

## Technical Execution & Handoff
Bridging the gap between Figma visual specifications and production code required robust cross-layer engineering:

1. **Electron Main Process (`src/main/index.ts`):**
   - Configures a frameless, always-on-top, transparent window (`backgroundColor: '#00000000'`).
   - Implements dynamic OS-level mouse click-through toggles via `win.setIgnoreMouseEvents(ignore, { forward: true })`.
   - Exposes native OS file dialog bindings (`dialog.showSaveDialog`) for exporting Scratchpad notes as Markdown (`.md`) files.

2. **Preload IPC Bridge (`src/preload/index.ts` & `src/preload/index.d.ts`):**
   - Safely exposes `window.electronAPI` to the renderer using `contextBridge.exposeInMainWorld`, ensuring secure isolation between Node.js APIs and the browser context.

3. **React + TypeScript + Tailwind CSS Architecture:**
   - **`AppContext.tsx`:** Manages focus session state, countdown timers, FIFO overlay queues, and `localStorage` persistence (`'study_buddy_scratchpad'`, `'study_buddy_session_stats'`).
   - **`CenterOverlay.tsx` & `Scratchpad.tsx`:** Implements floating movable windows, real-time word/character counters, auto-save buffers, and native Markdown file download fallbacks.
   - **`ChibiCompanion.tsx` & `Audio.ts`:** Synthesizes zero-dependency Web Audio API harmonic chimes and renders scalable SVG vector animations driven by application state.