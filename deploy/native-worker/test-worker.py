#!/usr/bin/env python3
"""Explicit private IPC integration test; consumes three native runs when negatives enabled."""
import concurrent.futures,hashlib,http.client,json,os,socket,time,uuid
from pathlib import Path
if os.environ.get('GFC_NATIVE_TEST')!='1':raise SystemExit('Set GFC_NATIVE_TEST=1 explicitly')
endpoint=os.environ['GFC_NATIVE_SOCKET'];fixtures=Path(os.environ['GFC_NATIVE_FIXTURE_DIR']);output=Path(os.environ['GFC_NATIVE_OUTPUT_DIR']);output.mkdir(parents=True,exist_ok=True)
class UnixHTTP(http.client.HTTPConnection):
 def __init__(self):super().__init__('localhost',timeout=180)
 def connect(self):
  self.sock=socket.socket(socket.AF_UNIX,socket.SOCK_STREAM);self.sock.settimeout(self.timeout);self.sock.connect(endpoint)
def health():
 c=UnixHTTP()
 try:c.request('GET','/health');r=c.getresponse();assert r.status==200;return json.loads(r.read())
 finally:c.close()
def verify(data,target,digest=None):
 c=UnixHTTP()
 try:
  c.request('POST','/verify',body=data,headers={'Content-Type':'application/octet-stream','X-Gfc-Target':target,'X-Gfc-Prg-Sha256':digest or hashlib.sha256(data).hexdigest(),'X-Gfc-Build-Id':uuid.uuid4().hex});r=c.getresponse();return r.status,json.loads(r.read())
 finally:c.close()
assert health()['status']=='ok'
first=(fixtures/'venu445mm.prg').read_bytes();assert verify(first,'venu445mm;id')[0]==400;assert verify(first,'venu445mm','0'*64)[0]==400
with concurrent.futures.ThreadPoolExecutor(max_workers=1)as pool:
 running=pool.submit(verify,first,'venu445mm')
 for _ in range(30):
  if health()['busy']:break
  time.sleep(.2)
 else:raise AssertionError('Worker did not enter its single lane')
 assert verify(first,'venu445mm')[0]==429,'Concurrent run was not rejected'
 results=[('venu445mm',454,first,running.result())]
for target,pixels in [('venu441mm',390)]:
 data=(fixtures/(target+'.prg')).read_bytes();results.append((target,pixels,data,verify(data,target)))
for target,pixels,data,(status,result)in results:
 assert status==200 and result['success'],(status,result.get('error'),result.get('logs'))
 assert result['cleanupStatus']=='completed' and result['prgSha256']==hashlib.sha256(data).hexdigest()
 assert result['width']==pixels and result['height']==pixels and result['applicationMode']=='active'
 assert result['dataMode']=='simulator-defaults-dynamic' and result['hardware']=='unverified'
 import base64
 png=base64.b64decode(result.pop('pngBase64'));assert png[:8]==b'\x89PNG\r\n\x1a\n';assert int.from_bytes(png[16:20],'big')==pixels
 (output/(target+'.png')).write_bytes(png);(output/(target+'.json')).write_text(json.dumps(result,indent=2)+'\n')
 print('PASS',target,pixels,'native capture, matching digest and completed cleanup',flush=True)
if os.environ.get('GFC_NATIVE_NEGATIVE')=='1':
 status,result=verify(b'INVALID_NATIVE_TEST','venu445mm');assert status==200 and not result['success'] and not result.get('pngBase64');assert result['cleanupStatus']=='completed';print('PASS invalid PRG fails without successful screenshot',result['error'],flush=True)
assert health()['status']=='ok' and not health()['busy']
print('PASS identity rejection, single execution lane and final healthy state',flush=True)
