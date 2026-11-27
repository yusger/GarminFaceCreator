#!/bin/bash
# Operator-only fixture protocol. Normal verification never enters this gate.
# All paths and actions are fixed inside the per-job bounded tmpfs; PRG/host mounts do not change.
gfc_ui_hash_request(){
 local file=$1 expected=$2 size
 [[ -f "$file" && ! -L "$file" ]] || return 1
 size=$(wc -c < "$file")
 [[ "$size" =~ ^[[:space:]]*(64|65)[[:space:]]*$ ]] || return 1
 [[ "$(cat "$file")" = "$expected" ]]
}
gfc_ui_stop_simulator(){
 if [[ -n "$mpid" ]]; then kill "$mpid" 2>/dev/null || true; fi
 local windows="" window
 windows=$(xdotool search --onlyvisible --name 'CIQ Simulator|Connect IQ' 2>/dev/null || true)
 for window in $windows; do xdotool windowclose "$window" 2>/dev/null || true; done
 for i in $(seq 1 5); do if ! kill -0 "$spid" 2>/dev/null; then break; fi; sleep 1; done
 if kill -0 "$spid" 2>/dev/null; then kill "$spid" 2>/dev/null || true; fi
}
gfc_theme_ui_gate(){
 local expected deadline restarted=0 readyCount
 expected=$(sha256sum /input/watchface.prg | cut -d' ' -f1)
 [[ "$expected" =~ ^[a-f0-9]{64}$ ]] || return 12
 deadline=$((SECONDS+80))
 printf 'scenario=theme-ui-v1\nprgSha256=%s\n' "$expected" > /output/theme-ui-session.txt
 sleep 1
 import -window root /output/theme-ui-boot-desktop.png
 printf '%s\n' "$expected" > /output/theme-ui-boot.ready
 while (( SECONDS < deadline )); do
  if gfc_ui_hash_request /output/theme-ui.done "$expected"; then
   printf 'operatorComplete=true\nrestarts=%s\n' "$restarted" >> /output/theme-ui-session.txt
   return 0
  fi
  if (( restarted == 0 )) && gfc_ui_hash_request /output/theme-ui-restart.request "$expected"; then
   restarted=1
   printf 'restartRequested=true\n' >> /output/theme-ui-session.txt
   gfc_ui_stop_simulator
   gfc_start_simulator
   gfc_start_app
   readyCount=0
   for i in $(seq 1 25); do
    if (( SECONDS >= deadline )); then break; fi
    kill -0 "$spid" 2>/dev/null || return 12
    readyCount=$(grep -Fc "$ready_marker" /output/monkeydo.log || true)
    if (( readyCount >= 2 )); then break; fi
    sleep 1
   done
   (( readyCount >= 2 )) || return 12
   [[ "$(sha256sum /input/watchface.prg | cut -d' ' -f1)" = "$expected" ]] || return 12
   printf '%s\n' "$expected" > /output/theme-ui-restart.ready
   printf 'samePrgRestartReady=true\n' >> /output/theme-ui-session.txt
  fi
  sleep 0.2
 done
 echo 'Interactive fixture deadline reached; no completed capture is reported' >&2
 return 12
}
