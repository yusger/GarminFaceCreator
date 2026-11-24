set -eu
# Isolated synthetic jobs only; no mounts to the live job directory or signing key.
GFC_TEST_DATA=$(mktemp -d /tmp/gfc-retention-stage8-XXXXXX)
trap 'docker stop gfc-retention-stage8 >/dev/null 2>&1 || true; case "$GFC_TEST_DATA" in /tmp/gfc-retention-stage8-*) rm -rf -- "$GFC_TEST_DATA";; esac' EXIT
python3 - "$GFC_TEST_DATA" <<'PY'
import json, os, sys, datetime
root=sys.argv[1]
now=datetime.datetime.now(datetime.timezone.utc)
for n,days,status in [(1,0,'succeeded'),(2,10,'succeeded'),(3,40,'failed'),(4,10,'running'),(5,10,'cancelled')]+[(i,10,'failed') for i in range(10,215)]:
 job=f'{n:032x}'
 folder=os.path.join(root,job)
 os.makedirs(os.path.join(folder,'project'));os.makedirs(os.path.join(folder,'output'))
 for part in ['project/source.mc','output/watchface.prg']:
  with open(os.path.join(folder,part),'w') as f:f.write('synthetic test')
 date=(now-datetime.timedelta(days=days)).isoformat()
 value=dict(id=job,projectId='test',appId='4c3f31fda59c4f9bb25c4f7774eca711',target='venu445mm',projectName='RetentionTest',revision=1,status=status,created=date,finished=date,logs=['synthetic log'])
 with open(os.path.join(folder,'job.json'),'w') as f:json.dump(value,f)
PY
chown -R 1654:1654 "$GFC_TEST_DATA"
docker run -d --rm --name gfc-retention-stage8 -p 127.0.0.1:18382:8080 -e GFC_DATA=/data/jobs -v "$GFC_TEST_DATA:/data/jobs" garminfacecreator-app
python3 - "$GFC_TEST_DATA" <<'PY'
import urllib.request,urllib.error,json,time,sys,os
base='http://127.0.0.1:18382'
for n in range(100):
 try:json.load(urllib.request.urlopen(base+'/api/health',timeout=2));break
 except (OSError,urllib.error.URLError):time.sleep(.2)
else:raise RuntimeError('retention test service not ready')
def job(n):return json.load(urllib.request.urlopen(base+'/api/builds/'+f'{n:032x}'))
assert not job(1)['artifactExpired']
assert job(4)['status']=='interrupted'
assert not job(4)['projectExpired']
# Oldest eligible records are pruned, newer recent/interrupted records survive.
assert len(os.listdir(sys.argv[1]))<=200
remaining=[]
for name in os.listdir(sys.argv[1]):
 value=json.load(open(os.path.join(sys.argv[1],name,'job.json')))
 if value['id'] not in [f'{1:032x}',f'{4:032x}']:
  assert value['projectExpired'] and value['artifactExpired'] and value['logsExpired']
  assert not os.path.exists(os.path.join(sys.argv[1],name,'project'))
  assert not os.path.exists(os.path.join(sys.argv[1],name,'output'))
  remaining.append(value)
assert remaining
print('PASS isolated retention: component expiry, terminal count, restart interruption, recent protection; no live data touched')
PY
