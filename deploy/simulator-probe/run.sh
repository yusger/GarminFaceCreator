#!/bin/bash
set -euo pipefail
: "${DEVICE:?Set DEVICE to the exact compiled target}"
[[ "$DEVICE" =~ ^[a-z0-9]+$ ]] || exit 2
ready_marker=${PROBE_READY_MARKER:-GFC_PROBE_FRAME_READY}
case "$ready_marker" in GFC_PROBE_FRAME_READY|GFC_RENDER_READY) ;; *) exit 2;; esac
hold=${PROBE_HOLD_SECONDS:-0}
[[ "$hold" =~ ^([0-9]|[12][0-9]|30)$ ]] || exit 2
test -s /input/watchface.prg || exit 2
: > /output/monkeydo.log
: > /output/simulator.log
: > /output/capture-metadata.txt
mkdir -p "$HOME/.Garmin/ConnectIQ" /tmp/bin
ln -s /sdk/share /tmp/share
ln -s /sdk/resources /tmp/resources
for entry in /sdk/bin/*; do name=$(basename "$entry"); case "$name" in simulator|shell) continue;; esac; ln -s "$entry" "/tmp/bin/$name"; done
if [ -d /device-cache/Devices ]; then ln -s /device-cache/Devices "$HOME/.Garmin/ConnectIQ/Devices"; fi
if [ -d /device-cache/Fonts ]; then ln -s /device-cache/Fonts "$HOME/.Garmin/ConnectIQ/Fonts"; fi
test -r "$HOME/.Garmin/ConnectIQ/Fonts/Roboto-Regular.ttf" || { echo 'Required SDK Fonts cache is missing'; exit 7; }
cp /sdk/bin/simulator /sdk/bin/shell /tmp/bin/
chmod 700 /tmp/bin/simulator /tmp/bin/shell
Xvfb :99 -screen 0 1200x1000x24 -nolisten tcp > /output/xvfb.log 2>&1 &
xpid=$!
spid=""
mpid=""
cleanup(){ if [ -r /sys/fs/cgroup/memory.peak ]; then cat /sys/fs/cgroup/memory.peak > /output/memory-peak-bytes.txt; elif [ -r /sys/fs/cgroup/memory/memory.max_usage_in_bytes ]; then cat /sys/fs/cgroup/memory/memory.max_usage_in_bytes > /output/memory-peak-bytes.txt; else echo unknown > /output/memory-peak-bytes.txt; fi; import -window root /output/desktop.png 2>/dev/null || true; if [ -n "$mpid" ]; then kill "$mpid" 2>/dev/null || true; fi; if [ -n "$spid" ]; then kill "$spid" 2>/dev/null || true; fi; kill "$xpid" 2>/dev/null || true; }
trap cleanup EXIT
for i in $(seq 1 30); do if xdpyinfo >/dev/null 2>&1; then break; fi; sleep 1; done
cd /output
if [ "${PROBE_TRACE:-0}" = 1 ]; then
 strace -f -e trace=file -o /output/files.log /tmp/bin/simulator > /output/simulator.log 2>&1 &
else
 /tmp/bin/simulator > /output/simulator.log 2>&1 &
fi
spid=$!
for i in $(seq 1 30); do
 kill -0 "$spid" 2>/dev/null || { cat /output/simulator.log; exit 3; }
 if xdotool search --onlyvisible --name 'CIQ Simulator|Connect IQ' >/tmp/window-id 2>/dev/null; then break; fi
 sleep 1
done
java -classpath /sdk/bin/monkeybrains.jar com.garmin.monkeybrains.monkeydodeux.MonkeyDoDeux -f /input/watchface.prg -d "$DEVICE" -s /tmp/bin/shell > /output/monkeydo.log 2>&1 &
mpid=$!
ready=0
for i in $(seq 1 45); do
 kill -0 "$spid" 2>/dev/null || { echo 'simulator exited before frame'; exit 6; }
 if grep -Fq "$ready_marker" /output/monkeydo.log; then ready=1; break; fi
 if ! kill -0 "$mpid" 2>/dev/null; then break; fi
 sleep 1
done
if [ "$ready" != 1 ]; then echo 'No expected frame report before timeout'; exit 8; fi
sleep 3
kill -0 "$spid" 2>/dev/null || { echo "simulator exited before capture"; cat /output/simulator.log; exit 6; }
import -window root /output/desktop.png
xdotool search --onlyvisible --name 'CIQ Simulator|Connect IQ' getwindowgeometry --shell > /output/window.txt || true
printf 'Fixture frame marker received and desktop captured; AOD and visual fidelity still require verification.\n'
printf 'device=%s\nprgSha256=%s\nmode=not_verified\ncapture=desktop\n' "$DEVICE" "$(sha256sum /input/watchface.prg | cut -d' ' -f1)" > /output/capture-metadata.txt
head -1 /sdk/bin/version.txt >> /output/capture-metadata.txt
grep -F "$ready_marker" /output/monkeydo.log | tail -1 >> /output/capture-metadata.txt
if [ "${PROBE_CAPTURE_DIALOG:-0}" = 1 ]; then
 xdotool mousemove 16 12 click 1 mousemove 104 37 click 1
 sleep 1
 import -window root /output/capture-dialog.png
 xdotool search --onlyvisible --class simulator > /tmp/dialog-windows || true
 dialog=$(tail -1 /tmp/dialog-windows)
 if [ -n "$dialog" ]; then
  xdotool getwindowname "$dialog" > /output/save-window-name.txt
  xdotool windowfocus "$dialog"
  xdotool mousemove --window "$dialog" 230 27 click 1
  name="native-$(date -u +%Y%m%d%H%M%S)-$$.png"
  xdotool key ctrl+a
  xdotool type --clearmodifiers "$name"
  sleep 1
  xdotool key Return
  width=$(xdotool getwindowgeometry --shell "$dialog" | grep '^WIDTH=' | cut -d= -f2)
  height=$(xdotool getwindowgeometry --shell "$dialog" | grep '^HEIGHT=' | cut -d= -f2)
  xdotool mousemove --window "$dialog" "$((width-50))" "$((height-24))" click 1
  sleep 2
  if [ -s "/output/$name" ]; then identify "/output/$name"; printf 'nativeCapture=%s\n' "$name" >> /output/capture-metadata.txt; else import -window root /output/capture-save-failed.png; echo "Native screenshot save failed"; exit 9; fi
 else echo "Native screenshot dialog missing"; exit 9
 fi
fi
if [ "$hold" != 0 ]; then sleep "$hold"; fi
