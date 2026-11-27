# Native settings interaction fixture

Normal native verification is unchanged. An explicitly instrumented test PRG can request an operator session by printing the exact line `GFC_THEME_UI_VALIDATION=1` after its first rendered frame. Use a fresh application identity per test; never add this marker to shipped watchfaces.

The probe pauses for at most 80 seconds inside the existing isolated, quota-charged job. An operator with deployment SSH/Docker permission verifies the immutable `/input/watchface.prg` SHA-256 before touching that job. Fixed digest files in the per-job output tmpfs permit one simulator restart (same PRG and home) and completion. Symlinks, wrong lengths and mismatched hashes are rejected; no command payload is evaluated. The existing worker deadline, quotas, container limits, mounts and cleanup remain in force. The gate provides no public remote-control endpoint.

- `theme-ui-boot.ready`: probe ready; contents are the PRG digest.
- `theme-ui-restart.request`: operator requests the single restart using that digest.
- `theme-ui-restart.ready`: a second frame from the same PRG has arrived.
- `theme-ui.done`: operator finishes, allowing the normal screenshot/report path.

Keep original screenshots, observation logs, PRG hash, interaction sequence and cleanup result. Source assertions and a forced AOD drawing case do not prove native menu interaction, persistence or a real sleep transition. The test harness only adds observation logs and the marker; setting changes must go through the simulator system menu.

For an existing known probe image, `Dockerfile.runner` overlays only these shell files. Pin its base tag to an immutable image ID and reuse that base for subsequent updates; do not stack each release on the previous overlay. Its Linux build runs the real Bash request-parser tests, including symlink rejection. The full Dockerfile supports a clean installation.

Restart uses SDK 9.3 File → Quit at its measured desktop coordinates and requires the simulator to exit gracefully. Destroying its X window or killing the client first loses settings in the observed fixture and is not accepted as persistence evidence. Wait for a complete menu repaint before each touch; a subsecond image can still show the previous menu.
