# Study Buddy

A desktop study companion that keeps you focused without locking you out. Mambo, a small floating mascot, runs focus sessions, nudges you to drink water and take breaks, and gets out of the way when you need the whole screen.

Designed in Figma and built through AI-assisted iteration (about 30 hours from first commit to v3.2.1), and still in active development.

> **Status: work in progress (rolling updates).** The desktop app is the focus right now. The mobile app and cloud sync are planned and not built yet.

## What it does

- **Focus sessions** with presets (Quick 25/5, Standard 45/5, Deep 60/10, Custom) and quick +30s, +1m and +5m extensions while a session runs.
- **Break overlays** for hydration and bathroom breaks, with a small `+` control to postpone a break without losing your flow.
- **Reminders** you can edit or delete (water, bathroom, posture, stretch by default).
- **Companion system:** Mambo and unlockable buddies, a buddy studio with animation slots, and a marketplace screen for presets.
- **Notepad** with title, heading, subheading and body styles, lists and checklists, and Markdown export.
- **Progress** dashboard with weekly focus, a daily goal you can edit, and level-based companion unlocks.
- **Schedule and App Rules** screens for time blocks and monitored apps and sites.
- **Light, dark and match-system themes** built on a shared token set, with contrast fixed during review.
- **Window behavior:** resizable, can't go fullscreen, closing the window minimizes it to the Mambo companion, and the notepad and app window can't overlap.

## What is not built yet

Being clear about this so the README matches the app:

- Distraction intervention overlays are designed and working, but they are triggered from a developer control bar. Automatic detection of a distracting app or site opening is not implemented yet.
- The marketplace and buddy sharing run locally. There is no backend.
- Cloud sync, accounts and the mobile app are planned. Notes and stats are stored locally on your computer.

## How it was made

1. **Design:** screens, components, the Mambo character states and the light and dark token system were designed in Figma.
2. **Build:** I used Gemini to turn my change lists into structured prompts, and Gemini 4 Argon to generate the Electron, React, TypeScript and Tailwind code.
3. **Human review:** every round, I ran the app, checked it against the Figma frames, and wrote the next change list from what I saw: contrast failures in light mode, controls in the wrong place, window behavior that did not feel like a normal app, features to remove. See the [case study](docs/case-study.md) for examples.

## Tech

Electron, React 18, TypeScript, Tailwind CSS, Vite (electron-vite). Design tokens live in `src/renderer/src/tokens/design-tokens.json`. Fonts: Fredoka for display text and DM Sans for UI.

## Run it

```bash
npm install
npm run dev
```

Build installers with `npm run build:win`, `npm run build:mac` or `npm run build:linux`. Tagged releases (`v*.*.*`) build for Windows, macOS and Linux with GitHub Actions.

## Author

Eric Ariel De La Paz. Portfolio: https://ericarieldelapaz.tech
