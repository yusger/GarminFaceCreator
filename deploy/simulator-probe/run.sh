#!/bin/bash
set -euo pipefail
: "${DEVICE:?Set DEVICE to the exact compiled target}"
[[ "$DEVICE" =~ ^[a-z0-9]+$ ]] || exit 2
mkdir -p "$HOME/.Garmin/ConnectIQ" /tmp/bin
if [ -d /device-cache/Devices ]; then ln -s /device-cache/Devices "$HOME/.Garmin/ConnectIQ/Devices"; fi
cp /sdk/bin/simulator /sdk/bin/shell /tmp/bin/
chmod 700 /tmp/bin/simulator /tmp/bin/shell
Xvfb :99 -screen 0 1200x1000x24 -nolisten tcp > /output/xvfb.log 2>&1 &
xpid=$!
spid=""
cleanup(){ import -window root /output/desktop.png 2>/dev/null || true; if [ -n "$spid" ]; then kill "$spid" 2>/dev/null || true; fi; kill "$xpid" 2>/dev/null || true; }
trap cleanup EXIT
for i in $(seq 1 30); do if xdpyinfo >/dev/null 2>&1; then break; fi; sleep 1; done
cd /sdk/bin
/tmp/bin/simulator > /output/simulator.log 2>&1 &
spid=$!
for i in $(seq 1 30); do
 kill -0 "$spid" 2>/dev/null || { cat /output/simulator.log; exit 3; }
 if xdotool search --onlyvisible --name 'CIQ Simulator|Connect IQ' >/tmp/window-id 2>/dev/null; then break; fi
 sleep 1
done
java -classpath /sdk/bin/monkeybrains.jar com.garmin.monkeybrains.monkeydodeux.MonkeyDoDeux -f /input/watchface.prg -d "$DEVICE" -s /tmp/bin/shell > /output/monkeydo.log 2>&1 &
mpid=$!
for i in $(seq 1 30); do if ! kill -0 "$mpid" 2>/dev/null; then break; fi; sleep 1; done
if kill -0 "$mpid" 2>/dev/null; then kill "$mpid"; echo 'monkeydo timeout'; exit 4; fi
wait "$mpid" || { cat /output/monkeydo.log; exit 5; }
sleep 3
import -window root /output/desktop.png
xdotool search --onlyvisible --name 'CIQ Simulator|Connect IQ' getwindowgeometry --shell > /output/window.txt || true
printf 'Prototype desktop captured; application rendering and AOD require independent verification.\n'
