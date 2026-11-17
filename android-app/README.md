# Original Xbox dashboard for Android — WebAssembly wrapper

This Android Home launcher displays the **genuine reverse-engineered Theseus engine** via the browser build **ogxweb** (https://codeberg.org/devcheckra1n/ogxweb), not an invented CSS/WebGL imitation. Xbox source is **not** publicly released by Microsoft; the C engine is the GPL-3.0-or-later reconstruction at https://github.com/MrMilenko/Theseus.

The Android wrapper adds a native installed-app drawer, system settings shortcut, and Xbox-style on-screen navigation. The original Theseus UI still has console-specific screens and does not itself launch Android apps; the separate APPS overlay does. Since the original OG Xbox menu is canvas-rendered in WebAssembly, replacing menu items must be done in the upstream XAP/XIP or engine, not via HTML styling. Third-party apps cannot be reskinned in their internals by a launcher.

At build time, the workflow tries to mirror the public ogxweb static site into the APK. If its WASM dependencies cannot be mirrored, the wrapper loads https://actavis.dev/ogxweb/ over the internet instead. To test whether an APK is fully offline, inspect `assets/ogxweb/offline.ok` in the APK and test with airplane mode. GPL correspondence: see original engine and ogxweb repositories and this wrapper source (the current branch).

**No claim of native C/Android port**: this is the real engine running through Emscripten/WebAssembly in Android WebView. On-device performance and mobile gesture support require actual Samsung Galaxy S24 testing.
