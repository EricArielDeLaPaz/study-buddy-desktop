# Study Buddy Desktop (v3.3.0)

An ambient, always-on-top desktop focus companion with Mambo reminder overlays, app/website nudges, and an inline rich-text Notepad.

---

## Installing a Test Build (Unsigned Installers)

Because test builds are currently unsigned, Windows and macOS will show a security prompt the first time you open the installer or app:

### Windows (SmartScreen)
1. Download and run `Study-Buddy-3.3.0-Setup-x64.exe`.
2. When the **Windows protected your PC** (SmartScreen) window appears, click **More info**.
3. Click **Run anyway** to complete the installation.

### macOS (Gatekeeper)
1. Download and open the `.dmg` file (`arm64` for Apple Silicon M1–M4 Macs, `x64` for Intel Macs) and drag **Study Buddy** to **Applications**.
2. **Right-click** (or Control-click) **Study Buddy** in Applications and choose **Open**, then click **Open** in the dialog.
3. If macOS still blocks the app, open **System Settings → Privacy & Security**, scroll down to the **Security** section, and click **Open Anyway** next to *Study Buddy was blocked from use because it is not from an identified developer*.

### macOS Screen Recording Permission (Optional for Website Title Matching)
- Desktop App rules (like Discord or Steam) work immediately without extra permissions.
- Website rules match the active browser window's title (e.g., `"YouTube"`). On macOS, reading another app's window title requires **Screen Recording** permission (**System Settings → Privacy & Security → Screen & System Audio Recording**). If you skip this permission, Study Buddy continues running normally and all Desktop App rules still work.

---

## Development & Cutting a Release

```bash
# 1. Install dependencies cleanly
rm -rf node_modules package-lock.json
npm install

# 2. Start development mode
npm run dev

# 3. Cut a new release tag and trigger GitHub Actions
npm version minor
git push --follow-tags
