"""Fetch pinned, selected upstream SVG assets. Never executes upstream packages."""
from pathlib import Path
from io import BytesIO
import base64, hashlib, json, tarfile, urllib.request
import xml.etree.ElementTree as ET
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/"frontend/public/icon-library"
LUCIDE="586bf5cf9bcf4129a63c0ce574602b23ca24f324"
METEOCONS="1d821149b94a08f23c85e5042e8a61a3fcd82cf7"
TARBALL="https://registry.npmjs.org/@meteocons/svg-static/-/svg-static-0.1.0.tgz"
INTEGRITY="dnuXOkt1W5q+XZbyj54dzjuBcKmsC0eLv51IVaW9kzzvzwnhwv9KgNXHKgpvmdN6cX2stMo+k95iMFbcyM4x5Q=="
def fetch(url):
    req=urllib.request.Request(url,headers={"User-Agent":"GarminFaceCreator-pinned-icons"})
    with urllib.request.urlopen(req,timeout=60) as response: return response.read(12000000)
def validate(data):
    if b"<!DOCTYPE" in data.upper() or len(data)>100000: raise ValueError("Unsafe SVG")
    root=ET.fromstring(data)
    if root.tag!="{http://www.w3.org/2000/svg}svg" or not root.get("viewBox"):raise ValueError("Missing SVG viewBox")
    for node in root.iter():
        tag=node.tag.split("}")[-1]
        if tag in {"script","animate","animateTransform","animateMotion","set","foreignObject","image","use"}:raise ValueError("Non-static or external SVG")
        for key,value in node.attrib.items():
            if key.lower().startswith("on") or "href" in key.lower() or "http:" in value or "https:" in value:raise ValueError("External/event attribute")
    return root.get("viewBox")
def main():
    OUT.mkdir(parents=True,exist_ok=True);(OUT/"licenses").mkdir(exist_ok=True)
    icons=[]
    def save(provider,name,title,style,data,commit,source,license_id,license_file,package=None):
        viewbox=validate(data);folder=OUT/provider;folder.mkdir(exist_ok=True)
        filename=(style+"-" if style else "")+name+".svg";path=folder/filename;path.write_bytes(data)
        icons.append({"id":(provider+"_"+("586bf5cf" if provider=="lucide" else "0_1_0")+"_"+filename[:-4]).replace("-","_"),"name":title,"keywords":[name,title,style],"provider":provider,"style":style or "outline","path":"/icon-library/"+provider+"/"+filename,"source":source,"upstreamPath":("icons/"+name+".svg") if provider=="lucide" else (style+"/"+name+".svg"),"commit":commit,"package":package,"license":license_id,"licensePath":"/icon-library/licenses/"+license_file,"copyright":"Lucide Icons and Contributors; Feather contributors (see full license)" if provider=="lucide" else "2020-present Bas Milius","sha256":hashlib.sha256(data).hexdigest(),"viewBox":viewbox,"customStroke":provider=="lucide"})
    lucide_base="https://raw.githubusercontent.com/lucide-icons/lucide/"+LUCIDE+"/"
    (OUT/"licenses/Lucide-LICENSE.txt").write_bytes(fetch(lucide_base+"LICENSE"))
    for name,title in [("heart-pulse","心率"),("footprints","步数"),("activity","活动"),("battery-full","电量"),("calendar-days","日历"),("thermometer","温度"),("mountain","海拔"),("bluetooth","蓝牙"),("flame","热量"),("wind","风速")]:
        save("lucide",name,title,"",fetch(lucide_base+"icons/"+name+".svg"),LUCIDE,"https://github.com/lucide-icons/lucide/blob/"+LUCIDE+"/icons/"+name+".svg","ISC + Feather MIT notices","Lucide-LICENSE.txt")
    data=fetch(TARBALL)
    if base64.b64encode(hashlib.sha512(data).digest()).decode()!=INTEGRITY:raise ValueError("Static package integrity mismatch")
    with tarfile.open(fileobj=BytesIO(data),mode="r:gz") as archive:
        def read(name):
            member=archive.getmember("package/"+name)
            if not member.isfile() or member.size>100000:raise ValueError("Unexpected archive member")
            return archive.extractfile(member).read()
        (OUT/"licenses/Meteocons-LICENSE.txt").write_bytes(read("LICENSE"))
        weather=[("clear-day","晴天"),("clear-night","晴夜"),("partly-cloudy-day","日间多云"),("partly-cloudy-night","夜间多云"),("overcast","阴天"),("rain","雨"),("snow","雪"),("thunderstorms","雷暴"),("fog","雾"),("wind","风"),("not-available","天气缺失")]
        for style,selected in [("monochrome",weather),("flat",[weather[i] for i in [0,4,5,6]]),("line",[weather[i] for i in [0,5]]),("fill",[weather[0]])]:
            for name,title in selected:
                save("meteocons",name,title+" · "+style,style,read(style+"/"+name+".svg"),METEOCONS,"https://www.npmjs.com/package/@meteocons/svg-static/v/0.1.0","MIT","Meteocons-LICENSE.txt","@meteocons/svg-static@0.1.0")
    for name in ["Lucide-LICENSE.txt","Meteocons-LICENSE.txt"]:
        content=(OUT/"licenses"/name).read_bytes()
        if b"Permission" not in content or b"Copyright" not in content:raise ValueError("Incomplete license")
    (OUT/"catalog.json").write_text(json.dumps({"format":1,"icons":icons,"packageIntegrity":"sha512-"+INTEGRITY},ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print("Pinned static icons:",len(icons))
if __name__=="__main__":main()
