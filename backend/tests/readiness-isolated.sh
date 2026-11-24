set -eu
# Run from the deployment directory. Uses only a temporary container and read-only SDK mounts.
docker run -d --rm --name gfc-readiness-stage2 -p 127.0.0.1:18381:8080 -e GFC_DATA=/tmp/jobs -e GFC_DEVICES=/devices -v "$PWD/runtime/sdk:/opt/connectiq:ro" -v "$PWD/runtime/secrets/developer_key:/run/secrets/developer_key:ro" -v "$PWD/runtime/garmin/Devices/venu3:/devices/venu3:ro" garminfacecreator-app
trap 'docker stop gfc-readiness-stage2 >/dev/null' EXIT
python3 - <<'PY'
import urllib.request, urllib.error, json, time, uuid
base='http://127.0.0.1:18381'
for n in range(50):
 try:
  cap=json.load(urllib.request.urlopen(base+'/api/capabilities', timeout=2)); break
 except (OSError, urllib.error.URLError): time.sleep(.2)
else: raise RuntimeError('isolated test service did not start')
assert cap['common']['ready'], cap
states={d['target']:d for d in cap['devices']}
assert states['venu3']['ready'], cap
assert not states['venu445mm']['ready'], cap
assert cap['ready'], cap
boundary='gfc-readiness-boundary'
meta=json.dumps(dict(projectId=str(uuid.uuid4()),appId='4c3f31fda59c4f9bb25c4f7774eca711',target='venu445mm',revision=1))
body=('--'+boundary+'\r\nContent-Disposition: form-data; name="project"\r\n\r\n'+meta+'\r\n--'+boundary+'--\r\n').encode()
request=urllib.request.Request(base+'/api/builds',data=body,headers={'Content-Type':'multipart/form-data; boundary='+boundary})
try: urllib.request.urlopen(request); raise AssertionError('missing target accepted')
except urllib.error.HTTPError as e:
 assert e.code==503, (e.code,e.read())
 assert 'venu445mm' in json.load(e)['detail']
print('PASS isolated readiness: Venu 3 ready with Venu 4 45mm absent; missing target refused before queue')
PY
