#!/bin/bash
set -euo pipefail
source "${1:?operator gate module required}"
fixture=$(mktemp -d)
cleanup(){ rm -f "$fixture/request" "$fixture/link";rmdir "$fixture"; }
trap cleanup EXIT
expected=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
printf '%s' "$expected" > "$fixture/request"
gfc_ui_hash_request "$fixture/request" "$expected"
printf '\n' >> "$fixture/request"
gfc_ui_hash_request "$fixture/request" "$expected"
printf 'x' >> "$fixture/request"
if gfc_ui_hash_request "$fixture/request" "$expected";then echo 'Oversized request accepted' >&2;exit 1;fi
printf '%s\n' bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb > "$fixture/request"
if gfc_ui_hash_request "$fixture/request" "$expected";then echo 'Wrong digest accepted' >&2;exit 1;fi
printf '%s\n' "$expected" > "$fixture/request"
ln -s "$fixture/request" "$fixture/link"
if gfc_ui_hash_request "$fixture/link" "$expected";then echo 'Linked request accepted' >&2;exit 1;fi
if gfc_ui_hash_request "$fixture/missing" "$expected";then echo 'Missing request accepted' >&2;exit 1;fi
echo 'PASS fixed-digest operator requests, length bounds, missing files and symlink rejection'
