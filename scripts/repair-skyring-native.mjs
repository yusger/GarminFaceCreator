import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash,randomUUID} from 'node:crypto';
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export function repairSkyRing(input){
 const p=structuredClone(input),view=p.files.find(f=>f.path==='source/SkyRingView.mc');
 if(!view||!view.content.includes('class SkyRingView')||!view.content.includes('function _drawMetrics'))throw Error('Expected the audited SkyRing engineering project');
 const before=createHash('sha256').update(view.content).digest('hex');let s=view.content;
 function method(name,body){const start=s.indexOf('    function '+name+'(');if(start<0)throw Error('Missing method '+name);let brace=s.indexOf('{',start),depth=1,end=brace+1;for(;end<s.length&&depth;end++){if(s[end]==='{')depth++;if(s[end]==='}')depth--;}if(depth)throw Error('Unbalanced method');s=s.slice(0,start)+body.trimEnd()+'\n'+s.slice(end);}
 s=s.replace('    var _isAod','    var _fonts = {};\n    var _icons;\n    var _smallIcons;\n    var _isAod');
 s=s.replace('var _altitude as Float = -1.0f;','var _altitude as Float or Null = null;').replaceAll('_altitude = -1.0f;','_altitude = null;');
 s=s.replace('        _sy = _h / 454.0f;','        _sy = _h / 454.0f;\n        _fonts = {};\n        _icons = WatchUi.loadResource(Rez.Fonts.F_icons22);\n        _smallIcons = WatchUi.loadResource(Rez.Fonts.F_icons16);');
 // Cached weather only during sleep; preserve the existing live data collector.
 s=s.replace('        try {\n            _weather = Weather.getCurrentConditions();\n        } catch (e) {\n            _weather = null;\n        }','        if (!lowPower) {\n            try { _weather = Weather.getCurrentConditions(); }\n            catch (e) { _weather = null; }\n        }');
 method('_drawDate',`    function _drawDate(dc as Dc, info as Gregorian.Info) as Void {
        var days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
        _label(dc, 142, 56, 170, 27, 23, days[info.day_of_week - 1] + " " + info.day.toString(), 0xE8DECF);
    }`);
 method('_drawTime',`    function _drawTime(dc as Dc, hour as Number, minute as Number) as Void {
        _label(dc, 102, 85, 250, 74, 66, hour.format("%02d") + ":" + minute.format("%02d"), _isAod ? 0x777777 : 0xE8DECF);
    }`);
 method('_drawSunTexts',`    function _drawSunTexts(dc as Dc) as Void {
        // Literal solar labels are retained design samples, not live astronomy.
        _icon(dc, 211, 39, "c", 0xF9C35A, false);
        _label(dc, 219, 30, 53, 18, 18, "50°", 0xF9C35A);
        _icon(dc, 101, 170, "c", 0xF9C35A, false);
        _label(dc, 113, 160, 65, 20, 20, "18:55", 0xF9C35A);
        _icon(dc, 188, 170, "L", 0xC8A866, true);
        _label(dc, 197, 161, 55, 18, 18, "-11°", 0xC8A866);
        _label(dc, 253, 161, 143, 18, 18, "11h 2m to sunrise", 0xE8DECF);
        _arrow(dc, 37, 188, true, 0xE9A456);
        _arrow(dc, 417, 188, false, 0x77B7F2);
        _label(dc, 17, 200, 40, 18, 18, "8:09", 0xE8DECF);
        _label(dc, 397, 200, 40, 18, 18, "8:13", 0xE8DECF);
    }`);
 method('_drawMetrics',`    function _drawMetrics(dc as Dc) as Void {
        var heartColor = _hr < 0 ? 0x777777 : (_hr < 120 ? 0x55FF99 : (_hr < 150 ? 0xFFEE44 : 0xFF5566));
        _icon(dc, 103, 215, "H", heartColor, false);
        _label(dc, 120, 198, 57, 34, 34, _hr > 0 ? _hr.format("%.0f") : "--", heartColor);
        _icon(dc, 209, 215, "V", 0xF08070, false);
        _label(dc, 223, 198, 44, 34, 34, _stress >= 0 ? _stress.format("%.0f") : "--", 0xE8DECF);
        _icon(dc, 309, 215, "R", 0xEF8878, false);
        _label(dc, 325, 199, 59, 32, 32, _recovery >= 0 ? _recovery.format("%.0f") + "h" : "--", 0xE8DECF);
        _label(dc, 282, 245.5, 96, 17, 17, "RECOVERY", 0xE8DECF);
        _icon(dc, 135, 282, "S", 0x6CCEB6, false);
        _label(dc, 151, 269, 84, 28, 28, _steps >= 0 ? _steps.format("%.0f") : "--", 0xE8DECF);
        _label(dc, 292, 276, 90, 20, 20, "7d 8642", 0xE8DECF);
        _icon(dc, 93, 321, "I", 0x6CCEB6, false);
        _label(dc, 109, 309.5, 75, 23, 23, _intensity >= 0 ? _intensity.format("%.0f") + "min" : "--", 0xE8DECF);
        _icon(dc, 235, 321, "K", 0x6CCEB6, false);
        _label(dc, 252, 308.5, 52, 25, 25, _calories >= 0 ? _calories.format("%.0f") : "--", 0xE8DECF);
        _icon(dc, 326, 321, "F", 0x6CCEB6, false);
        _label(dc, 342, 308.5, 34, 25, 25, _floors >= 0 ? _floors.format("%.0f") : "--", 0xE8DECF);
    }`);
 method('_drawWeather',`    function _drawWeather(dc as Dc) as Void {
        var temp = "--"; var hum = "--"; var wind = "--"; var uv = "--";
        if (_weather != null) {
            if (_weather.temperature != null) { temp = _weather.temperature.format("%.0f") + "°C"; }
            if (_weather.relativeHumidity != null) { hum = _weather.relativeHumidity.format("%.0f") + "%"; }
            if (_weather.windSpeed != null) { wind = _weather.windSpeed.format("%.1f"); }
            if ((_weather has :uvIndex) && _weather.uvIndex != null) { uv = _weather.uvIndex.format("%.0f"); }
        }
        _icon(dc, 111, 361, "C", 0x79C0FF, false);
        _label(dc, 129, 348, 64, 28, 28, temp, 0xE8DECF);
        _label(dc, 185, 359, 48, 14, 14, "25/18", 0xA7A6A0);
        _label(dc, 239, 349, 68, 26, 26, hum, 0xE8DECF);
        _label(dc, 311, 353, 30, 18, 18, "UV", 0x83B7EC);
        _label(dc, 340, 349.5, 30, 25, 25, uv, 0xE8DECF);
        _label(dc, 123, 387, 27, 18, 18, "WX", 0x83B7EC);
        _label(dc, 151, 387, 42, 18, 18, wind + (wind.equals("--") ? "" : "m/s"), 0xE8DECF);
        dc.setColor(0xC1C4C0, Graphics.COLOR_TRANSPARENT); dc.setPenWidth(1);
        dc.drawRectangle(202*_sx, 390*_sy, 15*_sx, 10*_sy); dc.drawLine(219*_sx, 393*_sy, 219*_sx, 397*_sy);
        _label(dc, 221, 387, 48, 18, 18, _battery >= 0 ? _battery.format("%.0f") + "%" : "--", 0xE8DECF);
        _icon(dc, 285, 396, "L", 0xB4B3AC, true);
        _label(dc, 297, 387, 54, 18, 18, _altitude != null ? _altitude.format("%.0f") + "ft" : "--", 0xE8DECF);
    }`);
 // Restore the design's tangential ring strokes; the AI used radial squares.
 const ring=p.layers.filter(l=>Number(l.id?.split('-').at(-1))>=2&&Number(l.id?.split('-').at(-1))<=73&&l.kind==='line');
 if(ring.length!==72)throw Error('Expected the original 72-segment SkyRing ring');
 let ringBody='    function _drawSkyRing(dc as Dc) as Void {\n';
 for(const l of ring){const a=l.rotation*Math.PI/180,cx=l.x+l.w/2,cy=l.y+l.h/2,n=x=>Number(x.toFixed(4));ringBody+=`        dc.setColor(0x${l.color.slice(1)}, Graphics.COLOR_TRANSPARENT); dc.setPenWidth(12); dc.drawLine(${n(cx-Math.cos(a)*l.w/2)}*_sx, ${n(cy-Math.sin(a)*l.w/2)}*_sy, ${n(cx+Math.cos(a)*l.w/2)}*_sx, ${n(cy+Math.sin(a)*l.w/2)}*_sy);\n`;}
 ringBody+='    }';method('_drawSkyRing',ringBody);
 const helpers=`
    function _font(size as Number) {
        if (!_fonts.hasKey(size)) {
            var faces = size >= 60 ? ["RobotoCondensedBold", "RobotoCondensedRegular"] : ["RobotoCondensedRegular", "RobotoRegular"];
            var f = Graphics.getVectorFont({:face => faces, :size => size});
            if (f == null) { f = Graphics.FONT_XTINY; }
            _fonts[size] = f;
        }
        return _fonts[size];
    }
    function _label(dc as Dc, x as Numeric, y as Numeric, w as Numeric, h as Numeric, size as Number, value as String, color as Number) as Void {
        var pixels = Math.max(10, Math.floor(size * _sy / 2.0f) * 2).toNumber(); var font = _font(pixels);
        // Width-fit only within this field; never move neighbouring fields.
        while (dc.getTextWidthInPixels(value, font) > w * _sx && pixels > 10) {
            pixels -= 2; font = _font(pixels);
        }
        dc.setColor(color, Graphics.COLOR_TRANSPARENT);
        dc.drawText(((x+w/2.0f)*_sx).toNumber(), ((y+h/2.0f)*_sy).toNumber(), font, value, Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);
    }
    function _icon(dc as Dc, x as Numeric, y as Numeric, glyph as String, color as Number, small as Boolean) as Void {
        dc.setColor(color, Graphics.COLOR_TRANSPARENT);
        dc.drawText((x*_sx).toNumber(), (y*_sy).toNumber(), small ? _smallIcons : _icons, glyph, Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);
    }
    function _arrow(dc as Dc, x as Numeric, y as Numeric, up as Boolean, color as Number) as Void {
        var tip = up ? y-6 : y+6; var tail = up ? y-2 : y+2;
        dc.setColor(color, Graphics.COLOR_TRANSPARENT); dc.setPenWidth(1);
        dc.drawLine(x*_sx, (y-6)*_sy, x*_sx, (y+6)*_sy);
        dc.drawLine((x-3)*_sx, tail*_sy, x*_sx, tip*_sy);
        dc.drawLine((x+3)*_sx, tail*_sy, x*_sx, tip*_sy);
    }
`;
 s=s.replace(/\n}\s*$/,helpers+'\n}\n');
 // Preserve original decorative geometry and explicitly retain its sample status.
 const decorations=p.layers.filter(l=>{const n=Number(l.id?.split('-').at(-1));return n>=104&&n<=143&&['line','rect'].includes(l.kind);});
 let draw='    function _drawSampleDecorations(dc as Dc) as Void {\n        // Original design examples only: these are NOT sensor history or real progress.\n';
 for(const l of decorations){draw+=`        dc.setColor(0x${l.color.slice(1)}, Graphics.COLOR_TRANSPARENT);\n`;if(l.kind==='rect')draw+=`        dc.fillRectangle(${l.x}*_sx, ${l.y}*_sy, ${l.w}*_sx, ${l.h}*_sy);\n`;else{const a=l.rotation*Math.PI/180,cx=l.x+l.w/2,cy=l.y+l.h/2;const n=x=>Number(x.toFixed(4));draw+=`        dc.setPenWidth(${l.strokeWidth||1}); dc.drawLine(${n(cx-Math.cos(a)*l.w/2)}*_sx, ${n(cy-Math.sin(a)*l.w/2)}*_sy, ${n(cx+Math.cos(a)*l.w/2)}*_sx, ${n(cy+Math.sin(a)*l.w/2)}*_sy);\n`;}}draw+='    }\n';s=s.replace(/\n}\s*$/,'\n'+draw+'}\n');
 s=s.replace('        _drawBackground(dc);','        if (_isAod) {\n            _drawTime(dc, hour, minute);\n            _label(dc, 177, 350, 100, 24, 23, _battery >= 0 ? _battery.format("%.0f") + "%" : "--", 0x777777);\n            return;\n        }\n        _drawBackground(dc);').replace('        _drawMetrics(dc);','        _drawSampleDecorations(dc);\n        _drawMetrics(dc);');
 view.content=s;
 const fontRoot=path.join(repo,'resources/default-watchfaces/skyring/resources/fonts');
 for(const f of ['icons22.fnt','icons16.fnt','fonts.xml']){const entry={path:'resources/fonts/'+f,content:fs.readFileSync(path.join(fontRoot,f),'utf8')};p.files=p.files.filter(x=>x.path!==entry.path);p.files.push(entry);}
 for(const f of ['icons22.png','icons16.png']){const entry={path:'resources/fonts/'+f,data:'data:image/png;base64,'+fs.readFileSync(path.join(fontRoot,f)).toString('base64')};p.assets=(p.assets||[]).filter(x=>x.path!==entry.path);p.assets.push(entry);}
 p.codeProvenance={...p.codeProvenance,patches:[...(p.codeProvenance?.patches||[]),{source:'manual',at:Date.now()}]};p.updated=Date.now();
 p.activeCodeVersion=randomUUID();p.codeRevision=p.revision;
 p.versions=[...(p.versions||[]),{id:p.activeCodeVersion,at:p.updated,revision:p.revision,files:structuredClone(p.files),assets:structuredClone(p.assets),provenance:structuredClone(p.codeProvenance)}];
 return {project:p,evidence:{beforeViewSha256:before,afterViewSha256:createHash('sha256').update(s).digest('hex'),paidModelCalls:0,classification:'Manual repair of existing AI output; not a new AI success',originalSampleDecorations:decorations.length,staticLabels:['solar labels','7d 8642','25/18','illustrative charts'],drawingChanged:true}};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [input,output]=process.argv.slice(2);if(!input||!output||path.resolve(input)===path.resolve(output))throw Error('Use distinct input and output project JSON paths');const r=repairSkyRing(JSON.parse(fs.readFileSync(input,'utf8')));fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(r.project));fs.writeFileSync(output+'.repair.json',JSON.stringify(r.evidence,null,2)+'\n');console.log(JSON.stringify(r.evidence));
}
