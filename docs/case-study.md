# Study Buddy: Desktop UX Case Study

*Status: work in progress, rolling updates. Desktop first, mobile and sync next.*

## Overview and problem
Studying at a computer means fighting your own tools. Hard-stop pomodoro timers break your flow, notification blockers feel punishing, and it is easy to skip water and breaks for hours. I wanted a companion that stays out of the way and nudges you at the right moments.

**Study Buddy** is an ambient desktop companion. A small mascot, Mambo, floats over your workspace, runs your focus sessions, and asks for breaks with friendly overlays that never lock the screen.

## Where the insight came from
This project started from my own experience as a student, and I was the first user. I did not run interviews for this project, and I want to say that plainly. The three problems I designed around came from my own study sessions:

- **Focus fatigue:** a timer that cuts me off mid-thought makes me anxious about the timer instead of the work.
- **Ergonomic neglect:** static reminders are easy to dismiss on autopilot, so I stopped drinking water for hours.
- **Distraction loops:** opening Discord or Reddit "for a second" often took the rest of the evening.

**Next step:** test with other students. That is the biggest gap in this project and the first thing I plan to do before the mobile app.

## Design solutions
- **Break extensions, not hard stops:** a `+` control on each reminder card (+30s, +1m, +5m) so you can postpone a break without closing it or resetting your session.
- **Ambient presence:** a transparent, frameless companion that floats over your work and can expand into the full app or collapse back to Mambo.
- **Closing minimizes:** closing the window tucks the app into the Mambo companion instead of quitting, like a chat app you leave running.
- **Warm feedback:** Mambo has distinct states (studying, hydration, bathroom, intervention, celebrating) so reminders feel friendly, not nagging.
- **Progression:** levels unlock new companions, and the marketplace screen explores sharing custom buddies.

## Design system
The interface was designed in **Figma** with auto layout, components and variables, then carried into code as a token file.

- **Tokens:** a dark purple surface palette, purple accent, status colors, spacing and radius scales, in `design-tokens.json`, with matching light and dark themes.
- **Type:** Fredoka for the mascot voice and timers, DM Sans for everything else.
- **Components:** reminder cards, the floating notepad, overlays, tabs, dropdowns and confirmation dialogs.
- **Auto layout technique:** custom buttons with curved end caps are built from nested frames, so the center stretches while the caps stay fixed.

## How I worked with AI, and where I stepped in
I worked in a loop on every stage:

1. **Design in Figma:** I made or updated the frames.
2. **Direct the AI:** I wrote what I saw needed in plain language, with screenshots and Figma references. Gemini turned that into a structured prompt, and Gemini 4 Argon generated the code.
3. **Run and review:** I ran the app in a dev environment, clicked through every screen, and compared it to Figma.
4. **Decide and iterate:** I wrote the next change list.

The AI wrote the code. The decisions below were mine:

- **I cut features that added clutter:** removed the Messages tab, the focus-timer pill overlay, and strict blocking options from Settings.
- **I changed how windows behave:** the app should resize like a normal app, never go fullscreen, minimize to Mambo on close, and not overlap with the notepad.
- **I caught accessibility failures:** in light mode some text had too little contrast, such as the Delete Block button, tags and pills. I asked for WCAG AA contrast and then sent specific fixes when I found more.
- **I enforced consistency:** blue tags and purple buttons were competing, so I required one purple palette. I also asked for hover states on every desktop button and for settings cards that hug their content.
- **I added safety for irreversible actions:** a confirmation dialog for deleting an account, clearing the notepad, deleting a reminder and signing out.
- **I simplified Settings:** removed a "Cloud Sync" card, an "iPhone connected" row and a test button from the desktop settings because they did not work yet.

Not yet done: formal contrast checking with a tool, and testing with other students.

## Technical handoff
- **Electron main process:** a frameless, transparent, always-on-top companion window, a close handler that minimizes instead of quitting, and a native save dialog for exporting notes as Markdown.
- **Preload bridge:** `contextBridge` exposes a small API to the interface, keeping the Node.js side isolated.
- **React, TypeScript, Tailwind:** an app context holds the session timers, the overlay queue and local storage for notes and stats.
- **Audio and animation:** chimes are generated with the Web Audio API and the mascot is an animated SVG driven by app state.
- **Releases:** GitHub Actions builds installers for Windows, macOS and Linux from version tags.

## What I would do next
1. Test with students and change what does not hold up.
2. Build real detection for distracting apps and sites. Right now the intervention overlay is designed and working, but triggered from a developer bar.
3. Build the mobile app, then cloud sync.
4. Run a formal accessibility check on light and dark themes.
