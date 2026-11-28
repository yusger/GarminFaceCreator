// GarminFaceCreator local generator basic-70-meter-stroke-reset; approximate system font mapping, no SDK fonts bundled.
// Target venu445mm; device metadata sdk-metadata-1-7722889381ba; package eddc2840754f6d29c6c9a3ede43befdaadd25a09; compiler SHA256 1aa85d1594c28318b66e6cdc656d4f5e7c782c81fbf488bd44a4b7c2439feaf4. Hardware/AOD/power unverified.
import Toybox.Application;import Toybox.WatchUi;import Toybox.Graphics;import Toybox.System;import Toybox.SensorHistory;import Toybox.ActivityMonitor;import Toybox.Time;import Toybox.Time.Gregorian;import Toybox.Weather;import Toybox.Math;
class GeneratedApp extends Application.AppBase {var mainView=null;function initialize(){AppBase.initialize();} function getInitialView(){mainView=new GeneratedView();return [mainView];}function getSettingsView(){return [new GfcSettingsMenu("root",null),new GfcSettingsDelegate()];}function onSettingsChanged(){if(mainView!=null){mainView.settingsCache=null;}WatchUi.requestUpdate();}}
class GeneratedView extends WatchUi.WatchFace {
 var gfcMetricCache={};
 

 var sleeping=false;var scale=1.0;var frameContext=null;var gfcFrameReported=false;
 function mixTextInk(ink,alpha,bg){var r=(((ink>>16)&255)*alpha+((bg>>16)&255)*(255-alpha))/255;var g=(((ink>>8)&255)*alpha+((bg>>8)&255)*(255-alpha))/255;var b=((ink&255)*alpha+(bg&255)*(255-alpha))/255;return (r.toNumber()<<16)|(g.toNumber()<<8)|b.toNumber();}
 
 
 
 function gfcSourceSetting(key,legacyKey,legacyChoices,codes,choices,fallback){
  var value=null;try{value=Application.Properties.getValue(key);}catch(e){}
  if(value instanceof Toybox.Lang.Number){for(var i=0;i<codes.size();i++){if(value==codes[i]){return choices[i];}}}
  var result=fallback;
  if(value==null || value==-1){try{var old=Application.Properties.getValue(legacyKey);if(old instanceof Toybox.Lang.Number && old>=0 && old<legacyChoices.size()){var candidate=legacyChoices[old];for(var i=0;i<choices.size();i++){if(choices[i].equals(candidate)){result=candidate;break;}}}}catch(e){}}
  for(var i=0;i<choices.size();i++){if(choices[i].equals(result)){try{Application.Properties.setValue(key,codes[i]);}catch(e){}break;}}return result;
 }
var settingsCache=null;function prepareSettings(){if(settingsCache==null){settingsCache={};settingsCache["Gfc_Source_apex_value_apex_tl"]=gfcSourceSetting("Gfc_Source_apex_value_apex_tl","Gfc_apex_value_apex_tl",["heartRate","steps","calories","distance","battery","temperature"],[1007610278,588927973,1492996704,473628861,1090669815,2019471002],["heartRate","steps","calories","distance","battery","temperature"],"heartRate");{var v=null;try{v=Application.Properties.getValue("Gfc_apex_value_apex_tl_color");}catch(e){}settingsCache["Gfc_apex_value_apex_tl_color"]=(v!=null && (v instanceof Toybox.Lang.Number && v>=0 && v<=16777215))?v:0x38E1D0;}settingsCache["Gfc_Source_apex_value_apex_tr"]=gfcSourceSetting("Gfc_Source_apex_value_apex_tr","Gfc_apex_value_apex_tr",["heartRate","steps","calories","distance","battery","temperature"],[1007610278,588927973,1492996704,473628861,1090669815,2019471002],["heartRate","steps","calories","distance","battery","temperature"],"steps");{var v=null;try{v=Application.Properties.getValue("Gfc_apex_value_apex_tr_color");}catch(e){}settingsCache["Gfc_apex_value_apex_tr_color"]=(v!=null && (v instanceof Toybox.Lang.Number && v>=0 && v<=16777215))?v:0xEAF1F6;}settingsCache["Gfc_Source_apex_value_apex_bl"]=gfcSourceSetting("Gfc_Source_apex_value_apex_bl","Gfc_apex_value_apex_bl",["heartRate","steps","calories","distance","battery","temperature"],[1007610278,588927973,1492996704,473628861,1090669815,2019471002],["heartRate","steps","calories","distance","battery","temperature"],"calories");{var v=null;try{v=Application.Properties.getValue("Gfc_apex_value_apex_bl_color");}catch(e){}settingsCache["Gfc_apex_value_apex_bl_color"]=(v!=null && (v instanceof Toybox.Lang.Number && v>=0 && v<=16777215))?v:0xFF6A1A;}settingsCache["Gfc_Source_apex_value_apex_br"]=gfcSourceSetting("Gfc_Source_apex_value_apex_br","Gfc_apex_value_apex_br",["heartRate","steps","calories","distance","battery","temperature"],[1007610278,588927973,1492996704,473628861,1090669815,2019471002],["heartRate","steps","calories","distance","battery","temperature"],"distance");{var v=null;try{v=Application.Properties.getValue("Gfc_apex_value_apex_br_color");}catch(e){}settingsCache["Gfc_apex_value_apex_br_color"]=(v!=null && (v instanceof Toybox.Lang.Number && v>=0 && v<=16777215))?v:0xFFC04A;}{var v=null;try{v=Application.Properties.getValue("Gfc_apex_battery_color");}catch(e){}settingsCache["Gfc_apex_battery_color"]=(v!=null && (v instanceof Toybox.Lang.Number && v>=0 && v<=16777215))?v:0x38E1D0;}{var v=null;try{v=Application.Properties.getValue("Gfc_apex_time_color");}catch(e){}settingsCache["Gfc_apex_time_color"]=(v!=null && (v instanceof Toybox.Lang.Number && v>=0 && v<=16777215))?v:0xEAF1F6;}{var v=null;try{v=Application.Properties.getValue("Gfc_apex_show_bg_art");}catch(e){}settingsCache["Gfc_apex_show_bg_art"]=(v!=null && (v instanceof Toybox.Lang.Boolean))?v:true;}{var v=null;try{v=Application.Properties.getValue("Gfc_apex_show_ticks");}catch(e){}settingsCache["Gfc_apex_show_ticks"]=(v!=null && (v instanceof Toybox.Lang.Boolean))?v:true;}{var v=null;try{v=Application.Properties.getValue("Gfc_apex_show_seconds");}catch(e){}settingsCache["Gfc_apex_show_seconds"]=(v!=null && (v instanceof Toybox.Lang.Boolean))?v:true;}settingsCache["Gfc_Source_trail_value_trail_tl"]=gfcSourceSetting("Gfc_Source_trail_value_trail_tl","Gfc_trail_value_trail_tl",["heartRate","steps","calories","distance","battery","temperature"],[1007610278,588927973,1492996704,473628861,1090669815,2019471002],["heartRate","steps","calories","distance","battery","temperature"],"temperature");{var v=null;try{v=Application.Properties.getValue("Gfc_trail_value_trail_tl_color");}catch(e){}settingsCache["Gfc_trail_value_trail_tl_color"]=(v!=null && (v instanceof Toybox.Lang.Number && v>=0 && v<=16777215))?v:0x38E1D0;}settingsCache["Gfc_Source_trail_value_trail_tr"]=gfcSourceSetting("Gfc_Source_trail_value_trail_tr","Gfc_trail_value_trail_tr",["heartRate","steps","calories","distance","battery","temperature"],[1007610278,588927973,1492996704,473628861,1090669815,2019471002],["heartRate","steps","calories","distance","battery","temperature"],"distance");{var v=null;try{v=Application.Properties.getValue("Gfc_trail_value_trail_tr_color");}catch(e){}settingsCache["Gfc_trail_value_trail_tr_color"]=(v!=null && (v instanceof Toybox.Lang.Number && v>=0 && v<=16777215))?v:0xFFC04A;}settingsCache["Gfc_Source_trail_value_trail_bl"]=gfcSourceSetting("Gfc_Source_trail_value_trail_bl","Gfc_trail_value_trail_bl",["heartRate","steps","calories","distance","battery","temperature"],[1007610278,588927973,1492996704,473628861,1090669815,2019471002],["heartRate","steps","calories","distance","battery","temperature"],"heartRate");{var v=null;try{v=Application.Properties.getValue("Gfc_trail_value_trail_bl_color");}catch(e){}settingsCache["Gfc_trail_value_trail_bl_color"]=(v!=null && (v instanceof Toybox.Lang.Number && v>=0 && v<=16777215))?v:0xEAF1F6;}settingsCache["Gfc_Source_trail_value_trail_br"]=gfcSourceSetting("Gfc_Source_trail_value_trail_br","Gfc_trail_value_trail_br",["heartRate","steps","calories","distance","battery","temperature"],[1007610278,588927973,1492996704,473628861,1090669815,2019471002],["heartRate","steps","calories","distance","battery","temperature"],"steps");{var v=null;try{v=Application.Properties.getValue("Gfc_trail_value_trail_br_color");}catch(e){}settingsCache["Gfc_trail_value_trail_br_color"]=(v!=null && (v instanceof Toybox.Lang.Number && v>=0 && v<=16777215))?v:0x8492A0;}{var v=null;try{v=Application.Properties.getValue("Gfc_trail_battery_color");}catch(e){}settingsCache["Gfc_trail_battery_color"]=(v!=null && (v instanceof Toybox.Lang.Number && v>=0 && v<=16777215))?v:0xEAF1F6;}{var v=null;try{v=Application.Properties.getValue("Gfc_trail_time_color");}catch(e){}settingsCache["Gfc_trail_time_color"]=(v!=null && (v instanceof Toybox.Lang.Number && v>=0 && v<=16777215))?v:0xFFC04A;}{var v=null;try{v=Application.Properties.getValue("Gfc_trail_show_bg_art");}catch(e){}settingsCache["Gfc_trail_show_bg_art"]=(v!=null && (v instanceof Toybox.Lang.Boolean))?v:true;}{var v=null;try{v=Application.Properties.getValue("Gfc_trail_show_ticks");}catch(e){}settingsCache["Gfc_trail_show_ticks"]=(v!=null && (v instanceof Toybox.Lang.Boolean))?v:true;}{var v=null;try{v=Application.Properties.getValue("Gfc_trail_show_seconds");}catch(e){}settingsCache["Gfc_trail_show_seconds"]=(v!=null && (v instanceof Toybox.Lang.Boolean))?v:true;}settingsCache["Gfc_Source_vital_heart_big"]=gfcSourceSetting("Gfc_Source_vital_heart_big","Gfc_vital_heart_big",["heartRate","steps","calories","distance","battery","temperature"],[1007610278,588927973,1492996704,473628861,1090669815,2019471002],["heartRate","steps","calories","distance","battery","temperature"],"heartRate");{var v=null;try{v=Application.Properties.getValue("Gfc_vital_heart_big_color");}catch(e){}settingsCache["Gfc_vital_heart_big_color"]=(v!=null && (v instanceof Toybox.Lang.Number && v>=0 && v<=16777215))?v:0x38E1D0;}settingsCache["Gfc_Source_vital_value_vital_bl"]=gfcSourceSetting("Gfc_Source_vital_value_vital_bl","Gfc_vital_value_vital_bl",["heartRate","steps","calories","distance","battery","temperature"],[1007610278,588927973,1492996704,473628861,1090669815,2019471002],["heartRate","steps","calories","distance","battery","temperature"],"steps");{var v=null;try{v=Application.Properties.getValue("Gfc_vital_value_vital_bl_color");}catch(e){}settingsCache["Gfc_vital_value_vital_bl_color"]=(v!=null && (v instanceof Toybox.Lang.Number && v>=0 && v<=16777215))?v:0x38E1D0;}settingsCache["Gfc_Source_vital_value_vital_br"]=gfcSourceSetting("Gfc_Source_vital_value_vital_br","Gfc_vital_value_vital_br",["heartRate","steps","calories","distance","battery","temperature"],[1007610278,588927973,1492996704,473628861,1090669815,2019471002],["heartRate","steps","calories","distance","battery","temperature"],"calories");{var v=null;try{v=Application.Properties.getValue("Gfc_vital_value_vital_br_color");}catch(e){}settingsCache["Gfc_vital_value_vital_br_color"]=(v!=null && (v instanceof Toybox.Lang.Number && v>=0 && v<=16777215))?v:0xFFC04A;}{var v=null;try{v=Application.Properties.getValue("Gfc_vital_battery_color");}catch(e){}settingsCache["Gfc_vital_battery_color"]=(v!=null && (v instanceof Toybox.Lang.Number && v>=0 && v<=16777215))?v:0x38E1D0;}{var v=null;try{v=Application.Properties.getValue("Gfc_vital_time_color");}catch(e){}settingsCache["Gfc_vital_time_color"]=(v!=null && (v instanceof Toybox.Lang.Number && v>=0 && v<=16777215))?v:0xEAF1F6;}{var v=null;try{v=Application.Properties.getValue("Gfc_vital_show_bg_art");}catch(e){}settingsCache["Gfc_vital_show_bg_art"]=(v!=null && (v instanceof Toybox.Lang.Boolean))?v:true;}{var v=null;try{v=Application.Properties.getValue("Gfc_vital_show_ticks");}catch(e){}settingsCache["Gfc_vital_show_ticks"]=(v!=null && (v instanceof Toybox.Lang.Boolean))?v:true;}{var v=null;try{v=Application.Properties.getValue("Gfc_vital_show_zone_decoration");}catch(e){}settingsCache["Gfc_vital_show_zone_decoration"]=(v!=null && (v instanceof Toybox.Lang.Boolean))?v:true;}var idx=0;try{var theme=Application.Properties.getValue("Gfc_Theme");if(theme instanceof Toybox.Lang.Number){if(theme==2009808953){idx=0;}if(theme==2078923795){idx=1;}if(theme==1156566441){idx=2;}}}catch(e){}settingsCache["Gfc_Theme"]=idx;{var bgValue=null;try{bgValue=Application.Properties.getValue("Gfc_Background_2009808953");}catch(e){}settingsCache["Gfc_Background_2009808953"]=(bgValue instanceof Toybox.Lang.Number && bgValue>=0 && bgValue<=16777215)?bgValue:0x0E1319;}{var bgValue=null;try{bgValue=Application.Properties.getValue("Gfc_Background_2078923795");}catch(e){}settingsCache["Gfc_Background_2078923795"]=(bgValue instanceof Toybox.Lang.Number && bgValue>=0 && bgValue<=16777215)?bgValue:0x100E0B;}{var bgValue=null;try{bgValue=Application.Properties.getValue("Gfc_Background_1156566441");}catch(e){}settingsCache["Gfc_Background_1156566441"]=(bgValue instanceof Toybox.Lang.Number && bgValue>=0 && bgValue<=16777215)?bgValue:0x081110;}}}
 function textPaint(dc,ink,alpha){dc.setColor(ink,Graphics.COLOR_TRANSPARENT);dc.setFill(Graphics.createColor(alpha,(ink>>16)&255,(ink>>8)&255,ink&255));dc.setStroke(Graphics.createColor(alpha,(ink>>16)&255,(ink>>8)&255,ink&255));if(alpha==255){dc.setColor(ink,Graphics.COLOR_TRANSPARENT);}}
 function fontFor(id){return WatchUi.loadResource(id);}

 function initialize(){WatchFace.initialize();}
 function onEnterSleep(){sleeping=true;gfcFrameReported=false;WatchUi.requestUpdate();}
 function onExitSleep(){sleeping=false;gfcFrameReported=false;WatchUi.requestUpdate();}
 function meterCount(value,goal,count,source){if(!metricValid(value,source)){return 0;}if(value>=goal){return count;}return (value*1.0/goal*count).toNumber();}
 function metricValid(value,source){if(value==null || value!=value || value<=-1.0e12 || value>=1.0e12){return false;}if(source.equals("moonIllumination")){return value>=0 && value<=100;}if(source.equals("sunrise")){return value>=0 && value<=86399;}if(source.equals("sunset")){return value>=0 && value<=86399;}if(source.equals("oxygenSaturation")){return value>0 && value<=100;}if(source.equals("phoneConnected")){return value>=0 && value<=1;}if(source.equals("moveBarLevel")){return value>=0 && value<=5;}if(source.equals("precipitationChance")){return value>=0 && value<=100;}if(source.equals("windBearing")){return value>=0 && value<=360;}if(source.equals("heartRate")){return value>0;}if(source.equals("battery")){return value>=0 && value<=100;}if(source.equals("temperature")){return value>=-273.15 && value<=1000;}if(source.equals("humidity")){return value>=0 && value<=100;}if(source.equals("stress")){return value>=0 && value<=100;}if(source.equals("seconds")){return value>=0 && value<=59;}if(source.equals("altitude")){return value>=-1.0e12;}return value>=0;}
 function metricText(value,source,label,unit,precision,missing,group){
  if(!metricValid(value,source)){return label+missing;}
  if(source.equals("sunrise")||source.equals("sunset")){return label+(value/3600).toNumber().format("%02d")+":"+((value%3600)/60).toNumber().format("%02d")+unit;}
  if(source.equals("moonIllumination")){label+="~";}
  var text="";
  if(precision>=0){text=value.toFloat().format("%."+precision.format("%d")+"f");}
  else if(source.equals("seconds")){text=value.toNumber().format("%02d");}
  else if(source.equals("steps")){text=value.toNumber().format("%d");}
  else {text=value.toFloat().format("%.6f");while(text.length()>0 && text.substring(text.length()-1,text.length()).equals("0")){text=text.substring(0,text.length()-1);}if(text.substring(text.length()-1,text.length()).equals(".")){text=text.substring(0,text.length()-1);}}
  if(group){var cut=text.length();for(var c=0;c<text.length();c++){if(text.substring(c,c+1).equals(".")){cut=c;break;}}var grouped="";for(var k=0;k<text.length();k++){if(k>0 && k<cut && (cut-k)%3==0 && !text.substring(k-1,k).equals("-")){grouped+=",";}grouped+=text.substring(k,k+1);}text=grouped;}

  return label+text+unit;
 }
 function gfcNumeric(v){if(v instanceof Toybox.Lang.Number || v instanceof Toybox.Lang.Float || v instanceof Toybox.Lang.Long || v instanceof Toybox.Lang.Double){return v;}return null;}
var gfcExtraCache={};var gfcExtraStamp=-1;var gfcExtraDay=-1;var gfcExtraZone=-1;function gfcExtraMetrics(){var now=Time.now();var local=Gregorian.info(now,Time.FORMAT_SHORT);var utc=Gregorian.utcInfo(now,Time.FORMAT_SHORT);var day=local.year*10000+local.month*100+local.day;var zone=((local.hour*60+local.min)-(utc.hour*60+utc.min)+1440)%1440;var age=now.value()-gfcExtraStamp;if(gfcExtraStamp>=0 && age>=0 && age<60 && day==gfcExtraDay && zone==gfcExtraZone){return gfcExtraCache;}gfcExtraStamp=now.value();gfcExtraDay=day;gfcExtraZone=zone;gfcExtraCache={};{var c=GfcWeather.read(false);if(c!=null){if(c has :temperature){gfcExtraCache[:temperature]=gfcNumeric(c.temperature);}}}return gfcExtraCache;}
 
 
 
 var bitmapCache={};var bitmapUsed={};
 function drawStaticImage(dc,id,x,y){bitmapUsed[id]=true;if(!bitmapCache.hasKey(id)){bitmapCache[id]=WatchUi.loadResource(id);}dc.drawBitmap(x,y,bitmapCache[id]);}
 function drawBitmapHand(dc,clock,id,kind,x,y,w,h,pvx,pvy,low,tint){bitmapUsed[id]=true;if(!bitmapCache.hasKey(id)){bitmapCache[id]=WatchUi.loadResource(id);}var bitmap=bitmapCache[id];var cx=w*pvx;var cy=h*pvy;var r=cx;if(w-cx<r){r=w-cx;}if(cy<r){r=cy;}if(h-cy<r){r=h-cy;}if(r<=0){return;}var sec=low?0:clock.sec;var deg=kind==0?((clock.hour%12)+clock.min/60.0+sec/3600.0)*30:(kind==1?(clock.min+sec/60.0)*6:sec*6);var a=deg*Math.PI/180.0;var transform=new Graphics.AffineTransform();transform.translate((px(x+cx)*1.0),(px(y+cy)*1.0));transform.rotate(a);transform.scale(px(r*2)*1.0/bitmap.getWidth(),px(r*2)*1.0/bitmap.getHeight());transform.translate(-bitmap.getWidth()/2.0,-bitmap.getHeight()/2.0);var options={:transform=>transform};if(low){options[:tintColor]=tint;}dc.drawBitmap2(0,0,bitmap,options);}
 function trimImages(){var keys=bitmapCache.keys();for(var i=0;i<keys.size();i++){if(!bitmapUsed.hasKey(keys[i])){bitmapCache.remove(keys[i]);}}}
 
 
 function px(value){return (value*scale).toNumber();}
 function render_active_0(dc as Graphics.Dc) as Void {var cfgTheme=frameContext[:cfgTheme] as Toybox.Lang.Number;var cfg_apex_value_apex_tl=frameContext[:cfg_apex_value_apex_tl] as Toybox.Lang.String;var cfg_apex_value_apex_tl_color=frameContext[:cfg_apex_value_apex_tl_color] as Toybox.Lang.Number;var cfg_apex_show_bg_art=frameContext[:cfg_apex_show_bg_art] as Toybox.Lang.Boolean;var cfg_apex_show_ticks=frameContext[:cfg_apex_show_ticks] as Toybox.Lang.Boolean;

// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22apex_bg_art%22%2C%22partId%22%3A%22apex_bg_art%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22active%22%7D
if(true){if(cfg_apex_show_bg_art && cfgTheme==0){drawStaticImage(dc,Rez.Drawables.GfcImage_apex_bg_art,px(0),px(0));}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22apex_ticks%22%2C%22partId%22%3A%22apex_ticks%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22active%22%7D
if(true){if(cfg_apex_show_ticks && cfgTheme==0){drawStaticImage(dc,Rez.Drawables.GfcImage_apex_ticks,px(0),px(0));}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22apex_icon_apex_tl_temperature%22%2C%22partId%22%3A%22apex_icon_apex_tl_temperature%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22active%22%7D
if(true){if((cfg_apex_value_apex_tl.equals("temperature")) && cfgTheme==0){textPaint(dc,cfg_apex_value_apex_tl_color,255);dc.setColor(cfg_apex_value_apex_tl_color,Graphics.COLOR_TRANSPARENT);dc.drawText(px(101),px(122),fontFor(Rez.Fonts.GfcMask_native454_icon_temperature_20_20_1000),"A",Graphics.TEXT_JUSTIFY_LEFT);}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22apex_icon_apex_tl_battery%22%2C%22partId%22%3A%22apex_icon_apex_tl_battery%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22active%22%7D
if(true){if((cfg_apex_value_apex_tl.equals("battery")) && cfgTheme==0){textPaint(dc,cfg_apex_value_apex_tl_color,255);dc.setColor(cfg_apex_value_apex_tl_color,Graphics.COLOR_TRANSPARENT);dc.drawText(px(101),px(122),fontFor(Rez.Fonts.GfcMask_native454_icon_battery_20_20_1000),"A",Graphics.TEXT_JUSTIFY_LEFT);}}
// GFC_LAYER_END

}
function render_active_1(dc as Graphics.Dc) as Void {var cfgTheme=frameContext[:cfgTheme] as Toybox.Lang.Number;var cfg_apex_value_apex_tl=frameContext[:cfg_apex_value_apex_tl] as Toybox.Lang.String;var cfg_apex_value_apex_tl_color=frameContext[:cfg_apex_value_apex_tl_color] as Toybox.Lang.Number;

// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22apex_icon_apex_tl_distance%22%2C%22partId%22%3A%22apex_icon_apex_tl_distance%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22active%22%7D
if(true){if((cfg_apex_value_apex_tl.equals("distance")) && cfgTheme==0){textPaint(dc,cfg_apex_value_apex_tl_color,255);dc.setColor(cfg_apex_value_apex_tl_color,Graphics.COLOR_TRANSPARENT);dc.drawText(px(101),px(122),fontFor(Rez.Fonts.GfcMask_native454_icon_distance_20_20_1000),"A",Graphics.TEXT_JUSTIFY_LEFT);}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22apex_icon_apex_tl_calories%22%2C%22partId%22%3A%22apex_icon_apex_tl_calories%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22active%22%7D
if(true){if((cfg_apex_value_apex_tl.equals("calories")) && cfgTheme==0){textPaint(dc,cfg_apex_value_apex_tl_color,255);dc.setColor(cfg_apex_value_apex_tl_color,Graphics.COLOR_TRANSPARENT);dc.drawText(px(101),px(122),fontFor(Rez.Fonts.GfcMask_native454_icon_calories_20_20_1000),"A",Graphics.TEXT_JUSTIFY_LEFT);}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22apex_icon_apex_tl_steps%22%2C%22partId%22%3A%22apex_icon_apex_tl_steps%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22active%22%7D
if(true){if((cfg_apex_value_apex_tl.equals("steps")) && cfgTheme==0){textPaint(dc,cfg_apex_value_apex_tl_color,255);dc.setColor(cfg_apex_value_apex_tl_color,Graphics.COLOR_TRANSPARENT);dc.drawText(px(101),px(122),fontFor(Rez.Fonts.GfcMask_native454_icon_steps_20_20_1000),"A",Graphics.TEXT_JUSTIFY_LEFT);}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22apex_icon_apex_tl_heartRate%22%2C%22partId%22%3A%22apex_icon_apex_tl_heartRate%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22active%22%7D
if(true){if((cfg_apex_value_apex_tl.equals("heartRate")) && cfgTheme==0){textPaint(dc,cfg_apex_value_apex_tl_color,255);dc.setColor(cfg_apex_value_apex_tl_color,Graphics.COLOR_TRANSPARENT);dc.drawText(px(101),px(122),fontFor(Rez.Fonts.GfcMask_native454_icon_heartRate_20_20_1000),"A",Graphics.TEXT_JUSTIFY_LEFT);}}
// GFC_LAYER_END

}
function render_active_2(dc as Graphics.Dc) as Void {var cfgTheme=frameContext[:cfgTheme] as Toybox.Lang.Number;var cfg_apex_value_apex_tr=frameContext[:cfg_apex_value_apex_tr] as Toybox.Lang.String;var cfg_apex_value_apex_tr_color=frameContext[:cfg_apex_value_apex_tr_color] as Toybox.Lang.Number;

// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22apex_icon_apex_tr_temperature%22%2C%22partId%22%3A%22apex_icon_apex_tr_temperature%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22active%22%7D
if(true){if((cfg_apex_value_apex_tr.equals("temperature")) && cfgTheme==0){textPaint(dc,cfg_apex_value_apex_tr_color,255);dc.setColor(cfg_apex_value_apex_tr_color,Graphics.COLOR_TRANSPARENT);dc.drawText(px(333),px(122),fontFor(Rez.Fonts.GfcMask_native454_icon_temperature_20_20_1000),"A",Graphics.TEXT_JUSTIFY_LEFT);}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22apex_icon_apex_tr_battery%22%2C%22partId%22%3A%22apex_icon_apex_tr_battery%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22active%22%7D
if(true){if((cfg_apex_value_apex_tr.equals("battery")) && cfgTheme==0){textPaint(dc,cfg_apex_value_apex_tr_color,255);dc.setColor(cfg_apex_value_apex_tr_color,Graphics.COLOR_TRANSPARENT);dc.drawText(px(333),px(122),fontFor(Rez.Fonts.GfcMask_native454_icon_battery_20_20_1000),"A",Graphics.TEXT_JUSTIFY_LEFT);}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22apex_icon_apex_tr_distance%22%2C%22partId%22%3A%22apex_icon_apex_tr_distance%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22active%22%7D
if(true){if((cfg_apex_value_apex_tr.equals("distance")) && cfgTheme==0){textPaint(dc,cfg_apex_value_apex_tr_color,255);dc.setColor(cfg_apex_value_apex_tr_color,Graphics.COLOR_TRANSPARENT);dc.drawText(px(333),px(122),fontFor(Rez.Fonts.GfcMask_native454_icon_distance_20_20_1000),"A",Graphics.TEXT_JUSTIFY_LEFT);}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22apex_icon_apex_tr_calories%22%2C%22partId%22%3A%22apex_icon_apex_tr_calories%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22active%22%7D
if(true){if((cfg_apex_value_apex_tr.equals("calories")) && cfgTheme==0){textPaint(dc,cfg_apex_value_apex_tr_color,255);dc.setColor(cfg_apex_value_apex_tr_color,Graphics.COLOR_TRANSPARENT);dc.drawText(px(333),px(122),fontFor(Rez.Fonts.GfcMask_native454_icon_calories_20_20_1000),"A",Graphics.TEXT_JUSTIFY_LEFT);}}
// GFC_LAYER_END

}
function render_active_3(dc as Graphics.Dc) as Void {var cfgTheme=frameContext[:cfgTheme] as Toybox.Lang.Number;var cfg_apex_value_apex_tr=frameContext[:cfg_apex_value_apex_tr] as Toybox.Lang.String;var cfg_apex_value_apex_tr_color=frameContext[:cfg_apex_value_apex_tr_color] as Toybox.Lang.Number;var cfg_apex_value_apex_bl=frameContext[:cfg_apex_value_apex_bl] as Toybox.Lang.String;var cfg_apex_value_apex_bl_color=frameContext[:cfg_apex_value_apex_bl_color] as Toybox.Lang.Number;

// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22apex_icon_apex_tr_steps%22%2C%22partId%22%3A%22apex_icon_apex_tr_steps%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22active%22%7D
if(true){if((cfg_apex_value_apex_tr.equals("steps")) && cfgTheme==0){textPaint(dc,cfg_apex_value_apex_tr_color,255);dc.setColor(cfg_apex_value_apex_tr_color,Graphics.COLOR_TRANSPARENT);dc.drawText(px(333),px(122),fontFor(Rez.Fonts.GfcMask_native454_icon_steps_20_20_1000),"A",Graphics.TEXT_JUSTIFY_LEFT);}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22apex_icon_apex_tr_heartRate%22%2C%22partId%22%3A%22apex_icon_apex_tr_heartRate%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22active%22%7D
if(true){if((cfg_apex_value_apex_tr.equals("heartRate")) && cfgTheme==0){textPaint(dc,cfg_apex_value_apex_tr_color,255);dc.setColor(cfg_apex_value_apex_tr_color,Graphics.COLOR_TRANSPARENT);dc.drawText(px(333),px(122),fontFor(Rez.Fonts.GfcMask_native454_icon_heartRate_20_20_1000),"A",Graphics.TEXT_JUSTIFY_LEFT);}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22apex_icon_apex_bl_temperature%22%2C%22partId%22%3A%22apex_icon_apex_bl_temperature%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22active%22%7D
if(true){if((cfg_apex_value_apex_bl.equals("temperature")) && cfgTheme==0){textPaint(dc,cfg_apex_value_apex_bl_color,255);dc.setColor(cfg_apex_value_apex_bl_color,Graphics.COLOR_TRANSPARENT);dc.drawText(px(101),px(310),fontFor(Rez.Fonts.GfcMask_native454_icon_temperature_20_20_1000),"A",Graphics.TEXT_JUSTIFY_LEFT);}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22apex_icon_apex_bl_battery%22%2C%22partId%22%3A%22apex_icon_apex_bl_battery%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22active%22%7D
if(true){if((cfg_apex_value_apex_bl.equals("battery")) && cfgTheme==0){textPaint(dc,cfg_apex_value_apex_bl_color,255);dc.setColor(cfg_apex_value_apex_bl_color,Graphics.COLOR_TRANSPARENT);dc.drawText(px(101),px(310),fontFor(Rez.Fonts.GfcMask_native454_icon_battery_20_20_1000),"A",Graphics.TEXT_JUSTIFY_LEFT);}}
// GFC_LAYER_END

}
function render_active_4(dc as Graphics.Dc) as Void {var cfgTheme=frameContext[:cfgTheme] as Toybox.Lang.Number;var cfg_apex_value_apex_bl=frameContext[:cfg_apex_value_apex_bl] as Toybox.Lang.String;var cfg_apex_value_apex_bl_color=frameContext[:cfg_apex_value_apex_bl_color] as Toybox.Lang.Number;

// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22apex_icon_apex_bl_distance%22%2C%22partId%22%3A%22apex_icon_apex_bl_distance%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22active%22%7D
if(true){if((cfg_apex_value_apex_bl.equals("distance")) && cfgTheme==0){textPaint(dc,cfg_apex_value_apex_bl_color,255);dc.setColor(cfg_apex_value_apex_bl_color,Graphics.COLOR_TRANSPARENT);dc.drawText(px(101),px(310),fontFor(Rez.Fonts.GfcMask_native454_icon_distance_20_20_1000),"A",Graphics.TEXT_JUSTIFY_LEFT);}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22apex_icon_apex_bl_calories%22%2C%22partId%22%3A%22apex_icon_apex_bl_calories%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22active%22%7D
if(true){if((cfg_apex_value_apex_bl.equals("calories")) && cfgTheme==0){textPaint(dc,cfg_apex_value_apex_bl_color,255);dc.setColor(cfg_apex_value_apex_bl_color,Graphics.COLOR_TRANSPARENT);dc.drawText(px(101),px(310),fontFor(Rez.Fonts.GfcMask_native454_icon_calories_20_20_1000),"A",Graphics.TEXT_JUSTIFY_LEFT);}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22apex_icon_apex_bl_steps%22%2C%22partId%22%3A%22apex_icon_apex_bl_steps%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22active%22%7D
if(true){if((cfg_apex_value_apex_bl.equals("steps")) && cfgTheme==0){textPaint(dc,cfg_apex_value_apex_bl_color,255);dc.setColor(cfg_apex_value_apex_bl_color,Graphics.COLOR_TRANSPARENT);dc.drawText(px(101),px(310),fontFor(Rez.Fonts.GfcMask_native454_icon_steps_20_20_1000),"A",Graphics.TEXT_JUSTIFY_LEFT);}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22apex_icon_apex_bl_heartRate%22%2C%22partId%22%3A%22apex_icon_apex_bl_heartRate%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22active%22%7D
if(true){if((cfg_apex_value_apex_bl.equals("heartRate")) && cfgTheme==0){textPaint(dc,cfg_apex_value_apex_bl_color,255);dc.setColor(cfg_apex_value_apex_bl_color,Graphics.COLOR_TRANSPARENT);dc.drawText(px(101),px(310),fontFor(Rez.Fonts.GfcMask_native454_icon_heartRate_20_20_1000),"A",Graphics.TEXT_JUSTIFY_LEFT);}}
// GFC_LAYER_END

}
function render_active_5(dc as Graphics.Dc) as Void {var cfgTheme=frameContext[:cfgTheme] as Toybox.Lang.Number;var cfg_apex_value_apex_br=frameContext[:cfg_apex_value_apex_br] as Toybox.Lang.String;var cfg_apex_value_apex_br_color=frameContext[:cfg_apex_value_apex_br_color] as Toybox.Lang.Number;

// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22apex_icon_apex_br_temperature%22%2C%22partId%22%3A%22apex_icon_apex_br_temperature%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22active%22%7D
if(true){if((cfg_apex_value_apex_br.equals("temperature")) && cfgTheme==0){textPaint(dc,cfg_apex_value_apex_br_color,255);dc.setColor(cfg_apex_value_apex_br_color,Graphics.COLOR_TRANSPARENT);dc.drawText(px(333),px(310),fontFor(Rez.Fonts.GfcMask_native454_icon_temperature_20_20_1000),"A",Graphics.TEXT_JUSTIFY_LEFT);}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22apex_icon_apex_br_battery%22%2C%22partId%22%3A%22apex_icon_apex_br_battery%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22active%22%7D
if(true){if((cfg_apex_value_apex_br.equals("battery")) && cfgTheme==0){textPaint(dc,cfg_apex_value_apex_br_color,255);dc.setColor(cfg_apex_value_apex_br_color,Graphics.COLOR_TRANSPARENT);dc.drawText(px(333),px(310),fontFor(Rez.Fonts.GfcMask_native454_icon_battery_20_20_1000),"A",Graphics.TEXT_JUSTIFY_LEFT);}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22apex_icon_apex_br_distance%22%2C%22partId%22%3A%22apex_icon_apex_br_distance%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22active%22%7D
if(true){if((cfg_apex_value_apex_br.equals("distance")) && cfgTheme==0){textPaint(dc,cfg_apex_value_apex_br_color,255);dc.setColor(cfg_apex_value_apex_br_color,Graphics.COLOR_TRANSPARENT);dc.drawText(px(333),px(310),fontFor(Rez.Fonts.GfcMask_native454_icon_distance_20_20_1000),"A",Graphics.TEXT_JUSTIFY_LEFT);}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22apex_icon_apex_br_calories%22%2C%22partId%22%3A%22apex_icon_apex_br_calories%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22active%22%7D
if(true){if((cfg_apex_value_apex_br.equals("calories")) && cfgTheme==0){textPaint(dc,cfg_apex_value_apex_br_color,255);dc.setColor(cfg_apex_value_apex_br_color,Graphics.COLOR_TRANSPARENT);dc.drawText(px(333),px(310),fontFor(Rez.Fonts.GfcMask_native454_icon_calories_20_20_1000),"A",Graphics.TEXT_JUSTIFY_LEFT);}}
// GFC_LAYER_END

}
function render_active_6(dc as Graphics.Dc) as Void {var databattery=frameContext[:databattery];var cfgTheme=frameContext[:cfgTheme] as Toybox.Lang.Number;var cfg_apex_value_apex_br=frameContext[:cfg_apex_value_apex_br] as Toybox.Lang.String;var cfg_apex_value_apex_br_color=frameContext[:cfg_apex_value_apex_br_color] as Toybox.Lang.Number;var cfg_apex_battery_color=frameContext[:cfg_apex_battery_color] as Toybox.Lang.Number;var calendar=frameContext[:calendar];var dateText=frameContext[:dateText];

// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22apex_icon_apex_br_steps%22%2C%22partId%22%3A%22apex_icon_apex_br_steps%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22active%22%7D
if(true){if((cfg_apex_value_apex_br.equals("steps")) && cfgTheme==0){textPaint(dc,cfg_apex_value_apex_br_color,255);dc.setColor(cfg_apex_value_apex_br_color,Graphics.COLOR_TRANSPARENT);dc.drawText(px(333),px(310),fontFor(Rez.Fonts.GfcMask_native454_icon_steps_20_20_1000),"A",Graphics.TEXT_JUSTIFY_LEFT);}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22apex_icon_apex_br_heartRate%22%2C%22partId%22%3A%22apex_icon_apex_br_heartRate%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22active%22%7D
if(true){if((cfg_apex_value_apex_br.equals("heartRate")) && cfgTheme==0){textPaint(dc,cfg_apex_value_apex_br_color,255);dc.setColor(cfg_apex_value_apex_br_color,Graphics.COLOR_TRANSPARENT);dc.drawText(px(333),px(310),fontFor(Rez.Fonts.GfcMask_native454_icon_heartRate_20_20_1000),"A",Graphics.TEXT_JUSTIFY_LEFT);}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22apex_battery_meter%22%2C%22partId%22%3A%22apex_battery_meter%22%2C%22capabilityId%22%3A%22core.meter%22%2C%22mode%22%3A%22active%22%7D
if(true){if(cfgTheme==0){{var value=databattery;var meterInk=0x738594;if(metricValid(value,"battery")){if(true && value<10){meterInk=0xFF4D5E;}else if(value>=10 && value<30){meterInk=0xFFC04A;}else if(value>=30 && true){meterInk=cfg_apex_battery_color;}}{dc.setColor(0x26313B,Graphics.COLOR_TRANSPARENT);dc.fillRectangle(px(167),px(388),px(120),px(9));var ratio=0.0;if(metricValid(databattery,"battery")){ratio=databattery*1.0/100;if(ratio>1){ratio=1;}}dc.setColor(meterInk,Graphics.COLOR_TRANSPARENT);dc.fillRectangle(px(167),px(388),px(120*ratio),px(9));}}}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22apex_date_main%22%2C%22partId%22%3A%22apex_date_main%22%2C%22capabilityId%22%3A%22core.date%22%2C%22mode%22%3A%22active%22%7D
if(true){if(cfgTheme==0){textPaint(dc,0x8492A0,255);dc.drawText(px(227),px(102),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_20),dateText.substring(0,4)+calendar.day.format("%02d"),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}
// GFC_LAYER_END

}
function render_active_7(dc as Graphics.Dc) as Void {var cfgTheme=frameContext[:cfgTheme] as Toybox.Lang.Number;var cfg_apex_value_apex_tl=frameContext[:cfg_apex_value_apex_tl] as Toybox.Lang.String;var cfg_apex_value_apex_tr=frameContext[:cfg_apex_value_apex_tr] as Toybox.Lang.String;var cfg_apex_value_apex_bl=frameContext[:cfg_apex_value_apex_bl] as Toybox.Lang.String;var cfg_apex_value_apex_br=frameContext[:cfg_apex_value_apex_br] as Toybox.Lang.String;

// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22apex_label_apex_tl%22%2C%22partId%22%3A%22apex_label_apex_tl%22%2C%22capabilityId%22%3A%22core.text%22%2C%22mode%22%3A%22active%22%7D
if(true){if(cfgTheme==0){if(cfg_apex_value_apex_tl.equals("heartRate")){textPaint(dc,0x8492A0,255);dc.drawText(px(111),px(189),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_11),"BPM",Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}else if(cfg_apex_value_apex_tl.equals("steps")){textPaint(dc,0x8492A0,255);dc.drawText(px(111),px(189),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_11),"STEPS",Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}else if(cfg_apex_value_apex_tl.equals("calories")){textPaint(dc,0x8492A0,255);dc.drawText(px(111),px(189),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_11),"KCAL",Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}else if(cfg_apex_value_apex_tl.equals("distance")){textPaint(dc,0x8492A0,255);dc.drawText(px(111),px(189),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_11),"KM",Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}else if(cfg_apex_value_apex_tl.equals("battery")){textPaint(dc,0x8492A0,255);dc.drawText(px(111),px(189),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_11),"%",Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}else if(cfg_apex_value_apex_tl.equals("temperature")){textPaint(dc,0x8492A0,255);dc.drawText(px(111),px(189),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_11),"C",Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22apex_label_apex_tr%22%2C%22partId%22%3A%22apex_label_apex_tr%22%2C%22capabilityId%22%3A%22core.text%22%2C%22mode%22%3A%22active%22%7D
if(true){if(cfgTheme==0){if(cfg_apex_value_apex_tr.equals("heartRate")){textPaint(dc,0x8492A0,255);dc.drawText(px(343),px(189),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_11),"BPM",Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}else if(cfg_apex_value_apex_tr.equals("steps")){textPaint(dc,0x8492A0,255);dc.drawText(px(343),px(189),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_11),"STEPS",Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}else if(cfg_apex_value_apex_tr.equals("calories")){textPaint(dc,0x8492A0,255);dc.drawText(px(343),px(189),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_11),"KCAL",Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}else if(cfg_apex_value_apex_tr.equals("distance")){textPaint(dc,0x8492A0,255);dc.drawText(px(343),px(189),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_11),"KM",Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}else if(cfg_apex_value_apex_tr.equals("battery")){textPaint(dc,0x8492A0,255);dc.drawText(px(343),px(189),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_11),"%",Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}else if(cfg_apex_value_apex_tr.equals("temperature")){textPaint(dc,0x8492A0,255);dc.drawText(px(343),px(189),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_11),"C",Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22apex_label_apex_bl%22%2C%22partId%22%3A%22apex_label_apex_bl%22%2C%22capabilityId%22%3A%22core.text%22%2C%22mode%22%3A%22active%22%7D
if(true){if(cfgTheme==0){if(cfg_apex_value_apex_bl.equals("heartRate")){textPaint(dc,0x8492A0,255);dc.drawText(px(111),px(377),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_11),"BPM",Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}else if(cfg_apex_value_apex_bl.equals("steps")){textPaint(dc,0x8492A0,255);dc.drawText(px(111),px(377),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_11),"STEPS",Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}else if(cfg_apex_value_apex_bl.equals("calories")){textPaint(dc,0x8492A0,255);dc.drawText(px(111),px(377),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_11),"KCAL",Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}else if(cfg_apex_value_apex_bl.equals("distance")){textPaint(dc,0x8492A0,255);dc.drawText(px(111),px(377),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_11),"KM",Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}else if(cfg_apex_value_apex_bl.equals("battery")){textPaint(dc,0x8492A0,255);dc.drawText(px(111),px(377),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_11),"%",Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}else if(cfg_apex_value_apex_bl.equals("temperature")){textPaint(dc,0x8492A0,255);dc.drawText(px(111),px(377),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_11),"C",Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22apex_label_apex_br%22%2C%22partId%22%3A%22apex_label_apex_br%22%2C%22capabilityId%22%3A%22core.text%22%2C%22mode%22%3A%22active%22%7D
if(true){if(cfgTheme==0){if(cfg_apex_value_apex_br.equals("heartRate")){textPaint(dc,0x8492A0,255);dc.drawText(px(343),px(377),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_11),"BPM",Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}else if(cfg_apex_value_apex_br.equals("steps")){textPaint(dc,0x8492A0,255);dc.drawText(px(343),px(377),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_11),"STEPS",Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}else if(cfg_apex_value_apex_br.equals("calories")){textPaint(dc,0x8492A0,255);dc.drawText(px(343),px(377),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_11),"KCAL",Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}else if(cfg_apex_value_apex_br.equals("distance")){textPaint(dc,0x8492A0,255);dc.drawText(px(343),px(377),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_11),"KM",Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}else if(cfg_apex_value_apex_br.equals("battery")){textPaint(dc,0x8492A0,255);dc.drawText(px(343),px(377),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_11),"%",Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}else if(cfg_apex_value_apex_br.equals("temperature")){textPaint(dc,0x8492A0,255);dc.drawText(px(343),px(377),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_11),"C",Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}}
// GFC_LAYER_END

}
function render_active_8(dc as Graphics.Dc) as Void {var dataheartRate=frameContext[:dataheartRate];var datasteps=frameContext[:datasteps];var datacalories=frameContext[:datacalories];var datadistance=frameContext[:datadistance];var databattery=frameContext[:databattery];var datatemperature=frameContext[:datatemperature];var cfgTheme=frameContext[:cfgTheme] as Toybox.Lang.Number;var cfg_apex_value_apex_tl=frameContext[:cfg_apex_value_apex_tl] as Toybox.Lang.String;var cfg_apex_value_apex_tl_color=frameContext[:cfg_apex_value_apex_tl_color] as Toybox.Lang.Number;var cfg_apex_value_apex_tr=frameContext[:cfg_apex_value_apex_tr] as Toybox.Lang.String;var cfg_apex_value_apex_tr_color=frameContext[:cfg_apex_value_apex_tr_color] as Toybox.Lang.Number;var cfg_apex_value_apex_bl=frameContext[:cfg_apex_value_apex_bl] as Toybox.Lang.String;var cfg_apex_value_apex_bl_color=frameContext[:cfg_apex_value_apex_bl_color] as Toybox.Lang.Number;var cfg_apex_value_apex_br=frameContext[:cfg_apex_value_apex_br] as Toybox.Lang.String;var cfg_apex_value_apex_br_color=frameContext[:cfg_apex_value_apex_br_color] as Toybox.Lang.Number;

// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22apex_value_apex_tl%22%2C%22partId%22%3A%22apex_value_apex_tl%22%2C%22capabilityId%22%3A%22core.metric%22%2C%22mode%22%3A%22active%22%7D
if(true){if(cfgTheme==0){if(cfg_apex_value_apex_tl.equals("heartRate")){{var value=dataheartRate;var ink=0x738594;if(metricValid(value,"heartRate")){if(true && value<120){ink=cfg_apex_value_apex_tl_color;}else if(value>=120 && value<150){ink=0xFFC04A;}else if(value>=150 && true){ink=0xFF4D5E;}}textPaint(dc,ink,255);dc.drawText(px(111),px(162),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_34),metricText(value,"heartRate","","",0,"--",false),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}else if(cfg_apex_value_apex_tl.equals("steps")){{var value=datasteps;textPaint(dc,cfg_apex_value_apex_tl_color,255);dc.drawText(px(111),px(162),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_34),metricText(value,"steps","","",0,"--",true),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}else if(cfg_apex_value_apex_tl.equals("calories")){{var value=datacalories;textPaint(dc,cfg_apex_value_apex_tl_color,255);dc.drawText(px(111),px(162),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_34),metricText(value,"calories","","",0,"--",false),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}else if(cfg_apex_value_apex_tl.equals("distance")){{var value=datadistance;textPaint(dc,cfg_apex_value_apex_tl_color,255);dc.drawText(px(111),px(162),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_34),metricText(value,"distance","","",2,"--",false),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}else if(cfg_apex_value_apex_tl.equals("battery")){{var value=databattery;var ink=cfg_apex_value_apex_tl_color;if(metricValid(value,"battery")){if(value>=0 && value<10){ink=0xff5566;}else if(value>=10 && value<30){ink=0xffee44;}else if(value>=30 && true){ink=cfg_apex_value_apex_tl_color;}}textPaint(dc,ink,255);dc.drawText(px(111),px(162),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_34),metricText(value,"battery","","",0,"--",false),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}else if(cfg_apex_value_apex_tl.equals("temperature")){{var value=datatemperature;textPaint(dc,cfg_apex_value_apex_tl_color,255);dc.drawText(px(111),px(162),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_34),metricText(value,"temperature","","°",1,"--",false),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22apex_value_apex_tr%22%2C%22partId%22%3A%22apex_value_apex_tr%22%2C%22capabilityId%22%3A%22core.metric%22%2C%22mode%22%3A%22active%22%7D
if(true){if(cfgTheme==0){if(cfg_apex_value_apex_tr.equals("heartRate")){{var value=dataheartRate;var ink=cfg_apex_value_apex_tr_color;if(metricValid(value,"heartRate")){if(value>=0 && value<120){ink=cfg_apex_value_apex_tr_color;}else if(value>=120 && value<150){ink=0xffee44;}else if(value>=150 && true){ink=0xff5566;}}textPaint(dc,ink,255);dc.drawText(px(343),px(162),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_34),metricText(value,"heartRate","","",0,"--",false),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}else if(cfg_apex_value_apex_tr.equals("steps")){{var value=datasteps;var ink=cfg_apex_value_apex_tr_color;if(metricValid(value,"steps")){}textPaint(dc,ink,255);dc.drawText(px(343),px(162),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_34),metricText(value,"steps","","",0,"--",true),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}else if(cfg_apex_value_apex_tr.equals("calories")){{var value=datacalories;textPaint(dc,cfg_apex_value_apex_tr_color,255);dc.drawText(px(343),px(162),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_34),metricText(value,"calories","","",0,"--",false),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}else if(cfg_apex_value_apex_tr.equals("distance")){{var value=datadistance;textPaint(dc,cfg_apex_value_apex_tr_color,255);dc.drawText(px(343),px(162),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_34),metricText(value,"distance","","",2,"--",false),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}else if(cfg_apex_value_apex_tr.equals("battery")){{var value=databattery;var ink=cfg_apex_value_apex_tr_color;if(metricValid(value,"battery")){if(value>=0 && value<10){ink=0xff5566;}else if(value>=10 && value<30){ink=0xffee44;}else if(value>=30 && true){ink=cfg_apex_value_apex_tr_color;}}textPaint(dc,ink,255);dc.drawText(px(343),px(162),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_34),metricText(value,"battery","","",0,"--",false),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}else if(cfg_apex_value_apex_tr.equals("temperature")){{var value=datatemperature;textPaint(dc,cfg_apex_value_apex_tr_color,255);dc.drawText(px(343),px(162),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_34),metricText(value,"temperature","","°",1,"--",false),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22apex_value_apex_bl%22%2C%22partId%22%3A%22apex_value_apex_bl%22%2C%22capabilityId%22%3A%22core.metric%22%2C%22mode%22%3A%22active%22%7D
if(true){if(cfgTheme==0){if(cfg_apex_value_apex_bl.equals("heartRate")){{var value=dataheartRate;var ink=cfg_apex_value_apex_bl_color;if(metricValid(value,"heartRate")){if(value>=0 && value<120){ink=cfg_apex_value_apex_bl_color;}else if(value>=120 && value<150){ink=0xffee44;}else if(value>=150 && true){ink=0xff5566;}}textPaint(dc,ink,255);dc.drawText(px(111),px(350),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_34),metricText(value,"heartRate","","",0,"--",false),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}else if(cfg_apex_value_apex_bl.equals("steps")){{var value=datasteps;textPaint(dc,cfg_apex_value_apex_bl_color,255);dc.drawText(px(111),px(350),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_34),metricText(value,"steps","","",0,"--",true),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}else if(cfg_apex_value_apex_bl.equals("calories")){{var value=datacalories;var ink=cfg_apex_value_apex_bl_color;if(metricValid(value,"calories")){}textPaint(dc,ink,255);dc.drawText(px(111),px(350),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_34),metricText(value,"calories","","",0,"--",false),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}else if(cfg_apex_value_apex_bl.equals("distance")){{var value=datadistance;textPaint(dc,cfg_apex_value_apex_bl_color,255);dc.drawText(px(111),px(350),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_34),metricText(value,"distance","","",2,"--",false),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}else if(cfg_apex_value_apex_bl.equals("battery")){{var value=databattery;var ink=cfg_apex_value_apex_bl_color;if(metricValid(value,"battery")){if(value>=0 && value<10){ink=0xff5566;}else if(value>=10 && value<30){ink=0xffee44;}else if(value>=30 && true){ink=cfg_apex_value_apex_bl_color;}}textPaint(dc,ink,255);dc.drawText(px(111),px(350),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_34),metricText(value,"battery","","",0,"--",false),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}else if(cfg_apex_value_apex_bl.equals("temperature")){{var value=datatemperature;textPaint(dc,cfg_apex_value_apex_bl_color,255);dc.drawText(px(111),px(350),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_34),metricText(value,"temperature","","°",1,"--",false),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22apex_value_apex_br%22%2C%22partId%22%3A%22apex_value_apex_br%22%2C%22capabilityId%22%3A%22core.metric%22%2C%22mode%22%3A%22active%22%7D
if(true){if(cfgTheme==0){if(cfg_apex_value_apex_br.equals("heartRate")){{var value=dataheartRate;var ink=cfg_apex_value_apex_br_color;if(metricValid(value,"heartRate")){if(value>=0 && value<120){ink=cfg_apex_value_apex_br_color;}else if(value>=120 && value<150){ink=0xffee44;}else if(value>=150 && true){ink=0xff5566;}}textPaint(dc,ink,255);dc.drawText(px(343),px(350),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_34),metricText(value,"heartRate","","",0,"--",false),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}else if(cfg_apex_value_apex_br.equals("steps")){{var value=datasteps;textPaint(dc,cfg_apex_value_apex_br_color,255);dc.drawText(px(343),px(350),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_34),metricText(value,"steps","","",0,"--",true),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}else if(cfg_apex_value_apex_br.equals("calories")){{var value=datacalories;textPaint(dc,cfg_apex_value_apex_br_color,255);dc.drawText(px(343),px(350),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_34),metricText(value,"calories","","",0,"--",false),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}else if(cfg_apex_value_apex_br.equals("distance")){{var value=datadistance;var ink=cfg_apex_value_apex_br_color;if(metricValid(value,"distance")){}textPaint(dc,ink,255);dc.drawText(px(343),px(350),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_34),metricText(value,"distance","","",2,"--",false),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}else if(cfg_apex_value_apex_br.equals("battery")){{var value=databattery;var ink=cfg_apex_value_apex_br_color;if(metricValid(value,"battery")){if(value>=0 && value<10){ink=0xff5566;}else if(value>=10 && value<30){ink=0xffee44;}else if(value>=30 && true){ink=cfg_apex_value_apex_br_color;}}textPaint(dc,ink,255);dc.drawText(px(343),px(350),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_34),metricText(value,"battery","","",0,"--",false),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}else if(cfg_apex_value_apex_br.equals("temperature")){{var value=datatemperature;textPaint(dc,cfg_apex_value_apex_br_color,255);dc.drawText(px(343),px(350),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_34),metricText(value,"temperature","","°",1,"--",false),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}}}
// GFC_LAYER_END

}
function render_active_9(dc as Graphics.Dc) as Void {var clock=frameContext[:clock];var databattery=frameContext[:databattery];var cfgTheme=frameContext[:cfgTheme] as Toybox.Lang.Number;var cfg_apex_battery_color=frameContext[:cfg_apex_battery_color] as Toybox.Lang.Number;var cfg_apex_time_color=frameContext[:cfg_apex_time_color] as Toybox.Lang.Number;var cfg_apex_show_seconds=frameContext[:cfg_apex_show_seconds] as Toybox.Lang.Boolean;

// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22apex_battery_value%22%2C%22partId%22%3A%22apex_battery_value%22%2C%22capabilityId%22%3A%22core.metric%22%2C%22mode%22%3A%22active%22%7D
if(true){if(cfgTheme==0){{var value=databattery;var ink=0x738594;if(metricValid(value,"battery")){if(true && value<10){ink=0xFF4D5E;}else if(value>=10 && value<30){ink=0xFFC04A;}else if(value>=30 && true){ink=cfg_apex_battery_color;}}textPaint(dc,ink,255);dc.drawText(px(227),px(414),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_34),metricText(value,"battery","","%",0,"--",false),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22apex_time_main%22%2C%22partId%22%3A%22apex_time_main%22%2C%22capabilityId%22%3A%22core.time%22%2C%22mode%22%3A%22active%22%7D
if(true){if(cfgTheme==0){textPaint(dc,cfg_apex_time_color,255);dc.drawText(px(227),px(235),fontFor(Rez.Fonts.GfcCustom_local_ca177c514f264e623225342630000000_88),clock.hour.format("%02d")+":"+clock.min.format("%02d"),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22apex_seconds%22%2C%22partId%22%3A%22apex_seconds%22%2C%22capabilityId%22%3A%22core.time%22%2C%22mode%22%3A%22active%22%7D
if(true){if(cfg_apex_show_seconds && cfgTheme==0){textPaint(dc,0xFF6A1A,255);dc.drawText(px(227),px(297),fontFor(Rez.Fonts.GfcCustom_local_ca177c514f264e623225342630000000_20),clock.sec.format("%02d"),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22apex_aod_time%22%2C%22partId%22%3A%22apex_aod_time%22%2C%22capabilityId%22%3A%22core.time%22%2C%22mode%22%3A%22active%22%7D
if(true){if(cfgTheme==0){}}
// GFC_LAYER_END

}
function render_active_10(dc as Graphics.Dc) as Void {var cfgTheme=frameContext[:cfgTheme] as Toybox.Lang.Number;var cfg_apex_value_apex_tl=frameContext[:cfg_apex_value_apex_tl] as Toybox.Lang.String;var cfg_trail_show_bg_art=frameContext[:cfg_trail_show_bg_art] as Toybox.Lang.Boolean;

// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22apex_aod_hr%22%2C%22partId%22%3A%22apex_aod_hr%22%2C%22capabilityId%22%3A%22core.metric%22%2C%22mode%22%3A%22active%22%7D
if(true){if(cfgTheme==0){if(cfg_apex_value_apex_tl.equals("heartRate")){}else if(cfg_apex_value_apex_tl.equals("steps")){}else if(cfg_apex_value_apex_tl.equals("calories")){}else if(cfg_apex_value_apex_tl.equals("distance")){}else if(cfg_apex_value_apex_tl.equals("battery")){}else if(cfg_apex_value_apex_tl.equals("temperature")){}}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22apex_aod_hr_label%22%2C%22partId%22%3A%22apex_aod_hr_label%22%2C%22capabilityId%22%3A%22core.text%22%2C%22mode%22%3A%22active%22%7D
if(true){if(cfgTheme==0){if(cfg_apex_value_apex_tl.equals("heartRate")){}else if(cfg_apex_value_apex_tl.equals("steps")){}else if(cfg_apex_value_apex_tl.equals("calories")){}else if(cfg_apex_value_apex_tl.equals("distance")){}else if(cfg_apex_value_apex_tl.equals("battery")){}else if(cfg_apex_value_apex_tl.equals("temperature")){}}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22apex_aod_battery%22%2C%22partId%22%3A%22apex_aod_battery%22%2C%22capabilityId%22%3A%22core.metric%22%2C%22mode%22%3A%22active%22%7D
if(true){if(cfgTheme==0){}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22trail_bg_art%22%2C%22partId%22%3A%22trail_bg_art%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22active%22%7D
if(true){if(cfg_trail_show_bg_art && cfgTheme==1){drawStaticImage(dc,Rez.Drawables.GfcImage_trail_bg_art,px(0),px(0));}}
// GFC_LAYER_END

}
function render_active_11(dc as Graphics.Dc) as Void {var cfgTheme=frameContext[:cfgTheme] as Toybox.Lang.Number;var cfg_trail_value_trail_tl=frameContext[:cfg_trail_value_trail_tl] as Toybox.Lang.String;var cfg_trail_value_trail_tl_color=frameContext[:cfg_trail_value_trail_tl_color] as Toybox.Lang.Number;var cfg_trail_show_ticks=frameContext[:cfg_trail_show_ticks] as Toybox.Lang.Boolean;

// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22trail_ticks%22%2C%22partId%22%3A%22trail_ticks%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22active%22%7D
if(true){if(cfg_trail_show_ticks && cfgTheme==1){drawStaticImage(dc,Rez.Drawables.GfcImage_trail_ticks,px(0),px(0));}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22trail_icon_trail_tl_temperature%22%2C%22partId%22%3A%22trail_icon_trail_tl_temperature%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22active%22%7D
if(true){if((cfg_trail_value_trail_tl.equals("temperature")) && cfgTheme==1){textPaint(dc,cfg_trail_value_trail_tl_color,255);dc.setColor(cfg_trail_value_trail_tl_color,Graphics.COLOR_TRANSPARENT);dc.drawText(px(101),px(122),fontFor(Rez.Fonts.GfcMask_native454_icon_temperature_20_20_1000),"A",Graphics.TEXT_JUSTIFY_LEFT);}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22trail_icon_trail_tl_battery%22%2C%22partId%22%3A%22trail_icon_trail_tl_battery%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22active%22%7D
if(true){if((cfg_trail_value_trail_tl.equals("battery")) && cfgTheme==1){textPaint(dc,cfg_trail_value_trail_tl_color,255);dc.setColor(cfg_trail_value_trail_tl_color,Graphics.COLOR_TRANSPARENT);dc.drawText(px(101),px(122),fontFor(Rez.Fonts.GfcMask_native454_icon_battery_20_20_1000),"A",Graphics.TEXT_JUSTIFY_LEFT);}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22trail_icon_trail_tl_distance%22%2C%22partId%22%3A%22trail_icon_trail_tl_distance%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22active%22%7D
if(true){if((cfg_trail_value_trail_tl.equals("distance")) && cfgTheme==1){textPaint(dc,cfg_trail_value_trail_tl_color,255);dc.setColor(cfg_trail_value_trail_tl_color,Graphics.COLOR_TRANSPARENT);dc.drawText(px(101),px(122),fontFor(Rez.Fonts.GfcMask_native454_icon_distance_20_20_1000),"A",Graphics.TEXT_JUSTIFY_LEFT);}}
// GFC_LAYER_END

}
function render_active_12(dc as Graphics.Dc) as Void {var cfgTheme=frameContext[:cfgTheme] as Toybox.Lang.Number;var cfg_trail_value_trail_tl=frameContext[:cfg_trail_value_trail_tl] as Toybox.Lang.String;var cfg_trail_value_trail_tl_color=frameContext[:cfg_trail_value_trail_tl_color] as Toybox.Lang.Number;var cfg_trail_value_trail_tr=frameContext[:cfg_trail_value_trail_tr] as Toybox.Lang.String;var cfg_trail_value_trail_tr_color=frameContext[:cfg_trail_value_trail_tr_color] as Toybox.Lang.Number;

// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22trail_icon_trail_tl_calories%22%2C%22partId%22%3A%22trail_icon_trail_tl_calories%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22active%22%7D
if(true){if((cfg_trail_value_trail_tl.equals("calories")) && cfgTheme==1){textPaint(dc,cfg_trail_value_trail_tl_color,255);dc.setColor(cfg_trail_value_trail_tl_color,Graphics.COLOR_TRANSPARENT);dc.drawText(px(101),px(122),fontFor(Rez.Fonts.GfcMask_native454_icon_calories_20_20_1000),"A",Graphics.TEXT_JUSTIFY_LEFT);}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22trail_icon_trail_tl_steps%22%2C%22partId%22%3A%22trail_icon_trail_tl_steps%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22active%22%7D
if(true){if((cfg_trail_value_trail_tl.equals("steps")) && cfgTheme==1){textPaint(dc,cfg_trail_value_trail_tl_color,255);dc.setColor(cfg_trail_value_trail_tl_color,Graphics.COLOR_TRANSPARENT);dc.drawText(px(101),px(122),fontFor(Rez.Fonts.GfcMask_native454_icon_steps_20_20_1000),"A",Graphics.TEXT_JUSTIFY_LEFT);}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22trail_icon_trail_tl_heartRate%22%2C%22partId%22%3A%22trail_icon_trail_tl_heartRate%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22active%22%7D
if(true){if((cfg_trail_value_trail_tl.equals("heartRate")) && cfgTheme==1){textPaint(dc,cfg_trail_value_trail_tl_color,255);dc.setColor(cfg_trail_value_trail_tl_color,Graphics.COLOR_TRANSPARENT);dc.drawText(px(101),px(122),fontFor(Rez.Fonts.GfcMask_native454_icon_heartRate_20_20_1000),"A",Graphics.TEXT_JUSTIFY_LEFT);}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22trail_icon_trail_tr_temperature%22%2C%22partId%22%3A%22trail_icon_trail_tr_temperature%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22active%22%7D
if(true){if((cfg_trail_value_trail_tr.equals("temperature")) && cfgTheme==1){textPaint(dc,cfg_trail_value_trail_tr_color,255);dc.setColor(cfg_trail_value_trail_tr_color,Graphics.COLOR_TRANSPARENT);dc.drawText(px(333),px(122),fontFor(Rez.Fonts.GfcMask_native454_icon_temperature_20_20_1000),"A",Graphics.TEXT_JUSTIFY_LEFT);}}
// GFC_LAYER_END

}
function render_active_13(dc as Graphics.Dc) as Void {var cfgTheme=frameContext[:cfgTheme] as Toybox.Lang.Number;var cfg_trail_value_trail_tr=frameContext[:cfg_trail_value_trail_tr] as Toybox.Lang.String;var cfg_trail_value_trail_tr_color=frameContext[:cfg_trail_value_trail_tr_color] as Toybox.Lang.Number;

// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22trail_icon_trail_tr_battery%22%2C%22partId%22%3A%22trail_icon_trail_tr_battery%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22active%22%7D
if(true){if((cfg_trail_value_trail_tr.equals("battery")) && cfgTheme==1){textPaint(dc,cfg_trail_value_trail_tr_color,255);dc.setColor(cfg_trail_value_trail_tr_color,Graphics.COLOR_TRANSPARENT);dc.drawText(px(333),px(122),fontFor(Rez.Fonts.GfcMask_native454_icon_battery_20_20_1000),"A",Graphics.TEXT_JUSTIFY_LEFT);}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22trail_icon_trail_tr_distance%22%2C%22partId%22%3A%22trail_icon_trail_tr_distance%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22active%22%7D
if(true){if((cfg_trail_value_trail_tr.equals("distance")) && cfgTheme==1){textPaint(dc,cfg_trail_value_trail_tr_color,255);dc.setColor(cfg_trail_value_trail_tr_color,Graphics.COLOR_TRANSPARENT);dc.drawText(px(333),px(122),fontFor(Rez.Fonts.GfcMask_native454_icon_distance_20_20_1000),"A",Graphics.TEXT_JUSTIFY_LEFT);}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22trail_icon_trail_tr_calories%22%2C%22partId%22%3A%22trail_icon_trail_tr_calories%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22active%22%7D
if(true){if((cfg_trail_value_trail_tr.equals("calories")) && cfgTheme==1){textPaint(dc,cfg_trail_value_trail_tr_color,255);dc.setColor(cfg_trail_value_trail_tr_color,Graphics.COLOR_TRANSPARENT);dc.drawText(px(333),px(122),fontFor(Rez.Fonts.GfcMask_native454_icon_calories_20_20_1000),"A",Graphics.TEXT_JUSTIFY_LEFT);}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22trail_icon_trail_tr_steps%22%2C%22partId%22%3A%22trail_icon_trail_tr_steps%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22active%22%7D
if(true){if((cfg_trail_value_trail_tr.equals("steps")) && cfgTheme==1){textPaint(dc,cfg_trail_value_trail_tr_color,255);dc.setColor(cfg_trail_value_trail_tr_color,Graphics.COLOR_TRANSPARENT);dc.drawText(px(333),px(122),fontFor(Rez.Fonts.GfcMask_native454_icon_steps_20_20_1000),"A",Graphics.TEXT_JUSTIFY_LEFT);}}
// GFC_LAYER_END

}
function render_active_14(dc as Graphics.Dc) as Void {var cfgTheme=frameContext[:cfgTheme] as Toybox.Lang.Number;var cfg_trail_value_trail_tr=frameContext[:cfg_trail_value_trail_tr] as Toybox.Lang.String;var cfg_trail_value_trail_tr_color=frameContext[:cfg_trail_value_trail_tr_color] as Toybox.Lang.Number;var cfg_trail_value_trail_bl=frameContext[:cfg_trail_value_trail_bl] as Toybox.Lang.String;var cfg_trail_value_trail_bl_color=frameContext[:cfg_trail_value_trail_bl_color] as Toybox.Lang.Number;

// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22trail_icon_trail_tr_heartRate%22%2C%22partId%22%3A%22trail_icon_trail_tr_heartRate%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22active%22%7D
if(true){if((cfg_trail_value_trail_tr.equals("heartRate")) && cfgTheme==1){textPaint(dc,cfg_trail_value_trail_tr_color,255);dc.setColor(cfg_trail_value_trail_tr_color,Graphics.COLOR_TRANSPARENT);dc.drawText(px(333),px(122),fontFor(Rez.Fonts.GfcMask_native454_icon_heartRate_20_20_1000),"A",Graphics.TEXT_JUSTIFY_LEFT);}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22trail_icon_trail_bl_temperature%22%2C%22partId%22%3A%22trail_icon_trail_bl_temperature%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22active%22%7D
if(true){if((cfg_trail_value_trail_bl.equals("temperature")) && cfgTheme==1){textPaint(dc,cfg_trail_value_trail_bl_color,255);dc.setColor(cfg_trail_value_trail_bl_color,Graphics.COLOR_TRANSPARENT);dc.drawText(px(101),px(310),fontFor(Rez.Fonts.GfcMask_native454_icon_temperature_20_20_1000),"A",Graphics.TEXT_JUSTIFY_LEFT);}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22trail_icon_trail_bl_battery%22%2C%22partId%22%3A%22trail_icon_trail_bl_battery%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22active%22%7D
if(true){if((cfg_trail_value_trail_bl.equals("battery")) && cfgTheme==1){textPaint(dc,cfg_trail_value_trail_bl_color,255);dc.setColor(cfg_trail_value_trail_bl_color,Graphics.COLOR_TRANSPARENT);dc.drawText(px(101),px(310),fontFor(Rez.Fonts.GfcMask_native454_icon_battery_20_20_1000),"A",Graphics.TEXT_JUSTIFY_LEFT);}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22trail_icon_trail_bl_distance%22%2C%22partId%22%3A%22trail_icon_trail_bl_distance%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22active%22%7D
if(true){if((cfg_trail_value_trail_bl.equals("distance")) && cfgTheme==1){textPaint(dc,cfg_trail_value_trail_bl_color,255);dc.setColor(cfg_trail_value_trail_bl_color,Graphics.COLOR_TRANSPARENT);dc.drawText(px(101),px(310),fontFor(Rez.Fonts.GfcMask_native454_icon_distance_20_20_1000),"A",Graphics.TEXT_JUSTIFY_LEFT);}}
// GFC_LAYER_END

}
function render_active_15(dc as Graphics.Dc) as Void {var cfgTheme=frameContext[:cfgTheme] as Toybox.Lang.Number;var cfg_trail_value_trail_bl=frameContext[:cfg_trail_value_trail_bl] as Toybox.Lang.String;var cfg_trail_value_trail_bl_color=frameContext[:cfg_trail_value_trail_bl_color] as Toybox.Lang.Number;var cfg_trail_value_trail_br=frameContext[:cfg_trail_value_trail_br] as Toybox.Lang.String;var cfg_trail_value_trail_br_color=frameContext[:cfg_trail_value_trail_br_color] as Toybox.Lang.Number;

// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22trail_icon_trail_bl_calories%22%2C%22partId%22%3A%22trail_icon_trail_bl_calories%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22active%22%7D
if(true){if((cfg_trail_value_trail_bl.equals("calories")) && cfgTheme==1){textPaint(dc,cfg_trail_value_trail_bl_color,255);dc.setColor(cfg_trail_value_trail_bl_color,Graphics.COLOR_TRANSPARENT);dc.drawText(px(101),px(310),fontFor(Rez.Fonts.GfcMask_native454_icon_calories_20_20_1000),"A",Graphics.TEXT_JUSTIFY_LEFT);}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22trail_icon_trail_bl_steps%22%2C%22partId%22%3A%22trail_icon_trail_bl_steps%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22active%22%7D
if(true){if((cfg_trail_value_trail_bl.equals("steps")) && cfgTheme==1){textPaint(dc,cfg_trail_value_trail_bl_color,255);dc.setColor(cfg_trail_value_trail_bl_color,Graphics.COLOR_TRANSPARENT);dc.drawText(px(101),px(310),fontFor(Rez.Fonts.GfcMask_native454_icon_steps_20_20_1000),"A",Graphics.TEXT_JUSTIFY_LEFT);}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22trail_icon_trail_bl_heartRate%22%2C%22partId%22%3A%22trail_icon_trail_bl_heartRate%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22active%22%7D
if(true){if((cfg_trail_value_trail_bl.equals("heartRate")) && cfgTheme==1){textPaint(dc,cfg_trail_value_trail_bl_color,255);dc.setColor(cfg_trail_value_trail_bl_color,Graphics.COLOR_TRANSPARENT);dc.drawText(px(101),px(310),fontFor(Rez.Fonts.GfcMask_native454_icon_heartRate_20_20_1000),"A",Graphics.TEXT_JUSTIFY_LEFT);}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22trail_icon_trail_br_temperature%22%2C%22partId%22%3A%22trail_icon_trail_br_temperature%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22active%22%7D
if(true){if((cfg_trail_value_trail_br.equals("temperature")) && cfgTheme==1){textPaint(dc,cfg_trail_value_trail_br_color,255);dc.setColor(cfg_trail_value_trail_br_color,Graphics.COLOR_TRANSPARENT);dc.drawText(px(333),px(310),fontFor(Rez.Fonts.GfcMask_native454_icon_temperature_20_20_1000),"A",Graphics.TEXT_JUSTIFY_LEFT);}}
// GFC_LAYER_END

}
function render_active_16(dc as Graphics.Dc) as Void {var cfgTheme=frameContext[:cfgTheme] as Toybox.Lang.Number;var cfg_trail_value_trail_br=frameContext[:cfg_trail_value_trail_br] as Toybox.Lang.String;var cfg_trail_value_trail_br_color=frameContext[:cfg_trail_value_trail_br_color] as Toybox.Lang.Number;

// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22trail_icon_trail_br_battery%22%2C%22partId%22%3A%22trail_icon_trail_br_battery%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22active%22%7D
if(true){if((cfg_trail_value_trail_br.equals("battery")) && cfgTheme==1){textPaint(dc,cfg_trail_value_trail_br_color,255);dc.setColor(cfg_trail_value_trail_br_color,Graphics.COLOR_TRANSPARENT);dc.drawText(px(333),px(310),fontFor(Rez.Fonts.GfcMask_native454_icon_battery_20_20_1000),"A",Graphics.TEXT_JUSTIFY_LEFT);}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22trail_icon_trail_br_distance%22%2C%22partId%22%3A%22trail_icon_trail_br_distance%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22active%22%7D
if(true){if((cfg_trail_value_trail_br.equals("distance")) && cfgTheme==1){textPaint(dc,cfg_trail_value_trail_br_color,255);dc.setColor(cfg_trail_value_trail_br_color,Graphics.COLOR_TRANSPARENT);dc.drawText(px(333),px(310),fontFor(Rez.Fonts.GfcMask_native454_icon_distance_20_20_1000),"A",Graphics.TEXT_JUSTIFY_LEFT);}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22trail_icon_trail_br_calories%22%2C%22partId%22%3A%22trail_icon_trail_br_calories%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22active%22%7D
if(true){if((cfg_trail_value_trail_br.equals("calories")) && cfgTheme==1){textPaint(dc,cfg_trail_value_trail_br_color,255);dc.setColor(cfg_trail_value_trail_br_color,Graphics.COLOR_TRANSPARENT);dc.drawText(px(333),px(310),fontFor(Rez.Fonts.GfcMask_native454_icon_calories_20_20_1000),"A",Graphics.TEXT_JUSTIFY_LEFT);}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22trail_icon_trail_br_steps%22%2C%22partId%22%3A%22trail_icon_trail_br_steps%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22active%22%7D
if(true){if((cfg_trail_value_trail_br.equals("steps")) && cfgTheme==1){textPaint(dc,cfg_trail_value_trail_br_color,255);dc.setColor(cfg_trail_value_trail_br_color,Graphics.COLOR_TRANSPARENT);dc.drawText(px(333),px(310),fontFor(Rez.Fonts.GfcMask_native454_icon_steps_20_20_1000),"A",Graphics.TEXT_JUSTIFY_LEFT);}}
// GFC_LAYER_END

}
function render_active_17(dc as Graphics.Dc) as Void {var databattery=frameContext[:databattery];var cfgTheme=frameContext[:cfgTheme] as Toybox.Lang.Number;var cfg_trail_value_trail_tl=frameContext[:cfg_trail_value_trail_tl] as Toybox.Lang.String;var cfg_trail_value_trail_br=frameContext[:cfg_trail_value_trail_br] as Toybox.Lang.String;var cfg_trail_value_trail_br_color=frameContext[:cfg_trail_value_trail_br_color] as Toybox.Lang.Number;var cfg_trail_battery_color=frameContext[:cfg_trail_battery_color] as Toybox.Lang.Number;var calendar=frameContext[:calendar];var dateText=frameContext[:dateText];

// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22trail_icon_trail_br_heartRate%22%2C%22partId%22%3A%22trail_icon_trail_br_heartRate%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22active%22%7D
if(true){if((cfg_trail_value_trail_br.equals("heartRate")) && cfgTheme==1){textPaint(dc,cfg_trail_value_trail_br_color,255);dc.setColor(cfg_trail_value_trail_br_color,Graphics.COLOR_TRANSPARENT);dc.drawText(px(333),px(310),fontFor(Rez.Fonts.GfcMask_native454_icon_heartRate_20_20_1000),"A",Graphics.TEXT_JUSTIFY_LEFT);}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22trail_battery_meter%22%2C%22partId%22%3A%22trail_battery_meter%22%2C%22capabilityId%22%3A%22core.meter%22%2C%22mode%22%3A%22active%22%7D
if(true){if(cfgTheme==1){{var value=databattery;var meterInk=0x6E6A62;if(metricValid(value,"battery")){if(true && value<10){meterInk=0xFF4D5E;}else if(value>=10 && value<30){meterInk=0xFFC04A;}else if(value>=30 && true){meterInk=cfg_trail_battery_color;}}{dc.setColor(0x2E2A20,Graphics.COLOR_TRANSPARENT);dc.fillRectangle(px(167),px(388),px(120),px(9));var ratio=0.0;if(metricValid(databattery,"battery")){ratio=databattery*1.0/100;if(ratio>1){ratio=1;}}dc.setColor(meterInk,Graphics.COLOR_TRANSPARENT);dc.fillRectangle(px(167),px(388),px(120*ratio),px(9));}}}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22trail_date_main%22%2C%22partId%22%3A%22trail_date_main%22%2C%22capabilityId%22%3A%22core.date%22%2C%22mode%22%3A%22active%22%7D
if(true){if(cfgTheme==1){textPaint(dc,0x8492A0,255);dc.drawText(px(227),px(102),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_20),dateText.substring(0,4)+calendar.day.format("%02d"),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22trail_label_trail_tl%22%2C%22partId%22%3A%22trail_label_trail_tl%22%2C%22capabilityId%22%3A%22core.text%22%2C%22mode%22%3A%22active%22%7D
if(true){if(cfgTheme==1){if(cfg_trail_value_trail_tl.equals("heartRate")){textPaint(dc,0x8492A0,255);dc.drawText(px(111),px(189),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_11),"BPM",Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}else if(cfg_trail_value_trail_tl.equals("steps")){textPaint(dc,0x8492A0,255);dc.drawText(px(111),px(189),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_11),"STEPS",Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}else if(cfg_trail_value_trail_tl.equals("calories")){textPaint(dc,0x8492A0,255);dc.drawText(px(111),px(189),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_11),"KCAL",Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}else if(cfg_trail_value_trail_tl.equals("distance")){textPaint(dc,0x8492A0,255);dc.drawText(px(111),px(189),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_11),"KM",Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}else if(cfg_trail_value_trail_tl.equals("battery")){textPaint(dc,0x8492A0,255);dc.drawText(px(111),px(189),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_11),"%",Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}else if(cfg_trail_value_trail_tl.equals("temperature")){textPaint(dc,0x8492A0,255);dc.drawText(px(111),px(189),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_11),"TEMP",Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}}
// GFC_LAYER_END

}
function render_active_18(dc as Graphics.Dc) as Void {var dataheartRate=frameContext[:dataheartRate];var datasteps=frameContext[:datasteps];var datacalories=frameContext[:datacalories];var datadistance=frameContext[:datadistance];var databattery=frameContext[:databattery];var datatemperature=frameContext[:datatemperature];var cfgTheme=frameContext[:cfgTheme] as Toybox.Lang.Number;var cfg_trail_value_trail_tl=frameContext[:cfg_trail_value_trail_tl] as Toybox.Lang.String;var cfg_trail_value_trail_tl_color=frameContext[:cfg_trail_value_trail_tl_color] as Toybox.Lang.Number;var cfg_trail_value_trail_tr=frameContext[:cfg_trail_value_trail_tr] as Toybox.Lang.String;var cfg_trail_value_trail_bl=frameContext[:cfg_trail_value_trail_bl] as Toybox.Lang.String;var cfg_trail_value_trail_br=frameContext[:cfg_trail_value_trail_br] as Toybox.Lang.String;

// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22trail_label_trail_tr%22%2C%22partId%22%3A%22trail_label_trail_tr%22%2C%22capabilityId%22%3A%22core.text%22%2C%22mode%22%3A%22active%22%7D
if(true){if(cfgTheme==1){if(cfg_trail_value_trail_tr.equals("heartRate")){textPaint(dc,0x8492A0,255);dc.drawText(px(343),px(189),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_11),"BPM",Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}else if(cfg_trail_value_trail_tr.equals("steps")){textPaint(dc,0x8492A0,255);dc.drawText(px(343),px(189),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_11),"STEPS",Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}else if(cfg_trail_value_trail_tr.equals("calories")){textPaint(dc,0x8492A0,255);dc.drawText(px(343),px(189),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_11),"KCAL",Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}else if(cfg_trail_value_trail_tr.equals("distance")){textPaint(dc,0x8492A0,255);dc.drawText(px(343),px(189),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_11),"KM",Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}else if(cfg_trail_value_trail_tr.equals("battery")){textPaint(dc,0x8492A0,255);dc.drawText(px(343),px(189),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_11),"%",Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}else if(cfg_trail_value_trail_tr.equals("temperature")){textPaint(dc,0x8492A0,255);dc.drawText(px(343),px(189),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_11),"C",Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22trail_label_trail_bl%22%2C%22partId%22%3A%22trail_label_trail_bl%22%2C%22capabilityId%22%3A%22core.text%22%2C%22mode%22%3A%22active%22%7D
if(true){if(cfgTheme==1){if(cfg_trail_value_trail_bl.equals("heartRate")){textPaint(dc,0x8492A0,255);dc.drawText(px(111),px(377),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_11),"BPM",Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}else if(cfg_trail_value_trail_bl.equals("steps")){textPaint(dc,0x8492A0,255);dc.drawText(px(111),px(377),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_11),"STEPS",Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}else if(cfg_trail_value_trail_bl.equals("calories")){textPaint(dc,0x8492A0,255);dc.drawText(px(111),px(377),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_11),"KCAL",Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}else if(cfg_trail_value_trail_bl.equals("distance")){textPaint(dc,0x8492A0,255);dc.drawText(px(111),px(377),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_11),"KM",Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}else if(cfg_trail_value_trail_bl.equals("battery")){textPaint(dc,0x8492A0,255);dc.drawText(px(111),px(377),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_11),"%",Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}else if(cfg_trail_value_trail_bl.equals("temperature")){textPaint(dc,0x8492A0,255);dc.drawText(px(111),px(377),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_11),"C",Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22trail_label_trail_br%22%2C%22partId%22%3A%22trail_label_trail_br%22%2C%22capabilityId%22%3A%22core.text%22%2C%22mode%22%3A%22active%22%7D
if(true){if(cfgTheme==1){if(cfg_trail_value_trail_br.equals("heartRate")){textPaint(dc,0x8492A0,255);dc.drawText(px(343),px(377),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_11),"BPM",Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}else if(cfg_trail_value_trail_br.equals("steps")){textPaint(dc,0x8492A0,255);dc.drawText(px(343),px(377),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_11),"STEPS",Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}else if(cfg_trail_value_trail_br.equals("calories")){textPaint(dc,0x8492A0,255);dc.drawText(px(343),px(377),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_11),"KCAL",Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}else if(cfg_trail_value_trail_br.equals("distance")){textPaint(dc,0x8492A0,255);dc.drawText(px(343),px(377),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_11),"KM",Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}else if(cfg_trail_value_trail_br.equals("battery")){textPaint(dc,0x8492A0,255);dc.drawText(px(343),px(377),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_11),"%",Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}else if(cfg_trail_value_trail_br.equals("temperature")){textPaint(dc,0x8492A0,255);dc.drawText(px(343),px(377),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_11),"C",Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22trail_value_trail_tl%22%2C%22partId%22%3A%22trail_value_trail_tl%22%2C%22capabilityId%22%3A%22core.metric%22%2C%22mode%22%3A%22active%22%7D
if(true){if(cfgTheme==1){if(cfg_trail_value_trail_tl.equals("heartRate")){{var value=dataheartRate;var ink=cfg_trail_value_trail_tl_color;if(metricValid(value,"heartRate")){if(value>=0 && value<120){ink=cfg_trail_value_trail_tl_color;}else if(value>=120 && value<150){ink=0xffee44;}else if(value>=150 && true){ink=0xff5566;}}textPaint(dc,ink,255);dc.drawText(px(111),px(162),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_34),metricText(value,"heartRate","","",0,"--",false),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}else if(cfg_trail_value_trail_tl.equals("steps")){{var value=datasteps;textPaint(dc,cfg_trail_value_trail_tl_color,255);dc.drawText(px(111),px(162),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_34),metricText(value,"steps","","",0,"--",true),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}else if(cfg_trail_value_trail_tl.equals("calories")){{var value=datacalories;textPaint(dc,cfg_trail_value_trail_tl_color,255);dc.drawText(px(111),px(162),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_34),metricText(value,"calories","","",0,"--",false),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}else if(cfg_trail_value_trail_tl.equals("distance")){{var value=datadistance;textPaint(dc,cfg_trail_value_trail_tl_color,255);dc.drawText(px(111),px(162),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_34),metricText(value,"distance","","",2,"--",false),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}else if(cfg_trail_value_trail_tl.equals("battery")){{var value=databattery;var ink=cfg_trail_value_trail_tl_color;if(metricValid(value,"battery")){if(value>=0 && value<10){ink=0xff5566;}else if(value>=10 && value<30){ink=0xffee44;}else if(value>=30 && true){ink=cfg_trail_value_trail_tl_color;}}textPaint(dc,ink,255);dc.drawText(px(111),px(162),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_34),metricText(value,"battery","","",0,"--",false),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}else if(cfg_trail_value_trail_tl.equals("temperature")){{var value=datatemperature;var ink=cfg_trail_value_trail_tl_color;if(metricValid(value,"temperature")){}textPaint(dc,ink,255);dc.drawText(px(111),px(162),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_34),metricText(value,"temperature","","°",0,"--",false),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}}}
// GFC_LAYER_END

}
function render_active_19(dc as Graphics.Dc) as Void {var dataheartRate=frameContext[:dataheartRate];var datasteps=frameContext[:datasteps];var datacalories=frameContext[:datacalories];var datadistance=frameContext[:datadistance];var databattery=frameContext[:databattery];var datatemperature=frameContext[:datatemperature];var cfgTheme=frameContext[:cfgTheme] as Toybox.Lang.Number;var cfg_trail_value_trail_tr=frameContext[:cfg_trail_value_trail_tr] as Toybox.Lang.String;var cfg_trail_value_trail_tr_color=frameContext[:cfg_trail_value_trail_tr_color] as Toybox.Lang.Number;var cfg_trail_value_trail_bl=frameContext[:cfg_trail_value_trail_bl] as Toybox.Lang.String;var cfg_trail_value_trail_bl_color=frameContext[:cfg_trail_value_trail_bl_color] as Toybox.Lang.Number;var cfg_trail_value_trail_br=frameContext[:cfg_trail_value_trail_br] as Toybox.Lang.String;var cfg_trail_value_trail_br_color=frameContext[:cfg_trail_value_trail_br_color] as Toybox.Lang.Number;var cfg_trail_battery_color=frameContext[:cfg_trail_battery_color] as Toybox.Lang.Number;

// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22trail_value_trail_tr%22%2C%22partId%22%3A%22trail_value_trail_tr%22%2C%22capabilityId%22%3A%22core.metric%22%2C%22mode%22%3A%22active%22%7D
if(true){if(cfgTheme==1){if(cfg_trail_value_trail_tr.equals("heartRate")){{var value=dataheartRate;var ink=cfg_trail_value_trail_tr_color;if(metricValid(value,"heartRate")){if(value>=0 && value<120){ink=cfg_trail_value_trail_tr_color;}else if(value>=120 && value<150){ink=0xffee44;}else if(value>=150 && true){ink=0xff5566;}}textPaint(dc,ink,255);dc.drawText(px(343),px(162),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_34),metricText(value,"heartRate","","",0,"--",false),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}else if(cfg_trail_value_trail_tr.equals("steps")){{var value=datasteps;textPaint(dc,cfg_trail_value_trail_tr_color,255);dc.drawText(px(343),px(162),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_34),metricText(value,"steps","","",0,"--",true),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}else if(cfg_trail_value_trail_tr.equals("calories")){{var value=datacalories;textPaint(dc,cfg_trail_value_trail_tr_color,255);dc.drawText(px(343),px(162),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_34),metricText(value,"calories","","",0,"--",false),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}else if(cfg_trail_value_trail_tr.equals("distance")){{var value=datadistance;var ink=cfg_trail_value_trail_tr_color;if(metricValid(value,"distance")){}textPaint(dc,ink,255);dc.drawText(px(343),px(162),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_34),metricText(value,"distance","","",1,"--",false),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}else if(cfg_trail_value_trail_tr.equals("battery")){{var value=databattery;var ink=cfg_trail_value_trail_tr_color;if(metricValid(value,"battery")){if(value>=0 && value<10){ink=0xff5566;}else if(value>=10 && value<30){ink=0xffee44;}else if(value>=30 && true){ink=cfg_trail_value_trail_tr_color;}}textPaint(dc,ink,255);dc.drawText(px(343),px(162),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_34),metricText(value,"battery","","",0,"--",false),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}else if(cfg_trail_value_trail_tr.equals("temperature")){{var value=datatemperature;textPaint(dc,cfg_trail_value_trail_tr_color,255);dc.drawText(px(343),px(162),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_34),metricText(value,"temperature","","°",1,"--",false),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22trail_value_trail_bl%22%2C%22partId%22%3A%22trail_value_trail_bl%22%2C%22capabilityId%22%3A%22core.metric%22%2C%22mode%22%3A%22active%22%7D
if(true){if(cfgTheme==1){if(cfg_trail_value_trail_bl.equals("heartRate")){{var value=dataheartRate;var ink=0x6E6A62;if(metricValid(value,"heartRate")){if(true && value<120){ink=cfg_trail_value_trail_bl_color;}else if(value>=120 && value<150){ink=0xFFC04A;}else if(value>=150 && true){ink=0xFF4D5E;}}textPaint(dc,ink,255);dc.drawText(px(111),px(350),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_34),metricText(value,"heartRate","","",0,"--",false),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}else if(cfg_trail_value_trail_bl.equals("steps")){{var value=datasteps;textPaint(dc,cfg_trail_value_trail_bl_color,255);dc.drawText(px(111),px(350),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_34),metricText(value,"steps","","",0,"--",true),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}else if(cfg_trail_value_trail_bl.equals("calories")){{var value=datacalories;textPaint(dc,cfg_trail_value_trail_bl_color,255);dc.drawText(px(111),px(350),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_34),metricText(value,"calories","","",0,"--",false),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}else if(cfg_trail_value_trail_bl.equals("distance")){{var value=datadistance;textPaint(dc,cfg_trail_value_trail_bl_color,255);dc.drawText(px(111),px(350),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_34),metricText(value,"distance","","",2,"--",false),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}else if(cfg_trail_value_trail_bl.equals("battery")){{var value=databattery;var ink=cfg_trail_value_trail_bl_color;if(metricValid(value,"battery")){if(value>=0 && value<10){ink=0xff5566;}else if(value>=10 && value<30){ink=0xffee44;}else if(value>=30 && true){ink=cfg_trail_value_trail_bl_color;}}textPaint(dc,ink,255);dc.drawText(px(111),px(350),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_34),metricText(value,"battery","","",0,"--",false),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}else if(cfg_trail_value_trail_bl.equals("temperature")){{var value=datatemperature;textPaint(dc,cfg_trail_value_trail_bl_color,255);dc.drawText(px(111),px(350),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_34),metricText(value,"temperature","","°",1,"--",false),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22trail_value_trail_br%22%2C%22partId%22%3A%22trail_value_trail_br%22%2C%22capabilityId%22%3A%22core.metric%22%2C%22mode%22%3A%22active%22%7D
if(true){if(cfgTheme==1){if(cfg_trail_value_trail_br.equals("heartRate")){{var value=dataheartRate;var ink=cfg_trail_value_trail_br_color;if(metricValid(value,"heartRate")){if(value>=0 && value<120){ink=cfg_trail_value_trail_br_color;}else if(value>=120 && value<150){ink=0xffee44;}else if(value>=150 && true){ink=0xff5566;}}textPaint(dc,ink,255);dc.drawText(px(343),px(350),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_34),metricText(value,"heartRate","","",0,"--",false),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}else if(cfg_trail_value_trail_br.equals("steps")){{var value=datasteps;var ink=cfg_trail_value_trail_br_color;if(metricValid(value,"steps")){}textPaint(dc,ink,255);dc.drawText(px(343),px(350),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_34),metricText(value,"steps","","",0,"--",true),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}else if(cfg_trail_value_trail_br.equals("calories")){{var value=datacalories;textPaint(dc,cfg_trail_value_trail_br_color,255);dc.drawText(px(343),px(350),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_34),metricText(value,"calories","","",0,"--",false),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}else if(cfg_trail_value_trail_br.equals("distance")){{var value=datadistance;textPaint(dc,cfg_trail_value_trail_br_color,255);dc.drawText(px(343),px(350),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_34),metricText(value,"distance","","",2,"--",false),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}else if(cfg_trail_value_trail_br.equals("battery")){{var value=databattery;var ink=cfg_trail_value_trail_br_color;if(metricValid(value,"battery")){if(value>=0 && value<10){ink=0xff5566;}else if(value>=10 && value<30){ink=0xffee44;}else if(value>=30 && true){ink=cfg_trail_value_trail_br_color;}}textPaint(dc,ink,255);dc.drawText(px(343),px(350),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_34),metricText(value,"battery","","",0,"--",false),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}else if(cfg_trail_value_trail_br.equals("temperature")){{var value=datatemperature;textPaint(dc,cfg_trail_value_trail_br_color,255);dc.drawText(px(343),px(350),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_34),metricText(value,"temperature","","°",1,"--",false),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22trail_battery_value%22%2C%22partId%22%3A%22trail_battery_value%22%2C%22capabilityId%22%3A%22core.metric%22%2C%22mode%22%3A%22active%22%7D
if(true){if(cfgTheme==1){{var value=databattery;var ink=0x6E6A62;if(metricValid(value,"battery")){if(true && value<10){ink=0xFF4D5E;}else if(value>=10 && value<30){ink=0xFFC04A;}else if(value>=30 && true){ink=cfg_trail_battery_color;}}textPaint(dc,ink,255);dc.drawText(px(227),px(414),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_34),metricText(value,"battery","","%",0,"--",false),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}}
// GFC_LAYER_END

}
function render_active_20(dc as Graphics.Dc) as Void {var clock=frameContext[:clock];var cfgTheme=frameContext[:cfgTheme] as Toybox.Lang.Number;var cfg_trail_value_trail_tl=frameContext[:cfg_trail_value_trail_tl] as Toybox.Lang.String;var cfg_trail_time_color=frameContext[:cfg_trail_time_color] as Toybox.Lang.Number;var cfg_trail_show_seconds=frameContext[:cfg_trail_show_seconds] as Toybox.Lang.Boolean;

// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22trail_time_main%22%2C%22partId%22%3A%22trail_time_main%22%2C%22capabilityId%22%3A%22core.time%22%2C%22mode%22%3A%22active%22%7D
if(true){if(cfgTheme==1){textPaint(dc,cfg_trail_time_color,255);dc.drawText(px(227),px(235),fontFor(Rez.Fonts.GfcCustom_local_ca177c514f264e623225342630000000_88),clock.hour.format("%02d")+":"+clock.min.format("%02d"),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22trail_seconds%22%2C%22partId%22%3A%22trail_seconds%22%2C%22capabilityId%22%3A%22core.time%22%2C%22mode%22%3A%22active%22%7D
if(true){if(cfg_trail_show_seconds && cfgTheme==1){textPaint(dc,0xFFC04A,255);dc.drawText(px(227),px(297),fontFor(Rez.Fonts.GfcCustom_local_ca177c514f264e623225342630000000_20),clock.sec.format("%02d"),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22trail_aod_time%22%2C%22partId%22%3A%22trail_aod_time%22%2C%22capabilityId%22%3A%22core.time%22%2C%22mode%22%3A%22active%22%7D
if(true){if(cfgTheme==1){}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22trail_aod_temp%22%2C%22partId%22%3A%22trail_aod_temp%22%2C%22capabilityId%22%3A%22core.metric%22%2C%22mode%22%3A%22active%22%7D
if(true){if(cfgTheme==1){if(cfg_trail_value_trail_tl.equals("heartRate")){}else if(cfg_trail_value_trail_tl.equals("steps")){}else if(cfg_trail_value_trail_tl.equals("calories")){}else if(cfg_trail_value_trail_tl.equals("distance")){}else if(cfg_trail_value_trail_tl.equals("battery")){}else if(cfg_trail_value_trail_tl.equals("temperature")){}}}
// GFC_LAYER_END

}
function render_active_21(dc as Graphics.Dc) as Void {var cfgTheme=frameContext[:cfgTheme] as Toybox.Lang.Number;var cfg_trail_value_trail_tr=frameContext[:cfg_trail_value_trail_tr] as Toybox.Lang.String;

// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22trail_aod_dot%22%2C%22partId%22%3A%22trail_aod_dot%22%2C%22capabilityId%22%3A%22core.text%22%2C%22mode%22%3A%22active%22%7D
if(true){if(cfgTheme==1){}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22trail_aod_distance%22%2C%22partId%22%3A%22trail_aod_distance%22%2C%22capabilityId%22%3A%22core.metric%22%2C%22mode%22%3A%22active%22%7D
if(true){if(cfgTheme==1){if(cfg_trail_value_trail_tr.equals("heartRate")){}else if(cfg_trail_value_trail_tr.equals("steps")){}else if(cfg_trail_value_trail_tr.equals("calories")){}else if(cfg_trail_value_trail_tr.equals("distance")){}else if(cfg_trail_value_trail_tr.equals("battery")){}else if(cfg_trail_value_trail_tr.equals("temperature")){}}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22trail_aod_km%22%2C%22partId%22%3A%22trail_aod_km%22%2C%22capabilityId%22%3A%22core.text%22%2C%22mode%22%3A%22active%22%7D
if(true){if(cfgTheme==1){if(cfg_trail_value_trail_tr.equals("heartRate")){}else if(cfg_trail_value_trail_tr.equals("steps")){}else if(cfg_trail_value_trail_tr.equals("calories")){}else if(cfg_trail_value_trail_tr.equals("distance")){}else if(cfg_trail_value_trail_tr.equals("battery")){}else if(cfg_trail_value_trail_tr.equals("temperature")){}}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22trail_aod_battery%22%2C%22partId%22%3A%22trail_aod_battery%22%2C%22capabilityId%22%3A%22core.metric%22%2C%22mode%22%3A%22active%22%7D
if(true){if(cfgTheme==1){}}
// GFC_LAYER_END

}
function render_active_22(dc as Graphics.Dc) as Void {var cfgTheme=frameContext[:cfgTheme] as Toybox.Lang.Number;var cfg_vital_value_vital_bl=frameContext[:cfg_vital_value_vital_bl] as Toybox.Lang.String;var cfg_vital_value_vital_bl_color=frameContext[:cfg_vital_value_vital_bl_color] as Toybox.Lang.Number;var cfg_vital_show_bg_art=frameContext[:cfg_vital_show_bg_art] as Toybox.Lang.Boolean;var cfg_vital_show_ticks=frameContext[:cfg_vital_show_ticks] as Toybox.Lang.Boolean;

// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22vital_bg_art%22%2C%22partId%22%3A%22vital_bg_art%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22active%22%7D
if(true){if(cfg_vital_show_bg_art && cfgTheme==2){drawStaticImage(dc,Rez.Drawables.GfcImage_vital_bg_art,px(0),px(0));}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22vital_ticks%22%2C%22partId%22%3A%22vital_ticks%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22active%22%7D
if(true){if(cfg_vital_show_ticks && cfgTheme==2){drawStaticImage(dc,Rez.Drawables.GfcImage_vital_ticks,px(0),px(0));}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22vital_icon_vital_bl_temperature%22%2C%22partId%22%3A%22vital_icon_vital_bl_temperature%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22active%22%7D
if(true){if((cfg_vital_value_vital_bl.equals("temperature")) && cfgTheme==2){textPaint(dc,cfg_vital_value_vital_bl_color,255);dc.setColor(cfg_vital_value_vital_bl_color,Graphics.COLOR_TRANSPARENT);dc.drawText(px(101),px(310),fontFor(Rez.Fonts.GfcMask_native454_icon_temperature_20_20_1000),"A",Graphics.TEXT_JUSTIFY_LEFT);}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22vital_icon_vital_bl_battery%22%2C%22partId%22%3A%22vital_icon_vital_bl_battery%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22active%22%7D
if(true){if((cfg_vital_value_vital_bl.equals("battery")) && cfgTheme==2){textPaint(dc,cfg_vital_value_vital_bl_color,255);dc.setColor(cfg_vital_value_vital_bl_color,Graphics.COLOR_TRANSPARENT);dc.drawText(px(101),px(310),fontFor(Rez.Fonts.GfcMask_native454_icon_battery_20_20_1000),"A",Graphics.TEXT_JUSTIFY_LEFT);}}
// GFC_LAYER_END

}
function render_active_23(dc as Graphics.Dc) as Void {var cfgTheme=frameContext[:cfgTheme] as Toybox.Lang.Number;var cfg_vital_value_vital_bl=frameContext[:cfg_vital_value_vital_bl] as Toybox.Lang.String;var cfg_vital_value_vital_bl_color=frameContext[:cfg_vital_value_vital_bl_color] as Toybox.Lang.Number;

// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22vital_icon_vital_bl_distance%22%2C%22partId%22%3A%22vital_icon_vital_bl_distance%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22active%22%7D
if(true){if((cfg_vital_value_vital_bl.equals("distance")) && cfgTheme==2){textPaint(dc,cfg_vital_value_vital_bl_color,255);dc.setColor(cfg_vital_value_vital_bl_color,Graphics.COLOR_TRANSPARENT);dc.drawText(px(101),px(310),fontFor(Rez.Fonts.GfcMask_native454_icon_distance_20_20_1000),"A",Graphics.TEXT_JUSTIFY_LEFT);}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22vital_icon_vital_bl_calories%22%2C%22partId%22%3A%22vital_icon_vital_bl_calories%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22active%22%7D
if(true){if((cfg_vital_value_vital_bl.equals("calories")) && cfgTheme==2){textPaint(dc,cfg_vital_value_vital_bl_color,255);dc.setColor(cfg_vital_value_vital_bl_color,Graphics.COLOR_TRANSPARENT);dc.drawText(px(101),px(310),fontFor(Rez.Fonts.GfcMask_native454_icon_calories_20_20_1000),"A",Graphics.TEXT_JUSTIFY_LEFT);}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22vital_icon_vital_bl_steps%22%2C%22partId%22%3A%22vital_icon_vital_bl_steps%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22active%22%7D
if(true){if((cfg_vital_value_vital_bl.equals("steps")) && cfgTheme==2){textPaint(dc,cfg_vital_value_vital_bl_color,255);dc.setColor(cfg_vital_value_vital_bl_color,Graphics.COLOR_TRANSPARENT);dc.drawText(px(101),px(310),fontFor(Rez.Fonts.GfcMask_native454_icon_steps_20_20_1000),"A",Graphics.TEXT_JUSTIFY_LEFT);}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22vital_icon_vital_bl_heartRate%22%2C%22partId%22%3A%22vital_icon_vital_bl_heartRate%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22active%22%7D
if(true){if((cfg_vital_value_vital_bl.equals("heartRate")) && cfgTheme==2){textPaint(dc,cfg_vital_value_vital_bl_color,255);dc.setColor(cfg_vital_value_vital_bl_color,Graphics.COLOR_TRANSPARENT);dc.drawText(px(101),px(310),fontFor(Rez.Fonts.GfcMask_native454_icon_heartRate_20_20_1000),"A",Graphics.TEXT_JUSTIFY_LEFT);}}
// GFC_LAYER_END

}
function render_active_24(dc as Graphics.Dc) as Void {var cfgTheme=frameContext[:cfgTheme] as Toybox.Lang.Number;var cfg_vital_value_vital_br=frameContext[:cfg_vital_value_vital_br] as Toybox.Lang.String;var cfg_vital_value_vital_br_color=frameContext[:cfg_vital_value_vital_br_color] as Toybox.Lang.Number;

// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22vital_icon_vital_br_temperature%22%2C%22partId%22%3A%22vital_icon_vital_br_temperature%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22active%22%7D
if(true){if((cfg_vital_value_vital_br.equals("temperature")) && cfgTheme==2){textPaint(dc,cfg_vital_value_vital_br_color,255);dc.setColor(cfg_vital_value_vital_br_color,Graphics.COLOR_TRANSPARENT);dc.drawText(px(333),px(310),fontFor(Rez.Fonts.GfcMask_native454_icon_temperature_20_20_1000),"A",Graphics.TEXT_JUSTIFY_LEFT);}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22vital_icon_vital_br_battery%22%2C%22partId%22%3A%22vital_icon_vital_br_battery%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22active%22%7D
if(true){if((cfg_vital_value_vital_br.equals("battery")) && cfgTheme==2){textPaint(dc,cfg_vital_value_vital_br_color,255);dc.setColor(cfg_vital_value_vital_br_color,Graphics.COLOR_TRANSPARENT);dc.drawText(px(333),px(310),fontFor(Rez.Fonts.GfcMask_native454_icon_battery_20_20_1000),"A",Graphics.TEXT_JUSTIFY_LEFT);}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22vital_icon_vital_br_distance%22%2C%22partId%22%3A%22vital_icon_vital_br_distance%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22active%22%7D
if(true){if((cfg_vital_value_vital_br.equals("distance")) && cfgTheme==2){textPaint(dc,cfg_vital_value_vital_br_color,255);dc.setColor(cfg_vital_value_vital_br_color,Graphics.COLOR_TRANSPARENT);dc.drawText(px(333),px(310),fontFor(Rez.Fonts.GfcMask_native454_icon_distance_20_20_1000),"A",Graphics.TEXT_JUSTIFY_LEFT);}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22vital_icon_vital_br_calories%22%2C%22partId%22%3A%22vital_icon_vital_br_calories%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22active%22%7D
if(true){if((cfg_vital_value_vital_br.equals("calories")) && cfgTheme==2){textPaint(dc,cfg_vital_value_vital_br_color,255);dc.setColor(cfg_vital_value_vital_br_color,Graphics.COLOR_TRANSPARENT);dc.drawText(px(333),px(310),fontFor(Rez.Fonts.GfcMask_native454_icon_calories_20_20_1000),"A",Graphics.TEXT_JUSTIFY_LEFT);}}
// GFC_LAYER_END

}
function render_active_25(dc as Graphics.Dc) as Void {var dataheartRate=frameContext[:dataheartRate];var databattery=frameContext[:databattery];var cfgTheme=frameContext[:cfgTheme] as Toybox.Lang.Number;var cfg_vital_value_vital_br=frameContext[:cfg_vital_value_vital_br] as Toybox.Lang.String;var cfg_vital_value_vital_br_color=frameContext[:cfg_vital_value_vital_br_color] as Toybox.Lang.Number;var cfg_vital_battery_color=frameContext[:cfg_vital_battery_color] as Toybox.Lang.Number;var cfg_vital_show_zone_decoration=frameContext[:cfg_vital_show_zone_decoration] as Toybox.Lang.Boolean;

// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22vital_icon_vital_br_steps%22%2C%22partId%22%3A%22vital_icon_vital_br_steps%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22active%22%7D
if(true){if((cfg_vital_value_vital_br.equals("steps")) && cfgTheme==2){textPaint(dc,cfg_vital_value_vital_br_color,255);dc.setColor(cfg_vital_value_vital_br_color,Graphics.COLOR_TRANSPARENT);dc.drawText(px(333),px(310),fontFor(Rez.Fonts.GfcMask_native454_icon_steps_20_20_1000),"A",Graphics.TEXT_JUSTIFY_LEFT);}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22vital_icon_vital_br_heartRate%22%2C%22partId%22%3A%22vital_icon_vital_br_heartRate%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22active%22%7D
if(true){if((cfg_vital_value_vital_br.equals("heartRate")) && cfgTheme==2){textPaint(dc,cfg_vital_value_vital_br_color,255);dc.setColor(cfg_vital_value_vital_br_color,Graphics.COLOR_TRANSPARENT);dc.drawText(px(333),px(310),fontFor(Rez.Fonts.GfcMask_native454_icon_heartRate_20_20_1000),"A",Graphics.TEXT_JUSTIFY_LEFT);}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22vital_battery_meter%22%2C%22partId%22%3A%22vital_battery_meter%22%2C%22capabilityId%22%3A%22core.meter%22%2C%22mode%22%3A%22active%22%7D
if(true){if(cfgTheme==2){{var value=databattery;var meterInk=0x54736F;if(metricValid(value,"battery")){if(true && value<10){meterInk=0xFF4D5E;}else if(value>=10 && value<30){meterInk=0xFFC04A;}else if(value>=30 && true){meterInk=cfg_vital_battery_color;}}{dc.setColor(0x1E2E2C,Graphics.COLOR_TRANSPARENT);dc.fillRectangle(px(167),px(388),px(120),px(9));var ratio=0.0;if(metricValid(databattery,"battery")){ratio=databattery*1.0/100;if(ratio>1){ratio=1;}}dc.setColor(meterInk,Graphics.COLOR_TRANSPARENT);dc.fillRectangle(px(167),px(388),px(120*ratio),px(9));}}}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22vital_hr_zone_1%22%2C%22partId%22%3A%22vital_hr_zone_1%22%2C%22capabilityId%22%3A%22core.rect%22%2C%22mode%22%3A%22active%22%7D
if(((dataheartRate!=null && dataheartRate==dataheartRate && dataheartRate>0 && dataheartRate<1.0e12) ? (dataheartRate>0 && true) : false)){if(cfg_vital_show_zone_decoration && cfgTheme==2){{var polygon=[[px(127),px(298)],[px(163),px(298)],[px(163),px(306)],[px(127),px(306)]];dc.setColor(0x2A333D,Graphics.COLOR_TRANSPARENT);dc.setFill(Graphics.createColor(255,(0x2A333D>>16)&255,(0x2A333D>>8)&255,0x2A333D&255));dc.setColor(0x2A333D,Graphics.COLOR_TRANSPARENT);dc.setStroke(Graphics.createColor(0,0,0,0));dc.fillPolygon(polygon);}}}
// GFC_LAYER_END

}
function render_active_26(dc as Graphics.Dc) as Void {var dataheartRate=frameContext[:dataheartRate];var cfgTheme=frameContext[:cfgTheme] as Toybox.Lang.Number;var cfg_vital_show_zone_decoration=frameContext[:cfg_vital_show_zone_decoration] as Toybox.Lang.Boolean;

// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22vital_hr_zone_2%22%2C%22partId%22%3A%22vital_hr_zone_2%22%2C%22capabilityId%22%3A%22core.rect%22%2C%22mode%22%3A%22active%22%7D
if(((dataheartRate!=null && dataheartRate==dataheartRate && dataheartRate>0 && dataheartRate<1.0e12) ? (dataheartRate>0 && true) : false)){if(cfg_vital_show_zone_decoration && cfgTheme==2){{var polygon=[[px(170),px(298)],[px(206),px(298)],[px(206),px(306)],[px(170),px(306)]];dc.setColor(0x2A333D,Graphics.COLOR_TRANSPARENT);dc.setFill(Graphics.createColor(255,(0x2A333D>>16)&255,(0x2A333D>>8)&255,0x2A333D&255));dc.setColor(0x2A333D,Graphics.COLOR_TRANSPARENT);dc.setStroke(Graphics.createColor(0,0,0,0));dc.fillPolygon(polygon);}}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22vital_hr_zone_3%22%2C%22partId%22%3A%22vital_hr_zone_3%22%2C%22capabilityId%22%3A%22core.rect%22%2C%22mode%22%3A%22active%22%7D
if(((dataheartRate!=null && dataheartRate==dataheartRate && dataheartRate>0 && dataheartRate<1.0e12) ? (dataheartRate>0 && true) : false)){if(cfg_vital_show_zone_decoration && cfgTheme==2){{var polygon=[[px(213),px(298)],[px(249),px(298)],[px(249),px(306)],[px(213),px(306)]];dc.setColor(0x38E1D0,Graphics.COLOR_TRANSPARENT);dc.setFill(Graphics.createColor(255,(0x38E1D0>>16)&255,(0x38E1D0>>8)&255,0x38E1D0&255));dc.setColor(0x38E1D0,Graphics.COLOR_TRANSPARENT);dc.setStroke(Graphics.createColor(0,0,0,0));dc.fillPolygon(polygon);}}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22vital_hr_zone_4%22%2C%22partId%22%3A%22vital_hr_zone_4%22%2C%22capabilityId%22%3A%22core.rect%22%2C%22mode%22%3A%22active%22%7D
if(((dataheartRate!=null && dataheartRate==dataheartRate && dataheartRate>0 && dataheartRate<1.0e12) ? (dataheartRate>0 && true) : false)){if(cfg_vital_show_zone_decoration && cfgTheme==2){{var polygon=[[px(256),px(298)],[px(292),px(298)],[px(292),px(306)],[px(256),px(306)]];dc.setColor(0x2A333D,Graphics.COLOR_TRANSPARENT);dc.setFill(Graphics.createColor(255,(0x2A333D>>16)&255,(0x2A333D>>8)&255,0x2A333D&255));dc.setColor(0x2A333D,Graphics.COLOR_TRANSPARENT);dc.setStroke(Graphics.createColor(0,0,0,0));dc.fillPolygon(polygon);}}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22vital_hr_zone_5%22%2C%22partId%22%3A%22vital_hr_zone_5%22%2C%22capabilityId%22%3A%22core.rect%22%2C%22mode%22%3A%22active%22%7D
if(((dataheartRate!=null && dataheartRate==dataheartRate && dataheartRate>0 && dataheartRate<1.0e12) ? (dataheartRate>0 && true) : false)){if(cfg_vital_show_zone_decoration && cfgTheme==2){{var polygon=[[px(299),px(298)],[px(335),px(298)],[px(335),px(306)],[px(299),px(306)]];dc.setColor(0xFF4D5E,Graphics.COLOR_TRANSPARENT);dc.setFill(Graphics.createColor(255,(0xFF4D5E>>16)&255,(0xFF4D5E>>8)&255,0xFF4D5E&255));dc.setColor(0xFF4D5E,Graphics.COLOR_TRANSPARENT);dc.setStroke(Graphics.createColor(0,0,0,0));dc.fillPolygon(polygon);}}}
// GFC_LAYER_END

}
function render_active_27(dc as Graphics.Dc) as Void {var dataheartRate=frameContext[:dataheartRate];var datasteps=frameContext[:datasteps];var datacalories=frameContext[:datacalories];var datadistance=frameContext[:datadistance];var databattery=frameContext[:databattery];var datatemperature=frameContext[:datatemperature];var cfgTheme=frameContext[:cfgTheme] as Toybox.Lang.Number;var cfg_vital_value_vital_bl=frameContext[:cfg_vital_value_vital_bl] as Toybox.Lang.String;var cfg_vital_value_vital_bl_color=frameContext[:cfg_vital_value_vital_bl_color] as Toybox.Lang.Number;var cfg_vital_value_vital_br=frameContext[:cfg_vital_value_vital_br] as Toybox.Lang.String;var calendar=frameContext[:calendar];var dateText=frameContext[:dateText];

// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22vital_date_main%22%2C%22partId%22%3A%22vital_date_main%22%2C%22capabilityId%22%3A%22core.date%22%2C%22mode%22%3A%22active%22%7D
if(true){if(cfgTheme==2){textPaint(dc,0x8492A0,255);dc.drawText(px(227),px(139),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_20),dateText.substring(0,4)+calendar.day.format("%02d"),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22vital_label_vital_bl%22%2C%22partId%22%3A%22vital_label_vital_bl%22%2C%22capabilityId%22%3A%22core.text%22%2C%22mode%22%3A%22active%22%7D
if(true){if(cfgTheme==2){if(cfg_vital_value_vital_bl.equals("heartRate")){textPaint(dc,0x8492A0,255);dc.drawText(px(111),px(377),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_11),"BPM",Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}else if(cfg_vital_value_vital_bl.equals("steps")){textPaint(dc,0x8492A0,255);dc.drawText(px(111),px(377),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_11),"STEPS",Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}else if(cfg_vital_value_vital_bl.equals("calories")){textPaint(dc,0x8492A0,255);dc.drawText(px(111),px(377),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_11),"KCAL",Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}else if(cfg_vital_value_vital_bl.equals("distance")){textPaint(dc,0x8492A0,255);dc.drawText(px(111),px(377),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_11),"KM",Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}else if(cfg_vital_value_vital_bl.equals("battery")){textPaint(dc,0x8492A0,255);dc.drawText(px(111),px(377),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_11),"%",Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}else if(cfg_vital_value_vital_bl.equals("temperature")){textPaint(dc,0x8492A0,255);dc.drawText(px(111),px(377),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_11),"C",Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22vital_label_vital_br%22%2C%22partId%22%3A%22vital_label_vital_br%22%2C%22capabilityId%22%3A%22core.text%22%2C%22mode%22%3A%22active%22%7D
if(true){if(cfgTheme==2){if(cfg_vital_value_vital_br.equals("heartRate")){textPaint(dc,0x8492A0,255);dc.drawText(px(343),px(377),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_11),"BPM",Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}else if(cfg_vital_value_vital_br.equals("steps")){textPaint(dc,0x8492A0,255);dc.drawText(px(343),px(377),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_11),"STEPS",Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}else if(cfg_vital_value_vital_br.equals("calories")){textPaint(dc,0x8492A0,255);dc.drawText(px(343),px(377),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_11),"KCAL",Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}else if(cfg_vital_value_vital_br.equals("distance")){textPaint(dc,0x8492A0,255);dc.drawText(px(343),px(377),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_11),"KM",Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}else if(cfg_vital_value_vital_br.equals("battery")){textPaint(dc,0x8492A0,255);dc.drawText(px(343),px(377),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_11),"%",Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}else if(cfg_vital_value_vital_br.equals("temperature")){textPaint(dc,0x8492A0,255);dc.drawText(px(343),px(377),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_11),"C",Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22vital_value_vital_bl%22%2C%22partId%22%3A%22vital_value_vital_bl%22%2C%22capabilityId%22%3A%22core.metric%22%2C%22mode%22%3A%22active%22%7D
if(true){if(cfgTheme==2){if(cfg_vital_value_vital_bl.equals("heartRate")){{var value=dataheartRate;var ink=cfg_vital_value_vital_bl_color;if(metricValid(value,"heartRate")){if(value>=0 && value<120){ink=cfg_vital_value_vital_bl_color;}else if(value>=120 && value<150){ink=0xffee44;}else if(value>=150 && true){ink=0xff5566;}}textPaint(dc,ink,255);dc.drawText(px(111),px(350),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_34),metricText(value,"heartRate","","",0,"--",false),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}else if(cfg_vital_value_vital_bl.equals("steps")){{var value=datasteps;var ink=cfg_vital_value_vital_bl_color;if(metricValid(value,"steps")){}textPaint(dc,ink,255);dc.drawText(px(111),px(350),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_34),metricText(value,"steps","","",0,"--",true),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}else if(cfg_vital_value_vital_bl.equals("calories")){{var value=datacalories;textPaint(dc,cfg_vital_value_vital_bl_color,255);dc.drawText(px(111),px(350),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_34),metricText(value,"calories","","",0,"--",false),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}else if(cfg_vital_value_vital_bl.equals("distance")){{var value=datadistance;textPaint(dc,cfg_vital_value_vital_bl_color,255);dc.drawText(px(111),px(350),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_34),metricText(value,"distance","","",2,"--",false),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}else if(cfg_vital_value_vital_bl.equals("battery")){{var value=databattery;var ink=cfg_vital_value_vital_bl_color;if(metricValid(value,"battery")){if(value>=0 && value<10){ink=0xff5566;}else if(value>=10 && value<30){ink=0xffee44;}else if(value>=30 && true){ink=cfg_vital_value_vital_bl_color;}}textPaint(dc,ink,255);dc.drawText(px(111),px(350),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_34),metricText(value,"battery","","",0,"--",false),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}else if(cfg_vital_value_vital_bl.equals("temperature")){{var value=datatemperature;textPaint(dc,cfg_vital_value_vital_bl_color,255);dc.drawText(px(111),px(350),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_34),metricText(value,"temperature","","°",1,"--",false),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}}}
// GFC_LAYER_END

}
function render_active_28(dc as Graphics.Dc) as Void {var dataheartRate=frameContext[:dataheartRate];var datasteps=frameContext[:datasteps];var datacalories=frameContext[:datacalories];var datadistance=frameContext[:datadistance];var databattery=frameContext[:databattery];var datatemperature=frameContext[:datatemperature];var cfgTheme=frameContext[:cfgTheme] as Toybox.Lang.Number;var cfg_vital_heart_big=frameContext[:cfg_vital_heart_big] as Toybox.Lang.String;var cfg_vital_heart_big_color=frameContext[:cfg_vital_heart_big_color] as Toybox.Lang.Number;var cfg_vital_value_vital_br=frameContext[:cfg_vital_value_vital_br] as Toybox.Lang.String;var cfg_vital_value_vital_br_color=frameContext[:cfg_vital_value_vital_br_color] as Toybox.Lang.Number;var cfg_vital_battery_color=frameContext[:cfg_vital_battery_color] as Toybox.Lang.Number;

// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22vital_value_vital_br%22%2C%22partId%22%3A%22vital_value_vital_br%22%2C%22capabilityId%22%3A%22core.metric%22%2C%22mode%22%3A%22active%22%7D
if(true){if(cfgTheme==2){if(cfg_vital_value_vital_br.equals("heartRate")){{var value=dataheartRate;var ink=cfg_vital_value_vital_br_color;if(metricValid(value,"heartRate")){if(value>=0 && value<120){ink=cfg_vital_value_vital_br_color;}else if(value>=120 && value<150){ink=0xffee44;}else if(value>=150 && true){ink=0xff5566;}}textPaint(dc,ink,255);dc.drawText(px(343),px(350),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_34),metricText(value,"heartRate","","",0,"--",false),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}else if(cfg_vital_value_vital_br.equals("steps")){{var value=datasteps;textPaint(dc,cfg_vital_value_vital_br_color,255);dc.drawText(px(343),px(350),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_34),metricText(value,"steps","","",0,"--",true),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}else if(cfg_vital_value_vital_br.equals("calories")){{var value=datacalories;var ink=cfg_vital_value_vital_br_color;if(metricValid(value,"calories")){}textPaint(dc,ink,255);dc.drawText(px(343),px(350),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_34),metricText(value,"calories","","",0,"--",false),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}else if(cfg_vital_value_vital_br.equals("distance")){{var value=datadistance;textPaint(dc,cfg_vital_value_vital_br_color,255);dc.drawText(px(343),px(350),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_34),metricText(value,"distance","","",2,"--",false),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}else if(cfg_vital_value_vital_br.equals("battery")){{var value=databattery;var ink=cfg_vital_value_vital_br_color;if(metricValid(value,"battery")){if(value>=0 && value<10){ink=0xff5566;}else if(value>=10 && value<30){ink=0xffee44;}else if(value>=30 && true){ink=cfg_vital_value_vital_br_color;}}textPaint(dc,ink,255);dc.drawText(px(343),px(350),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_34),metricText(value,"battery","","",0,"--",false),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}else if(cfg_vital_value_vital_br.equals("temperature")){{var value=datatemperature;textPaint(dc,cfg_vital_value_vital_br_color,255);dc.drawText(px(343),px(350),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_34),metricText(value,"temperature","","°",1,"--",false),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22vital_battery_value%22%2C%22partId%22%3A%22vital_battery_value%22%2C%22capabilityId%22%3A%22core.metric%22%2C%22mode%22%3A%22active%22%7D
if(true){if(cfgTheme==2){{var value=databattery;var ink=0x54736F;if(metricValid(value,"battery")){if(true && value<10){ink=0xFF4D5E;}else if(value>=10 && value<30){ink=0xFFC04A;}else if(value>=30 && true){ink=cfg_vital_battery_color;}}textPaint(dc,ink,255);dc.drawText(px(227),px(414),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_34),metricText(value,"battery","","%",0,"--",false),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22vital_heart_big%22%2C%22partId%22%3A%22vital_heart_big%22%2C%22capabilityId%22%3A%22core.metric%22%2C%22mode%22%3A%22active%22%7D
if(true){if(cfgTheme==2){if(cfg_vital_heart_big.equals("heartRate")){{var value=dataheartRate;var ink=0x54736F;if(metricValid(value,"heartRate")){if(true && value<120){ink=cfg_vital_heart_big_color;}else if(value>=120 && value<150){ink=0xFFC04A;}else if(value>=150 && true){ink=0xFF4D5E;}}textPaint(dc,ink,255);dc.drawText(px(227),px(211),fontFor(Rez.Fonts.GfcCustom_local_ca177c514f264e623225342630000000_118),metricText(value,"heartRate","","",0,"--",false),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}else if(cfg_vital_heart_big.equals("steps")){{var value=datasteps;textPaint(dc,cfg_vital_heart_big_color,255);dc.drawText(px(227),px(211),fontFor(Rez.Fonts.GfcCustom_local_ca177c514f264e623225342630000000_118),metricText(value,"steps","","",0,"--",true),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}else if(cfg_vital_heart_big.equals("calories")){{var value=datacalories;textPaint(dc,cfg_vital_heart_big_color,255);dc.drawText(px(227),px(211),fontFor(Rez.Fonts.GfcCustom_local_ca177c514f264e623225342630000000_118),metricText(value,"calories","","",0,"--",false),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}else if(cfg_vital_heart_big.equals("distance")){{var value=datadistance;textPaint(dc,cfg_vital_heart_big_color,255);dc.drawText(px(227),px(211),fontFor(Rez.Fonts.GfcCustom_local_ca177c514f264e623225342630000000_118),metricText(value,"distance","","",2,"--",false),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}else if(cfg_vital_heart_big.equals("battery")){{var value=databattery;var ink=cfg_vital_heart_big_color;if(metricValid(value,"battery")){if(value>=0 && value<10){ink=0xff5566;}else if(value>=10 && value<30){ink=0xffee44;}else if(value>=30 && true){ink=cfg_vital_heart_big_color;}}textPaint(dc,ink,255);dc.drawText(px(227),px(211),fontFor(Rez.Fonts.GfcCustom_local_ca177c514f264e623225342630000000_118),metricText(value,"battery","","",0,"--",false),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}else if(cfg_vital_heart_big.equals("temperature")){{var value=datatemperature;textPaint(dc,cfg_vital_heart_big_color,255);dc.drawText(px(227),px(211),fontFor(Rez.Fonts.GfcCustom_local_ca177c514f264e623225342630000000_118),metricText(value,"temperature","","°",1,"--",false),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22vital_hr_unit%22%2C%22partId%22%3A%22vital_hr_unit%22%2C%22capabilityId%22%3A%22core.text%22%2C%22mode%22%3A%22active%22%7D
if(true){if(cfgTheme==2){if(cfg_vital_heart_big.equals("heartRate")){textPaint(dc,0x38E1D0,255);dc.drawText(px(227),px(283),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_20),"BPM · HEART RATE",Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}else if(cfg_vital_heart_big.equals("steps")){textPaint(dc,0x38E1D0,255);dc.drawText(px(227),px(283),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_20),"STEPS · DAILY STEPS",Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}else if(cfg_vital_heart_big.equals("calories")){textPaint(dc,0x38E1D0,255);dc.drawText(px(227),px(283),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_20),"KCAL · CALORIES",Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}else if(cfg_vital_heart_big.equals("distance")){textPaint(dc,0x38E1D0,255);dc.drawText(px(227),px(283),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_20),"KM · DISTANCE",Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}else if(cfg_vital_heart_big.equals("battery")){textPaint(dc,0x38E1D0,255);dc.drawText(px(227),px(283),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_20),"% · BATTERY",Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}else if(cfg_vital_heart_big.equals("temperature")){textPaint(dc,0x38E1D0,255);dc.drawText(px(227),px(283),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_20),"C · TEMPERATURE",Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}}
// GFC_LAYER_END

}
function render_active_29(dc as Graphics.Dc) as Void {var clock=frameContext[:clock];var cfgTheme=frameContext[:cfgTheme] as Toybox.Lang.Number;var cfg_vital_heart_big=frameContext[:cfg_vital_heart_big] as Toybox.Lang.String;var cfg_vital_time_color=frameContext[:cfg_vital_time_color] as Toybox.Lang.Number;

// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22vital_time_main%22%2C%22partId%22%3A%22vital_time_main%22%2C%22capabilityId%22%3A%22core.time%22%2C%22mode%22%3A%22active%22%7D
if(true){if(cfgTheme==2){textPaint(dc,cfg_vital_time_color,255);dc.drawText(px(227),px(99),fontFor(Rez.Fonts.GfcCustom_local_ca177c514f264e623225342630000000_40),clock.hour.format("%02d")+":"+clock.min.format("%02d"),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22vital_aod_time%22%2C%22partId%22%3A%22vital_aod_time%22%2C%22capabilityId%22%3A%22core.time%22%2C%22mode%22%3A%22active%22%7D
if(true){if(cfgTheme==2){}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22vital_aod_hr%22%2C%22partId%22%3A%22vital_aod_hr%22%2C%22capabilityId%22%3A%22core.metric%22%2C%22mode%22%3A%22active%22%7D
if(true){if(cfgTheme==2){if(cfg_vital_heart_big.equals("heartRate")){}else if(cfg_vital_heart_big.equals("steps")){}else if(cfg_vital_heart_big.equals("calories")){}else if(cfg_vital_heart_big.equals("distance")){}else if(cfg_vital_heart_big.equals("battery")){}else if(cfg_vital_heart_big.equals("temperature")){}}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22vital_aod_hr_cap%22%2C%22partId%22%3A%22vital_aod_hr_cap%22%2C%22capabilityId%22%3A%22core.text%22%2C%22mode%22%3A%22active%22%7D
if(true){if(cfgTheme==2){if(cfg_vital_heart_big.equals("heartRate")){}else if(cfg_vital_heart_big.equals("steps")){}else if(cfg_vital_heart_big.equals("calories")){}else if(cfg_vital_heart_big.equals("distance")){}else if(cfg_vital_heart_big.equals("battery")){}else if(cfg_vital_heart_big.equals("temperature")){}}}
// GFC_LAYER_END

}
function render_active_30(dc as Graphics.Dc) as Void {var cfgTheme=frameContext[:cfgTheme] as Toybox.Lang.Number;

// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22vital_aod_battery%22%2C%22partId%22%3A%22vital_aod_battery%22%2C%22capabilityId%22%3A%22core.metric%22%2C%22mode%22%3A%22active%22%7D
if(true){if(cfgTheme==2){}}
// GFC_LAYER_END

}
function render_aod_0(dc as Graphics.Dc) as Void {var cfgTheme=frameContext[:cfgTheme] as Toybox.Lang.Number;var cfg_apex_value_apex_tl=frameContext[:cfg_apex_value_apex_tl] as Toybox.Lang.String;

// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22apex_bg_art%22%2C%22partId%22%3A%22apex_bg_art%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22aod%22%7D
if(true){if(cfgTheme==0){}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22apex_ticks%22%2C%22partId%22%3A%22apex_ticks%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22aod%22%7D
if(true){if(cfgTheme==0){}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22apex_icon_apex_tl_temperature%22%2C%22partId%22%3A%22apex_icon_apex_tl_temperature%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22aod%22%7D
if(true){if((cfg_apex_value_apex_tl.equals("temperature")) && cfgTheme==0){}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22apex_icon_apex_tl_battery%22%2C%22partId%22%3A%22apex_icon_apex_tl_battery%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22aod%22%7D
if(true){if((cfg_apex_value_apex_tl.equals("battery")) && cfgTheme==0){}}
// GFC_LAYER_END

}
function render_aod_1(dc as Graphics.Dc) as Void {var cfgTheme=frameContext[:cfgTheme] as Toybox.Lang.Number;var cfg_apex_value_apex_tl=frameContext[:cfg_apex_value_apex_tl] as Toybox.Lang.String;

// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22apex_icon_apex_tl_distance%22%2C%22partId%22%3A%22apex_icon_apex_tl_distance%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22aod%22%7D
if(true){if((cfg_apex_value_apex_tl.equals("distance")) && cfgTheme==0){}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22apex_icon_apex_tl_calories%22%2C%22partId%22%3A%22apex_icon_apex_tl_calories%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22aod%22%7D
if(true){if((cfg_apex_value_apex_tl.equals("calories")) && cfgTheme==0){}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22apex_icon_apex_tl_steps%22%2C%22partId%22%3A%22apex_icon_apex_tl_steps%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22aod%22%7D
if(true){if((cfg_apex_value_apex_tl.equals("steps")) && cfgTheme==0){}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22apex_icon_apex_tl_heartRate%22%2C%22partId%22%3A%22apex_icon_apex_tl_heartRate%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22aod%22%7D
if(true){if((cfg_apex_value_apex_tl.equals("heartRate")) && cfgTheme==0){}}
// GFC_LAYER_END

}
function render_aod_2(dc as Graphics.Dc) as Void {var cfgTheme=frameContext[:cfgTheme] as Toybox.Lang.Number;var cfg_apex_value_apex_tr=frameContext[:cfg_apex_value_apex_tr] as Toybox.Lang.String;

// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22apex_icon_apex_tr_temperature%22%2C%22partId%22%3A%22apex_icon_apex_tr_temperature%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22aod%22%7D
if(true){if((cfg_apex_value_apex_tr.equals("temperature")) && cfgTheme==0){}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22apex_icon_apex_tr_battery%22%2C%22partId%22%3A%22apex_icon_apex_tr_battery%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22aod%22%7D
if(true){if((cfg_apex_value_apex_tr.equals("battery")) && cfgTheme==0){}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22apex_icon_apex_tr_distance%22%2C%22partId%22%3A%22apex_icon_apex_tr_distance%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22aod%22%7D
if(true){if((cfg_apex_value_apex_tr.equals("distance")) && cfgTheme==0){}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22apex_icon_apex_tr_calories%22%2C%22partId%22%3A%22apex_icon_apex_tr_calories%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22aod%22%7D
if(true){if((cfg_apex_value_apex_tr.equals("calories")) && cfgTheme==0){}}
// GFC_LAYER_END

}
function render_aod_3(dc as Graphics.Dc) as Void {var cfgTheme=frameContext[:cfgTheme] as Toybox.Lang.Number;var cfg_apex_value_apex_tr=frameContext[:cfg_apex_value_apex_tr] as Toybox.Lang.String;var cfg_apex_value_apex_bl=frameContext[:cfg_apex_value_apex_bl] as Toybox.Lang.String;

// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22apex_icon_apex_tr_steps%22%2C%22partId%22%3A%22apex_icon_apex_tr_steps%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22aod%22%7D
if(true){if((cfg_apex_value_apex_tr.equals("steps")) && cfgTheme==0){}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22apex_icon_apex_tr_heartRate%22%2C%22partId%22%3A%22apex_icon_apex_tr_heartRate%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22aod%22%7D
if(true){if((cfg_apex_value_apex_tr.equals("heartRate")) && cfgTheme==0){}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22apex_icon_apex_bl_temperature%22%2C%22partId%22%3A%22apex_icon_apex_bl_temperature%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22aod%22%7D
if(true){if((cfg_apex_value_apex_bl.equals("temperature")) && cfgTheme==0){}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22apex_icon_apex_bl_battery%22%2C%22partId%22%3A%22apex_icon_apex_bl_battery%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22aod%22%7D
if(true){if((cfg_apex_value_apex_bl.equals("battery")) && cfgTheme==0){}}
// GFC_LAYER_END

}
function render_aod_4(dc as Graphics.Dc) as Void {var cfgTheme=frameContext[:cfgTheme] as Toybox.Lang.Number;var cfg_apex_value_apex_bl=frameContext[:cfg_apex_value_apex_bl] as Toybox.Lang.String;

// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22apex_icon_apex_bl_distance%22%2C%22partId%22%3A%22apex_icon_apex_bl_distance%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22aod%22%7D
if(true){if((cfg_apex_value_apex_bl.equals("distance")) && cfgTheme==0){}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22apex_icon_apex_bl_calories%22%2C%22partId%22%3A%22apex_icon_apex_bl_calories%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22aod%22%7D
if(true){if((cfg_apex_value_apex_bl.equals("calories")) && cfgTheme==0){}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22apex_icon_apex_bl_steps%22%2C%22partId%22%3A%22apex_icon_apex_bl_steps%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22aod%22%7D
if(true){if((cfg_apex_value_apex_bl.equals("steps")) && cfgTheme==0){}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22apex_icon_apex_bl_heartRate%22%2C%22partId%22%3A%22apex_icon_apex_bl_heartRate%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22aod%22%7D
if(true){if((cfg_apex_value_apex_bl.equals("heartRate")) && cfgTheme==0){}}
// GFC_LAYER_END

}
function render_aod_5(dc as Graphics.Dc) as Void {var cfgTheme=frameContext[:cfgTheme] as Toybox.Lang.Number;var cfg_apex_value_apex_br=frameContext[:cfg_apex_value_apex_br] as Toybox.Lang.String;

// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22apex_icon_apex_br_temperature%22%2C%22partId%22%3A%22apex_icon_apex_br_temperature%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22aod%22%7D
if(true){if((cfg_apex_value_apex_br.equals("temperature")) && cfgTheme==0){}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22apex_icon_apex_br_battery%22%2C%22partId%22%3A%22apex_icon_apex_br_battery%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22aod%22%7D
if(true){if((cfg_apex_value_apex_br.equals("battery")) && cfgTheme==0){}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22apex_icon_apex_br_distance%22%2C%22partId%22%3A%22apex_icon_apex_br_distance%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22aod%22%7D
if(true){if((cfg_apex_value_apex_br.equals("distance")) && cfgTheme==0){}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22apex_icon_apex_br_calories%22%2C%22partId%22%3A%22apex_icon_apex_br_calories%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22aod%22%7D
if(true){if((cfg_apex_value_apex_br.equals("calories")) && cfgTheme==0){}}
// GFC_LAYER_END

}
function render_aod_6(dc as Graphics.Dc) as Void {var cfgTheme=frameContext[:cfgTheme] as Toybox.Lang.Number;var cfg_apex_value_apex_br=frameContext[:cfg_apex_value_apex_br] as Toybox.Lang.String;var calendar=frameContext[:calendar];var dateText=frameContext[:dateText];

// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22apex_icon_apex_br_steps%22%2C%22partId%22%3A%22apex_icon_apex_br_steps%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22aod%22%7D
if(true){if((cfg_apex_value_apex_br.equals("steps")) && cfgTheme==0){}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22apex_icon_apex_br_heartRate%22%2C%22partId%22%3A%22apex_icon_apex_br_heartRate%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22aod%22%7D
if(true){if((cfg_apex_value_apex_br.equals("heartRate")) && cfgTheme==0){}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22apex_battery_meter%22%2C%22partId%22%3A%22apex_battery_meter%22%2C%22capabilityId%22%3A%22core.meter%22%2C%22mode%22%3A%22aod%22%7D
if(true){if(cfgTheme==0){}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22apex_date_main%22%2C%22partId%22%3A%22apex_date_main%22%2C%22capabilityId%22%3A%22core.date%22%2C%22mode%22%3A%22aod%22%7D
if(true){if(cfgTheme==0){textPaint(dc,0x9A9A9A,255);dc.drawText(px(227),px(102),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_20),dateText.substring(0,4)+calendar.day.format("%02d"),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}
// GFC_LAYER_END

}
function render_aod_7(dc as Graphics.Dc) as Void {var cfgTheme=frameContext[:cfgTheme] as Toybox.Lang.Number;var cfg_apex_value_apex_tl=frameContext[:cfg_apex_value_apex_tl] as Toybox.Lang.String;var cfg_apex_value_apex_tr=frameContext[:cfg_apex_value_apex_tr] as Toybox.Lang.String;var cfg_apex_value_apex_bl=frameContext[:cfg_apex_value_apex_bl] as Toybox.Lang.String;var cfg_apex_value_apex_br=frameContext[:cfg_apex_value_apex_br] as Toybox.Lang.String;

// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22apex_label_apex_tl%22%2C%22partId%22%3A%22apex_label_apex_tl%22%2C%22capabilityId%22%3A%22core.text%22%2C%22mode%22%3A%22aod%22%7D
if(true){if(cfgTheme==0){if(cfg_apex_value_apex_tl.equals("heartRate")){}else if(cfg_apex_value_apex_tl.equals("steps")){}else if(cfg_apex_value_apex_tl.equals("calories")){}else if(cfg_apex_value_apex_tl.equals("distance")){}else if(cfg_apex_value_apex_tl.equals("battery")){}else if(cfg_apex_value_apex_tl.equals("temperature")){}}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22apex_label_apex_tr%22%2C%22partId%22%3A%22apex_label_apex_tr%22%2C%22capabilityId%22%3A%22core.text%22%2C%22mode%22%3A%22aod%22%7D
if(true){if(cfgTheme==0){if(cfg_apex_value_apex_tr.equals("heartRate")){}else if(cfg_apex_value_apex_tr.equals("steps")){}else if(cfg_apex_value_apex_tr.equals("calories")){}else if(cfg_apex_value_apex_tr.equals("distance")){}else if(cfg_apex_value_apex_tr.equals("battery")){}else if(cfg_apex_value_apex_tr.equals("temperature")){}}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22apex_label_apex_bl%22%2C%22partId%22%3A%22apex_label_apex_bl%22%2C%22capabilityId%22%3A%22core.text%22%2C%22mode%22%3A%22aod%22%7D
if(true){if(cfgTheme==0){if(cfg_apex_value_apex_bl.equals("heartRate")){}else if(cfg_apex_value_apex_bl.equals("steps")){}else if(cfg_apex_value_apex_bl.equals("calories")){}else if(cfg_apex_value_apex_bl.equals("distance")){}else if(cfg_apex_value_apex_bl.equals("battery")){}else if(cfg_apex_value_apex_bl.equals("temperature")){}}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22apex_label_apex_br%22%2C%22partId%22%3A%22apex_label_apex_br%22%2C%22capabilityId%22%3A%22core.text%22%2C%22mode%22%3A%22aod%22%7D
if(true){if(cfgTheme==0){if(cfg_apex_value_apex_br.equals("heartRate")){}else if(cfg_apex_value_apex_br.equals("steps")){}else if(cfg_apex_value_apex_br.equals("calories")){}else if(cfg_apex_value_apex_br.equals("distance")){}else if(cfg_apex_value_apex_br.equals("battery")){}else if(cfg_apex_value_apex_br.equals("temperature")){}}}
// GFC_LAYER_END

}
function render_aod_8(dc as Graphics.Dc) as Void {var cfgTheme=frameContext[:cfgTheme] as Toybox.Lang.Number;var cfg_apex_value_apex_tl=frameContext[:cfg_apex_value_apex_tl] as Toybox.Lang.String;var cfg_apex_value_apex_tr=frameContext[:cfg_apex_value_apex_tr] as Toybox.Lang.String;var cfg_apex_value_apex_bl=frameContext[:cfg_apex_value_apex_bl] as Toybox.Lang.String;var cfg_apex_value_apex_br=frameContext[:cfg_apex_value_apex_br] as Toybox.Lang.String;

// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22apex_value_apex_tl%22%2C%22partId%22%3A%22apex_value_apex_tl%22%2C%22capabilityId%22%3A%22core.metric%22%2C%22mode%22%3A%22aod%22%7D
if(true){if(cfgTheme==0){if(cfg_apex_value_apex_tl.equals("heartRate")){}else if(cfg_apex_value_apex_tl.equals("steps")){}else if(cfg_apex_value_apex_tl.equals("calories")){}else if(cfg_apex_value_apex_tl.equals("distance")){}else if(cfg_apex_value_apex_tl.equals("battery")){}else if(cfg_apex_value_apex_tl.equals("temperature")){}}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22apex_value_apex_tr%22%2C%22partId%22%3A%22apex_value_apex_tr%22%2C%22capabilityId%22%3A%22core.metric%22%2C%22mode%22%3A%22aod%22%7D
if(true){if(cfgTheme==0){if(cfg_apex_value_apex_tr.equals("heartRate")){}else if(cfg_apex_value_apex_tr.equals("steps")){}else if(cfg_apex_value_apex_tr.equals("calories")){}else if(cfg_apex_value_apex_tr.equals("distance")){}else if(cfg_apex_value_apex_tr.equals("battery")){}else if(cfg_apex_value_apex_tr.equals("temperature")){}}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22apex_value_apex_bl%22%2C%22partId%22%3A%22apex_value_apex_bl%22%2C%22capabilityId%22%3A%22core.metric%22%2C%22mode%22%3A%22aod%22%7D
if(true){if(cfgTheme==0){if(cfg_apex_value_apex_bl.equals("heartRate")){}else if(cfg_apex_value_apex_bl.equals("steps")){}else if(cfg_apex_value_apex_bl.equals("calories")){}else if(cfg_apex_value_apex_bl.equals("distance")){}else if(cfg_apex_value_apex_bl.equals("battery")){}else if(cfg_apex_value_apex_bl.equals("temperature")){}}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22apex_value_apex_br%22%2C%22partId%22%3A%22apex_value_apex_br%22%2C%22capabilityId%22%3A%22core.metric%22%2C%22mode%22%3A%22aod%22%7D
if(true){if(cfgTheme==0){if(cfg_apex_value_apex_br.equals("heartRate")){}else if(cfg_apex_value_apex_br.equals("steps")){}else if(cfg_apex_value_apex_br.equals("calories")){}else if(cfg_apex_value_apex_br.equals("distance")){}else if(cfg_apex_value_apex_br.equals("battery")){}else if(cfg_apex_value_apex_br.equals("temperature")){}}}
// GFC_LAYER_END

}
function render_aod_9(dc as Graphics.Dc) as Void {var clock=frameContext[:clock];var cfgTheme=frameContext[:cfgTheme] as Toybox.Lang.Number;

// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22apex_battery_value%22%2C%22partId%22%3A%22apex_battery_value%22%2C%22capabilityId%22%3A%22core.metric%22%2C%22mode%22%3A%22aod%22%7D
if(true){if(cfgTheme==0){}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22apex_time_main%22%2C%22partId%22%3A%22apex_time_main%22%2C%22capabilityId%22%3A%22core.time%22%2C%22mode%22%3A%22aod%22%7D
if(true){if(cfgTheme==0){}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22apex_seconds%22%2C%22partId%22%3A%22apex_seconds%22%2C%22capabilityId%22%3A%22core.time%22%2C%22mode%22%3A%22aod%22%7D
if(true){if(cfgTheme==0){}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22apex_aod_time%22%2C%22partId%22%3A%22apex_aod_time%22%2C%22capabilityId%22%3A%22core.time%22%2C%22mode%22%3A%22aod%22%7D
if(true){if(cfgTheme==0){textPaint(dc,0xFFFFFF,255);dc.drawText(px(227),px(220),fontFor(Rez.Fonts.GfcCustom_local_ca177c514f264e623225342630000000_104),clock.hour.format("%02d")+":"+clock.min.format("%02d"),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}
// GFC_LAYER_END

}
function render_aod_10(dc as Graphics.Dc) as Void {var dataheartRate=frameContext[:dataheartRate];var datasteps=frameContext[:datasteps];var datacalories=frameContext[:datacalories];var datadistance=frameContext[:datadistance];var databattery=frameContext[:databattery];var datatemperature=frameContext[:datatemperature];var cfgTheme=frameContext[:cfgTheme] as Toybox.Lang.Number;var cfg_apex_value_apex_tl=frameContext[:cfg_apex_value_apex_tl] as Toybox.Lang.String;

// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22apex_aod_hr%22%2C%22partId%22%3A%22apex_aod_hr%22%2C%22capabilityId%22%3A%22core.metric%22%2C%22mode%22%3A%22aod%22%7D
if(true){if(cfgTheme==0){if(cfg_apex_value_apex_tl.equals("heartRate")){{var value=dataheartRate;textPaint(dc,0xBDBDBD,255);dc.drawText(px(227),px(315),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_30),metricText(value,"heartRate","","",0,"--",false),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}else if(cfg_apex_value_apex_tl.equals("steps")){{var value=datasteps;textPaint(dc,0xBDBDBD,255);dc.drawText(px(227),px(315),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_30),metricText(value,"steps","","",0,"--",true),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}else if(cfg_apex_value_apex_tl.equals("calories")){{var value=datacalories;textPaint(dc,0xBDBDBD,255);dc.drawText(px(227),px(315),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_30),metricText(value,"calories","","",0,"--",false),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}else if(cfg_apex_value_apex_tl.equals("distance")){{var value=datadistance;textPaint(dc,0xBDBDBD,255);dc.drawText(px(227),px(315),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_30),metricText(value,"distance","","",2,"--",false),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}else if(cfg_apex_value_apex_tl.equals("battery")){{var value=databattery;textPaint(dc,0xBDBDBD,255);dc.drawText(px(227),px(315),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_30),metricText(value,"battery","","",0,"--",false),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}else if(cfg_apex_value_apex_tl.equals("temperature")){{var value=datatemperature;textPaint(dc,0xBDBDBD,255);dc.drawText(px(227),px(315),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_30),metricText(value,"temperature","","°",1,"--",false),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22apex_aod_hr_label%22%2C%22partId%22%3A%22apex_aod_hr_label%22%2C%22capabilityId%22%3A%22core.text%22%2C%22mode%22%3A%22aod%22%7D
if(true){if(cfgTheme==0){if(cfg_apex_value_apex_tl.equals("heartRate")){textPaint(dc,0xBDBDBD,255);dc.drawText(px(264),px(315),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_15),"BPM",Graphics.TEXT_JUSTIFY_LEFT|Graphics.TEXT_JUSTIFY_VCENTER);}else if(cfg_apex_value_apex_tl.equals("steps")){textPaint(dc,0xBDBDBD,255);dc.drawText(px(264),px(315),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_15),"STEPS",Graphics.TEXT_JUSTIFY_LEFT|Graphics.TEXT_JUSTIFY_VCENTER);}else if(cfg_apex_value_apex_tl.equals("calories")){textPaint(dc,0xBDBDBD,255);dc.drawText(px(264),px(315),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_15),"KCAL",Graphics.TEXT_JUSTIFY_LEFT|Graphics.TEXT_JUSTIFY_VCENTER);}else if(cfg_apex_value_apex_tl.equals("distance")){textPaint(dc,0xBDBDBD,255);dc.drawText(px(264),px(315),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_15),"KM",Graphics.TEXT_JUSTIFY_LEFT|Graphics.TEXT_JUSTIFY_VCENTER);}else if(cfg_apex_value_apex_tl.equals("battery")){textPaint(dc,0xBDBDBD,255);dc.drawText(px(264),px(315),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_15),"%",Graphics.TEXT_JUSTIFY_LEFT|Graphics.TEXT_JUSTIFY_VCENTER);}else if(cfg_apex_value_apex_tl.equals("temperature")){textPaint(dc,0xBDBDBD,255);dc.drawText(px(264),px(315),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_15),"C",Graphics.TEXT_JUSTIFY_LEFT|Graphics.TEXT_JUSTIFY_VCENTER);}}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22apex_aod_battery%22%2C%22partId%22%3A%22apex_aod_battery%22%2C%22capabilityId%22%3A%22core.metric%22%2C%22mode%22%3A%22aod%22%7D
if(true){if(cfgTheme==0){{var value=databattery;textPaint(dc,0x8F8F8F,255);dc.drawText(px(227),px(379),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_24),metricText(value,"battery","","%",0,"--",false),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22trail_bg_art%22%2C%22partId%22%3A%22trail_bg_art%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22aod%22%7D
if(true){if(cfgTheme==1){}}
// GFC_LAYER_END

}
function render_aod_11(dc as Graphics.Dc) as Void {var cfgTheme=frameContext[:cfgTheme] as Toybox.Lang.Number;var cfg_trail_value_trail_tl=frameContext[:cfg_trail_value_trail_tl] as Toybox.Lang.String;

// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22trail_ticks%22%2C%22partId%22%3A%22trail_ticks%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22aod%22%7D
if(true){if(cfgTheme==1){}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22trail_icon_trail_tl_temperature%22%2C%22partId%22%3A%22trail_icon_trail_tl_temperature%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22aod%22%7D
if(true){if((cfg_trail_value_trail_tl.equals("temperature")) && cfgTheme==1){}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22trail_icon_trail_tl_battery%22%2C%22partId%22%3A%22trail_icon_trail_tl_battery%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22aod%22%7D
if(true){if((cfg_trail_value_trail_tl.equals("battery")) && cfgTheme==1){}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22trail_icon_trail_tl_distance%22%2C%22partId%22%3A%22trail_icon_trail_tl_distance%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22aod%22%7D
if(true){if((cfg_trail_value_trail_tl.equals("distance")) && cfgTheme==1){}}
// GFC_LAYER_END

}
function render_aod_12(dc as Graphics.Dc) as Void {var cfgTheme=frameContext[:cfgTheme] as Toybox.Lang.Number;var cfg_trail_value_trail_tl=frameContext[:cfg_trail_value_trail_tl] as Toybox.Lang.String;var cfg_trail_value_trail_tr=frameContext[:cfg_trail_value_trail_tr] as Toybox.Lang.String;

// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22trail_icon_trail_tl_calories%22%2C%22partId%22%3A%22trail_icon_trail_tl_calories%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22aod%22%7D
if(true){if((cfg_trail_value_trail_tl.equals("calories")) && cfgTheme==1){}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22trail_icon_trail_tl_steps%22%2C%22partId%22%3A%22trail_icon_trail_tl_steps%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22aod%22%7D
if(true){if((cfg_trail_value_trail_tl.equals("steps")) && cfgTheme==1){}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22trail_icon_trail_tl_heartRate%22%2C%22partId%22%3A%22trail_icon_trail_tl_heartRate%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22aod%22%7D
if(true){if((cfg_trail_value_trail_tl.equals("heartRate")) && cfgTheme==1){}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22trail_icon_trail_tr_temperature%22%2C%22partId%22%3A%22trail_icon_trail_tr_temperature%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22aod%22%7D
if(true){if((cfg_trail_value_trail_tr.equals("temperature")) && cfgTheme==1){}}
// GFC_LAYER_END

}
function render_aod_13(dc as Graphics.Dc) as Void {var cfgTheme=frameContext[:cfgTheme] as Toybox.Lang.Number;var cfg_trail_value_trail_tr=frameContext[:cfg_trail_value_trail_tr] as Toybox.Lang.String;

// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22trail_icon_trail_tr_battery%22%2C%22partId%22%3A%22trail_icon_trail_tr_battery%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22aod%22%7D
if(true){if((cfg_trail_value_trail_tr.equals("battery")) && cfgTheme==1){}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22trail_icon_trail_tr_distance%22%2C%22partId%22%3A%22trail_icon_trail_tr_distance%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22aod%22%7D
if(true){if((cfg_trail_value_trail_tr.equals("distance")) && cfgTheme==1){}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22trail_icon_trail_tr_calories%22%2C%22partId%22%3A%22trail_icon_trail_tr_calories%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22aod%22%7D
if(true){if((cfg_trail_value_trail_tr.equals("calories")) && cfgTheme==1){}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22trail_icon_trail_tr_steps%22%2C%22partId%22%3A%22trail_icon_trail_tr_steps%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22aod%22%7D
if(true){if((cfg_trail_value_trail_tr.equals("steps")) && cfgTheme==1){}}
// GFC_LAYER_END

}
function render_aod_14(dc as Graphics.Dc) as Void {var cfgTheme=frameContext[:cfgTheme] as Toybox.Lang.Number;var cfg_trail_value_trail_tr=frameContext[:cfg_trail_value_trail_tr] as Toybox.Lang.String;var cfg_trail_value_trail_bl=frameContext[:cfg_trail_value_trail_bl] as Toybox.Lang.String;

// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22trail_icon_trail_tr_heartRate%22%2C%22partId%22%3A%22trail_icon_trail_tr_heartRate%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22aod%22%7D
if(true){if((cfg_trail_value_trail_tr.equals("heartRate")) && cfgTheme==1){}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22trail_icon_trail_bl_temperature%22%2C%22partId%22%3A%22trail_icon_trail_bl_temperature%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22aod%22%7D
if(true){if((cfg_trail_value_trail_bl.equals("temperature")) && cfgTheme==1){}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22trail_icon_trail_bl_battery%22%2C%22partId%22%3A%22trail_icon_trail_bl_battery%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22aod%22%7D
if(true){if((cfg_trail_value_trail_bl.equals("battery")) && cfgTheme==1){}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22trail_icon_trail_bl_distance%22%2C%22partId%22%3A%22trail_icon_trail_bl_distance%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22aod%22%7D
if(true){if((cfg_trail_value_trail_bl.equals("distance")) && cfgTheme==1){}}
// GFC_LAYER_END

}
function render_aod_15(dc as Graphics.Dc) as Void {var cfgTheme=frameContext[:cfgTheme] as Toybox.Lang.Number;var cfg_trail_value_trail_bl=frameContext[:cfg_trail_value_trail_bl] as Toybox.Lang.String;var cfg_trail_value_trail_br=frameContext[:cfg_trail_value_trail_br] as Toybox.Lang.String;

// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22trail_icon_trail_bl_calories%22%2C%22partId%22%3A%22trail_icon_trail_bl_calories%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22aod%22%7D
if(true){if((cfg_trail_value_trail_bl.equals("calories")) && cfgTheme==1){}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22trail_icon_trail_bl_steps%22%2C%22partId%22%3A%22trail_icon_trail_bl_steps%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22aod%22%7D
if(true){if((cfg_trail_value_trail_bl.equals("steps")) && cfgTheme==1){}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22trail_icon_trail_bl_heartRate%22%2C%22partId%22%3A%22trail_icon_trail_bl_heartRate%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22aod%22%7D
if(true){if((cfg_trail_value_trail_bl.equals("heartRate")) && cfgTheme==1){}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22trail_icon_trail_br_temperature%22%2C%22partId%22%3A%22trail_icon_trail_br_temperature%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22aod%22%7D
if(true){if((cfg_trail_value_trail_br.equals("temperature")) && cfgTheme==1){}}
// GFC_LAYER_END

}
function render_aod_16(dc as Graphics.Dc) as Void {var cfgTheme=frameContext[:cfgTheme] as Toybox.Lang.Number;var cfg_trail_value_trail_br=frameContext[:cfg_trail_value_trail_br] as Toybox.Lang.String;

// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22trail_icon_trail_br_battery%22%2C%22partId%22%3A%22trail_icon_trail_br_battery%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22aod%22%7D
if(true){if((cfg_trail_value_trail_br.equals("battery")) && cfgTheme==1){}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22trail_icon_trail_br_distance%22%2C%22partId%22%3A%22trail_icon_trail_br_distance%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22aod%22%7D
if(true){if((cfg_trail_value_trail_br.equals("distance")) && cfgTheme==1){}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22trail_icon_trail_br_calories%22%2C%22partId%22%3A%22trail_icon_trail_br_calories%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22aod%22%7D
if(true){if((cfg_trail_value_trail_br.equals("calories")) && cfgTheme==1){}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22trail_icon_trail_br_steps%22%2C%22partId%22%3A%22trail_icon_trail_br_steps%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22aod%22%7D
if(true){if((cfg_trail_value_trail_br.equals("steps")) && cfgTheme==1){}}
// GFC_LAYER_END

}
function render_aod_17(dc as Graphics.Dc) as Void {var cfgTheme=frameContext[:cfgTheme] as Toybox.Lang.Number;var cfg_trail_value_trail_tl=frameContext[:cfg_trail_value_trail_tl] as Toybox.Lang.String;var cfg_trail_value_trail_br=frameContext[:cfg_trail_value_trail_br] as Toybox.Lang.String;var calendar=frameContext[:calendar];var dateText=frameContext[:dateText];

// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22trail_icon_trail_br_heartRate%22%2C%22partId%22%3A%22trail_icon_trail_br_heartRate%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22aod%22%7D
if(true){if((cfg_trail_value_trail_br.equals("heartRate")) && cfgTheme==1){}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22trail_battery_meter%22%2C%22partId%22%3A%22trail_battery_meter%22%2C%22capabilityId%22%3A%22core.meter%22%2C%22mode%22%3A%22aod%22%7D
if(true){if(cfgTheme==1){}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22trail_date_main%22%2C%22partId%22%3A%22trail_date_main%22%2C%22capabilityId%22%3A%22core.date%22%2C%22mode%22%3A%22aod%22%7D
if(true){if(cfgTheme==1){textPaint(dc,0x9A9A9A,255);dc.drawText(px(227),px(102),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_20),dateText.substring(0,4)+calendar.day.format("%02d"),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22trail_label_trail_tl%22%2C%22partId%22%3A%22trail_label_trail_tl%22%2C%22capabilityId%22%3A%22core.text%22%2C%22mode%22%3A%22aod%22%7D
if(true){if(cfgTheme==1){if(cfg_trail_value_trail_tl.equals("heartRate")){}else if(cfg_trail_value_trail_tl.equals("steps")){}else if(cfg_trail_value_trail_tl.equals("calories")){}else if(cfg_trail_value_trail_tl.equals("distance")){}else if(cfg_trail_value_trail_tl.equals("battery")){}else if(cfg_trail_value_trail_tl.equals("temperature")){}}}
// GFC_LAYER_END

}
function render_aod_18(dc as Graphics.Dc) as Void {var cfgTheme=frameContext[:cfgTheme] as Toybox.Lang.Number;var cfg_trail_value_trail_tl=frameContext[:cfg_trail_value_trail_tl] as Toybox.Lang.String;var cfg_trail_value_trail_tr=frameContext[:cfg_trail_value_trail_tr] as Toybox.Lang.String;var cfg_trail_value_trail_bl=frameContext[:cfg_trail_value_trail_bl] as Toybox.Lang.String;var cfg_trail_value_trail_br=frameContext[:cfg_trail_value_trail_br] as Toybox.Lang.String;

// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22trail_label_trail_tr%22%2C%22partId%22%3A%22trail_label_trail_tr%22%2C%22capabilityId%22%3A%22core.text%22%2C%22mode%22%3A%22aod%22%7D
if(true){if(cfgTheme==1){if(cfg_trail_value_trail_tr.equals("heartRate")){}else if(cfg_trail_value_trail_tr.equals("steps")){}else if(cfg_trail_value_trail_tr.equals("calories")){}else if(cfg_trail_value_trail_tr.equals("distance")){}else if(cfg_trail_value_trail_tr.equals("battery")){}else if(cfg_trail_value_trail_tr.equals("temperature")){}}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22trail_label_trail_bl%22%2C%22partId%22%3A%22trail_label_trail_bl%22%2C%22capabilityId%22%3A%22core.text%22%2C%22mode%22%3A%22aod%22%7D
if(true){if(cfgTheme==1){if(cfg_trail_value_trail_bl.equals("heartRate")){}else if(cfg_trail_value_trail_bl.equals("steps")){}else if(cfg_trail_value_trail_bl.equals("calories")){}else if(cfg_trail_value_trail_bl.equals("distance")){}else if(cfg_trail_value_trail_bl.equals("battery")){}else if(cfg_trail_value_trail_bl.equals("temperature")){}}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22trail_label_trail_br%22%2C%22partId%22%3A%22trail_label_trail_br%22%2C%22capabilityId%22%3A%22core.text%22%2C%22mode%22%3A%22aod%22%7D
if(true){if(cfgTheme==1){if(cfg_trail_value_trail_br.equals("heartRate")){}else if(cfg_trail_value_trail_br.equals("steps")){}else if(cfg_trail_value_trail_br.equals("calories")){}else if(cfg_trail_value_trail_br.equals("distance")){}else if(cfg_trail_value_trail_br.equals("battery")){}else if(cfg_trail_value_trail_br.equals("temperature")){}}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22trail_value_trail_tl%22%2C%22partId%22%3A%22trail_value_trail_tl%22%2C%22capabilityId%22%3A%22core.metric%22%2C%22mode%22%3A%22aod%22%7D
if(true){if(cfgTheme==1){if(cfg_trail_value_trail_tl.equals("heartRate")){}else if(cfg_trail_value_trail_tl.equals("steps")){}else if(cfg_trail_value_trail_tl.equals("calories")){}else if(cfg_trail_value_trail_tl.equals("distance")){}else if(cfg_trail_value_trail_tl.equals("battery")){}else if(cfg_trail_value_trail_tl.equals("temperature")){}}}
// GFC_LAYER_END

}
function render_aod_19(dc as Graphics.Dc) as Void {var cfgTheme=frameContext[:cfgTheme] as Toybox.Lang.Number;var cfg_trail_value_trail_tr=frameContext[:cfg_trail_value_trail_tr] as Toybox.Lang.String;var cfg_trail_value_trail_bl=frameContext[:cfg_trail_value_trail_bl] as Toybox.Lang.String;var cfg_trail_value_trail_br=frameContext[:cfg_trail_value_trail_br] as Toybox.Lang.String;

// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22trail_value_trail_tr%22%2C%22partId%22%3A%22trail_value_trail_tr%22%2C%22capabilityId%22%3A%22core.metric%22%2C%22mode%22%3A%22aod%22%7D
if(true){if(cfgTheme==1){if(cfg_trail_value_trail_tr.equals("heartRate")){}else if(cfg_trail_value_trail_tr.equals("steps")){}else if(cfg_trail_value_trail_tr.equals("calories")){}else if(cfg_trail_value_trail_tr.equals("distance")){}else if(cfg_trail_value_trail_tr.equals("battery")){}else if(cfg_trail_value_trail_tr.equals("temperature")){}}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22trail_value_trail_bl%22%2C%22partId%22%3A%22trail_value_trail_bl%22%2C%22capabilityId%22%3A%22core.metric%22%2C%22mode%22%3A%22aod%22%7D
if(true){if(cfgTheme==1){if(cfg_trail_value_trail_bl.equals("heartRate")){}else if(cfg_trail_value_trail_bl.equals("steps")){}else if(cfg_trail_value_trail_bl.equals("calories")){}else if(cfg_trail_value_trail_bl.equals("distance")){}else if(cfg_trail_value_trail_bl.equals("battery")){}else if(cfg_trail_value_trail_bl.equals("temperature")){}}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22trail_value_trail_br%22%2C%22partId%22%3A%22trail_value_trail_br%22%2C%22capabilityId%22%3A%22core.metric%22%2C%22mode%22%3A%22aod%22%7D
if(true){if(cfgTheme==1){if(cfg_trail_value_trail_br.equals("heartRate")){}else if(cfg_trail_value_trail_br.equals("steps")){}else if(cfg_trail_value_trail_br.equals("calories")){}else if(cfg_trail_value_trail_br.equals("distance")){}else if(cfg_trail_value_trail_br.equals("battery")){}else if(cfg_trail_value_trail_br.equals("temperature")){}}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22trail_battery_value%22%2C%22partId%22%3A%22trail_battery_value%22%2C%22capabilityId%22%3A%22core.metric%22%2C%22mode%22%3A%22aod%22%7D
if(true){if(cfgTheme==1){}}
// GFC_LAYER_END

}
function render_aod_20(dc as Graphics.Dc) as Void {var clock=frameContext[:clock];var dataheartRate=frameContext[:dataheartRate];var datasteps=frameContext[:datasteps];var datacalories=frameContext[:datacalories];var datadistance=frameContext[:datadistance];var databattery=frameContext[:databattery];var datatemperature=frameContext[:datatemperature];var cfgTheme=frameContext[:cfgTheme] as Toybox.Lang.Number;var cfg_trail_value_trail_tl=frameContext[:cfg_trail_value_trail_tl] as Toybox.Lang.String;

// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22trail_time_main%22%2C%22partId%22%3A%22trail_time_main%22%2C%22capabilityId%22%3A%22core.time%22%2C%22mode%22%3A%22aod%22%7D
if(true){if(cfgTheme==1){}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22trail_seconds%22%2C%22partId%22%3A%22trail_seconds%22%2C%22capabilityId%22%3A%22core.time%22%2C%22mode%22%3A%22aod%22%7D
if(true){if(cfgTheme==1){}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22trail_aod_time%22%2C%22partId%22%3A%22trail_aod_time%22%2C%22capabilityId%22%3A%22core.time%22%2C%22mode%22%3A%22aod%22%7D
if(true){if(cfgTheme==1){textPaint(dc,0xFFFFFF,255);dc.drawText(px(227),px(220),fontFor(Rez.Fonts.GfcCustom_local_ca177c514f264e623225342630000000_104),clock.hour.format("%02d")+":"+clock.min.format("%02d"),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22trail_aod_temp%22%2C%22partId%22%3A%22trail_aod_temp%22%2C%22capabilityId%22%3A%22core.metric%22%2C%22mode%22%3A%22aod%22%7D
if(true){if(cfgTheme==1){if(cfg_trail_value_trail_tl.equals("heartRate")){{var value=dataheartRate;textPaint(dc,0xBDBDBD,255);dc.drawText(px(148.5),px(315),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_30),metricText(value,"heartRate","","",0,"--",false),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}else if(cfg_trail_value_trail_tl.equals("steps")){{var value=datasteps;textPaint(dc,0xBDBDBD,255);dc.drawText(px(148.5),px(315),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_30),metricText(value,"steps","","",0,"--",true),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}else if(cfg_trail_value_trail_tl.equals("calories")){{var value=datacalories;textPaint(dc,0xBDBDBD,255);dc.drawText(px(148.5),px(315),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_30),metricText(value,"calories","","",0,"--",false),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}else if(cfg_trail_value_trail_tl.equals("distance")){{var value=datadistance;textPaint(dc,0xBDBDBD,255);dc.drawText(px(148.5),px(315),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_30),metricText(value,"distance","","",2,"--",false),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}else if(cfg_trail_value_trail_tl.equals("battery")){{var value=databattery;textPaint(dc,0xBDBDBD,255);dc.drawText(px(148.5),px(315),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_30),metricText(value,"battery","","",0,"--",false),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}else if(cfg_trail_value_trail_tl.equals("temperature")){{var value=datatemperature;textPaint(dc,0xBDBDBD,255);dc.drawText(px(148.5),px(315),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_30),metricText(value,"temperature","","°",0,"--",false),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}}}
// GFC_LAYER_END

}
function render_aod_21(dc as Graphics.Dc) as Void {var dataheartRate=frameContext[:dataheartRate];var datasteps=frameContext[:datasteps];var datacalories=frameContext[:datacalories];var datadistance=frameContext[:datadistance];var databattery=frameContext[:databattery];var datatemperature=frameContext[:datatemperature];var cfgTheme=frameContext[:cfgTheme] as Toybox.Lang.Number;var cfg_trail_value_trail_tr=frameContext[:cfg_trail_value_trail_tr] as Toybox.Lang.String;

// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22trail_aod_dot%22%2C%22partId%22%3A%22trail_aod_dot%22%2C%22capabilityId%22%3A%22core.text%22%2C%22mode%22%3A%22aod%22%7D
if(true){if(cfgTheme==1){textPaint(dc,0x8F8F8F,255);dc.drawText(px(227),px(315),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_30),"·",Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22trail_aod_distance%22%2C%22partId%22%3A%22trail_aod_distance%22%2C%22capabilityId%22%3A%22core.metric%22%2C%22mode%22%3A%22aod%22%7D
if(true){if(cfgTheme==1){if(cfg_trail_value_trail_tr.equals("heartRate")){{var value=dataheartRate;textPaint(dc,0xBDBDBD,255);dc.drawText(px(305.5),px(315),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_30),metricText(value,"heartRate","","",0,"--",false),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}else if(cfg_trail_value_trail_tr.equals("steps")){{var value=datasteps;textPaint(dc,0xBDBDBD,255);dc.drawText(px(305.5),px(315),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_30),metricText(value,"steps","","",0,"--",true),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}else if(cfg_trail_value_trail_tr.equals("calories")){{var value=datacalories;textPaint(dc,0xBDBDBD,255);dc.drawText(px(305.5),px(315),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_30),metricText(value,"calories","","",0,"--",false),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}else if(cfg_trail_value_trail_tr.equals("distance")){{var value=datadistance;textPaint(dc,0xBDBDBD,255);dc.drawText(px(305.5),px(315),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_30),metricText(value,"distance","","",1,"--",false),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}else if(cfg_trail_value_trail_tr.equals("battery")){{var value=databattery;textPaint(dc,0xBDBDBD,255);dc.drawText(px(305.5),px(315),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_30),metricText(value,"battery","","",0,"--",false),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}else if(cfg_trail_value_trail_tr.equals("temperature")){{var value=datatemperature;textPaint(dc,0xBDBDBD,255);dc.drawText(px(305.5),px(315),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_30),metricText(value,"temperature","","°",1,"--",false),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22trail_aod_km%22%2C%22partId%22%3A%22trail_aod_km%22%2C%22capabilityId%22%3A%22core.text%22%2C%22mode%22%3A%22aod%22%7D
if(true){if(cfgTheme==1){if(cfg_trail_value_trail_tr.equals("heartRate")){textPaint(dc,0x8F8F8F,255);dc.drawText(px(365),px(315),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_18),"BPM",Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}else if(cfg_trail_value_trail_tr.equals("steps")){textPaint(dc,0x8F8F8F,255);dc.drawText(px(365),px(315),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_18),"STEPS",Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}else if(cfg_trail_value_trail_tr.equals("calories")){textPaint(dc,0x8F8F8F,255);dc.drawText(px(365),px(315),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_18),"KCAL",Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}else if(cfg_trail_value_trail_tr.equals("distance")){textPaint(dc,0x8F8F8F,255);dc.drawText(px(365),px(315),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_18),"KM",Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}else if(cfg_trail_value_trail_tr.equals("battery")){textPaint(dc,0x8F8F8F,255);dc.drawText(px(365),px(315),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_18),"%",Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}else if(cfg_trail_value_trail_tr.equals("temperature")){textPaint(dc,0x8F8F8F,255);dc.drawText(px(365),px(315),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_18),"C",Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22trail_aod_battery%22%2C%22partId%22%3A%22trail_aod_battery%22%2C%22capabilityId%22%3A%22core.metric%22%2C%22mode%22%3A%22aod%22%7D
if(true){if(cfgTheme==1){{var value=databattery;textPaint(dc,0x8F8F8F,255);dc.drawText(px(227),px(379),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_24),metricText(value,"battery","","%",0,"--",false),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}}
// GFC_LAYER_END

}
function render_aod_22(dc as Graphics.Dc) as Void {var cfgTheme=frameContext[:cfgTheme] as Toybox.Lang.Number;var cfg_vital_value_vital_bl=frameContext[:cfg_vital_value_vital_bl] as Toybox.Lang.String;

// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22vital_bg_art%22%2C%22partId%22%3A%22vital_bg_art%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22aod%22%7D
if(true){if(cfgTheme==2){}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22vital_ticks%22%2C%22partId%22%3A%22vital_ticks%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22aod%22%7D
if(true){if(cfgTheme==2){}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22vital_icon_vital_bl_temperature%22%2C%22partId%22%3A%22vital_icon_vital_bl_temperature%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22aod%22%7D
if(true){if((cfg_vital_value_vital_bl.equals("temperature")) && cfgTheme==2){}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22vital_icon_vital_bl_battery%22%2C%22partId%22%3A%22vital_icon_vital_bl_battery%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22aod%22%7D
if(true){if((cfg_vital_value_vital_bl.equals("battery")) && cfgTheme==2){}}
// GFC_LAYER_END

}
function render_aod_23(dc as Graphics.Dc) as Void {var cfgTheme=frameContext[:cfgTheme] as Toybox.Lang.Number;var cfg_vital_value_vital_bl=frameContext[:cfg_vital_value_vital_bl] as Toybox.Lang.String;

// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22vital_icon_vital_bl_distance%22%2C%22partId%22%3A%22vital_icon_vital_bl_distance%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22aod%22%7D
if(true){if((cfg_vital_value_vital_bl.equals("distance")) && cfgTheme==2){}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22vital_icon_vital_bl_calories%22%2C%22partId%22%3A%22vital_icon_vital_bl_calories%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22aod%22%7D
if(true){if((cfg_vital_value_vital_bl.equals("calories")) && cfgTheme==2){}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22vital_icon_vital_bl_steps%22%2C%22partId%22%3A%22vital_icon_vital_bl_steps%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22aod%22%7D
if(true){if((cfg_vital_value_vital_bl.equals("steps")) && cfgTheme==2){}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22vital_icon_vital_bl_heartRate%22%2C%22partId%22%3A%22vital_icon_vital_bl_heartRate%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22aod%22%7D
if(true){if((cfg_vital_value_vital_bl.equals("heartRate")) && cfgTheme==2){}}
// GFC_LAYER_END

}
function render_aod_24(dc as Graphics.Dc) as Void {var cfgTheme=frameContext[:cfgTheme] as Toybox.Lang.Number;var cfg_vital_value_vital_br=frameContext[:cfg_vital_value_vital_br] as Toybox.Lang.String;

// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22vital_icon_vital_br_temperature%22%2C%22partId%22%3A%22vital_icon_vital_br_temperature%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22aod%22%7D
if(true){if((cfg_vital_value_vital_br.equals("temperature")) && cfgTheme==2){}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22vital_icon_vital_br_battery%22%2C%22partId%22%3A%22vital_icon_vital_br_battery%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22aod%22%7D
if(true){if((cfg_vital_value_vital_br.equals("battery")) && cfgTheme==2){}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22vital_icon_vital_br_distance%22%2C%22partId%22%3A%22vital_icon_vital_br_distance%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22aod%22%7D
if(true){if((cfg_vital_value_vital_br.equals("distance")) && cfgTheme==2){}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22vital_icon_vital_br_calories%22%2C%22partId%22%3A%22vital_icon_vital_br_calories%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22aod%22%7D
if(true){if((cfg_vital_value_vital_br.equals("calories")) && cfgTheme==2){}}
// GFC_LAYER_END

}
function render_aod_25(dc as Graphics.Dc) as Void {var cfgTheme=frameContext[:cfgTheme] as Toybox.Lang.Number;var cfg_vital_value_vital_br=frameContext[:cfg_vital_value_vital_br] as Toybox.Lang.String;

// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22vital_icon_vital_br_steps%22%2C%22partId%22%3A%22vital_icon_vital_br_steps%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22aod%22%7D
if(true){if((cfg_vital_value_vital_br.equals("steps")) && cfgTheme==2){}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22vital_icon_vital_br_heartRate%22%2C%22partId%22%3A%22vital_icon_vital_br_heartRate%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22aod%22%7D
if(true){if((cfg_vital_value_vital_br.equals("heartRate")) && cfgTheme==2){}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22vital_battery_meter%22%2C%22partId%22%3A%22vital_battery_meter%22%2C%22capabilityId%22%3A%22core.meter%22%2C%22mode%22%3A%22aod%22%7D
if(true){if(cfgTheme==2){}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22vital_hr_zone_1%22%2C%22partId%22%3A%22vital_hr_zone_1%22%2C%22capabilityId%22%3A%22core.rect%22%2C%22mode%22%3A%22aod%22%7D
if(false){if(cfgTheme==2){}}
// GFC_LAYER_END

}
function render_aod_26(dc as Graphics.Dc) as Void {var cfgTheme=frameContext[:cfgTheme] as Toybox.Lang.Number;

// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22vital_hr_zone_2%22%2C%22partId%22%3A%22vital_hr_zone_2%22%2C%22capabilityId%22%3A%22core.rect%22%2C%22mode%22%3A%22aod%22%7D
if(false){if(cfgTheme==2){}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22vital_hr_zone_3%22%2C%22partId%22%3A%22vital_hr_zone_3%22%2C%22capabilityId%22%3A%22core.rect%22%2C%22mode%22%3A%22aod%22%7D
if(false){if(cfgTheme==2){}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22vital_hr_zone_4%22%2C%22partId%22%3A%22vital_hr_zone_4%22%2C%22capabilityId%22%3A%22core.rect%22%2C%22mode%22%3A%22aod%22%7D
if(false){if(cfgTheme==2){}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22vital_hr_zone_5%22%2C%22partId%22%3A%22vital_hr_zone_5%22%2C%22capabilityId%22%3A%22core.rect%22%2C%22mode%22%3A%22aod%22%7D
if(false){if(cfgTheme==2){}}
// GFC_LAYER_END

}
function render_aod_27(dc as Graphics.Dc) as Void {var cfgTheme=frameContext[:cfgTheme] as Toybox.Lang.Number;var cfg_vital_value_vital_bl=frameContext[:cfg_vital_value_vital_bl] as Toybox.Lang.String;var cfg_vital_value_vital_br=frameContext[:cfg_vital_value_vital_br] as Toybox.Lang.String;

// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22vital_date_main%22%2C%22partId%22%3A%22vital_date_main%22%2C%22capabilityId%22%3A%22core.date%22%2C%22mode%22%3A%22aod%22%7D
if(true){if(cfgTheme==2){}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22vital_label_vital_bl%22%2C%22partId%22%3A%22vital_label_vital_bl%22%2C%22capabilityId%22%3A%22core.text%22%2C%22mode%22%3A%22aod%22%7D
if(true){if(cfgTheme==2){if(cfg_vital_value_vital_bl.equals("heartRate")){}else if(cfg_vital_value_vital_bl.equals("steps")){}else if(cfg_vital_value_vital_bl.equals("calories")){}else if(cfg_vital_value_vital_bl.equals("distance")){}else if(cfg_vital_value_vital_bl.equals("battery")){}else if(cfg_vital_value_vital_bl.equals("temperature")){}}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22vital_label_vital_br%22%2C%22partId%22%3A%22vital_label_vital_br%22%2C%22capabilityId%22%3A%22core.text%22%2C%22mode%22%3A%22aod%22%7D
if(true){if(cfgTheme==2){if(cfg_vital_value_vital_br.equals("heartRate")){}else if(cfg_vital_value_vital_br.equals("steps")){}else if(cfg_vital_value_vital_br.equals("calories")){}else if(cfg_vital_value_vital_br.equals("distance")){}else if(cfg_vital_value_vital_br.equals("battery")){}else if(cfg_vital_value_vital_br.equals("temperature")){}}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22vital_value_vital_bl%22%2C%22partId%22%3A%22vital_value_vital_bl%22%2C%22capabilityId%22%3A%22core.metric%22%2C%22mode%22%3A%22aod%22%7D
if(true){if(cfgTheme==2){if(cfg_vital_value_vital_bl.equals("heartRate")){}else if(cfg_vital_value_vital_bl.equals("steps")){}else if(cfg_vital_value_vital_bl.equals("calories")){}else if(cfg_vital_value_vital_bl.equals("distance")){}else if(cfg_vital_value_vital_bl.equals("battery")){}else if(cfg_vital_value_vital_bl.equals("temperature")){}}}
// GFC_LAYER_END

}
function render_aod_28(dc as Graphics.Dc) as Void {var cfgTheme=frameContext[:cfgTheme] as Toybox.Lang.Number;var cfg_vital_heart_big=frameContext[:cfg_vital_heart_big] as Toybox.Lang.String;var cfg_vital_value_vital_br=frameContext[:cfg_vital_value_vital_br] as Toybox.Lang.String;

// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22vital_value_vital_br%22%2C%22partId%22%3A%22vital_value_vital_br%22%2C%22capabilityId%22%3A%22core.metric%22%2C%22mode%22%3A%22aod%22%7D
if(true){if(cfgTheme==2){if(cfg_vital_value_vital_br.equals("heartRate")){}else if(cfg_vital_value_vital_br.equals("steps")){}else if(cfg_vital_value_vital_br.equals("calories")){}else if(cfg_vital_value_vital_br.equals("distance")){}else if(cfg_vital_value_vital_br.equals("battery")){}else if(cfg_vital_value_vital_br.equals("temperature")){}}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22vital_battery_value%22%2C%22partId%22%3A%22vital_battery_value%22%2C%22capabilityId%22%3A%22core.metric%22%2C%22mode%22%3A%22aod%22%7D
if(true){if(cfgTheme==2){}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22vital_heart_big%22%2C%22partId%22%3A%22vital_heart_big%22%2C%22capabilityId%22%3A%22core.metric%22%2C%22mode%22%3A%22aod%22%7D
if(true){if(cfgTheme==2){if(cfg_vital_heart_big.equals("heartRate")){}else if(cfg_vital_heart_big.equals("steps")){}else if(cfg_vital_heart_big.equals("calories")){}else if(cfg_vital_heart_big.equals("distance")){}else if(cfg_vital_heart_big.equals("battery")){}else if(cfg_vital_heart_big.equals("temperature")){}}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22vital_hr_unit%22%2C%22partId%22%3A%22vital_hr_unit%22%2C%22capabilityId%22%3A%22core.text%22%2C%22mode%22%3A%22aod%22%7D
if(true){if(cfgTheme==2){if(cfg_vital_heart_big.equals("heartRate")){}else if(cfg_vital_heart_big.equals("steps")){}else if(cfg_vital_heart_big.equals("calories")){}else if(cfg_vital_heart_big.equals("distance")){}else if(cfg_vital_heart_big.equals("battery")){}else if(cfg_vital_heart_big.equals("temperature")){}}}
// GFC_LAYER_END

}
function render_aod_29(dc as Graphics.Dc) as Void {var clock=frameContext[:clock];var dataheartRate=frameContext[:dataheartRate];var datasteps=frameContext[:datasteps];var datacalories=frameContext[:datacalories];var datadistance=frameContext[:datadistance];var databattery=frameContext[:databattery];var datatemperature=frameContext[:datatemperature];var cfgTheme=frameContext[:cfgTheme] as Toybox.Lang.Number;var cfg_vital_heart_big=frameContext[:cfg_vital_heart_big] as Toybox.Lang.String;

// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22vital_time_main%22%2C%22partId%22%3A%22vital_time_main%22%2C%22capabilityId%22%3A%22core.time%22%2C%22mode%22%3A%22aod%22%7D
if(true){if(cfgTheme==2){}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22vital_aod_time%22%2C%22partId%22%3A%22vital_aod_time%22%2C%22capabilityId%22%3A%22core.time%22%2C%22mode%22%3A%22aod%22%7D
if(true){if(cfgTheme==2){textPaint(dc,0xC4C4C4,255);dc.drawText(px(227),px(124),fontFor(Rez.Fonts.GfcCustom_local_ca177c514f264e623225342630000000_44),clock.hour.format("%02d")+":"+clock.min.format("%02d"),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22vital_aod_hr%22%2C%22partId%22%3A%22vital_aod_hr%22%2C%22capabilityId%22%3A%22core.metric%22%2C%22mode%22%3A%22aod%22%7D
if(true){if(cfgTheme==2){if(cfg_vital_heart_big.equals("heartRate")){{var value=dataheartRate;textPaint(dc,0xFFFFFF,255);dc.drawText(px(227),px(235),fontFor(Rez.Fonts.GfcCustom_local_ca177c514f264e623225342630000000_130),metricText(value,"heartRate","","",0,"--",false),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}else if(cfg_vital_heart_big.equals("steps")){{var value=datasteps;textPaint(dc,0xFFFFFF,255);dc.drawText(px(227),px(235),fontFor(Rez.Fonts.GfcCustom_local_ca177c514f264e623225342630000000_130),metricText(value,"steps","","",0,"--",true),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}else if(cfg_vital_heart_big.equals("calories")){{var value=datacalories;textPaint(dc,0xFFFFFF,255);dc.drawText(px(227),px(235),fontFor(Rez.Fonts.GfcCustom_local_ca177c514f264e623225342630000000_130),metricText(value,"calories","","",0,"--",false),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}else if(cfg_vital_heart_big.equals("distance")){{var value=datadistance;textPaint(dc,0xFFFFFF,255);dc.drawText(px(227),px(235),fontFor(Rez.Fonts.GfcCustom_local_ca177c514f264e623225342630000000_130),metricText(value,"distance","","",2,"--",false),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}else if(cfg_vital_heart_big.equals("battery")){{var value=databattery;textPaint(dc,0xFFFFFF,255);dc.drawText(px(227),px(235),fontFor(Rez.Fonts.GfcCustom_local_ca177c514f264e623225342630000000_130),metricText(value,"battery","","",0,"--",false),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}else if(cfg_vital_heart_big.equals("temperature")){{var value=datatemperature;textPaint(dc,0xFFFFFF,255);dc.drawText(px(227),px(235),fontFor(Rez.Fonts.GfcCustom_local_ca177c514f264e623225342630000000_130),metricText(value,"temperature","","°",1,"--",false),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22vital_aod_hr_cap%22%2C%22partId%22%3A%22vital_aod_hr_cap%22%2C%22capabilityId%22%3A%22core.text%22%2C%22mode%22%3A%22aod%22%7D
if(true){if(cfgTheme==2){if(cfg_vital_heart_big.equals("heartRate")){textPaint(dc,0x9A9A9A,255);dc.drawText(px(227),px(313),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_18),"BPM",Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}else if(cfg_vital_heart_big.equals("steps")){textPaint(dc,0x9A9A9A,255);dc.drawText(px(227),px(313),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_18),"DAILY STEPS",Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}else if(cfg_vital_heart_big.equals("calories")){textPaint(dc,0x9A9A9A,255);dc.drawText(px(227),px(313),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_18),"CALORIES",Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}else if(cfg_vital_heart_big.equals("distance")){textPaint(dc,0x9A9A9A,255);dc.drawText(px(227),px(313),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_18),"DISTANCE",Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}else if(cfg_vital_heart_big.equals("battery")){textPaint(dc,0x9A9A9A,255);dc.drawText(px(227),px(313),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_18),"BATTERY",Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}else if(cfg_vital_heart_big.equals("temperature")){textPaint(dc,0x9A9A9A,255);dc.drawText(px(227),px(313),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_18),"TEMPERATURE",Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}}
// GFC_LAYER_END

}
function render_aod_30(dc as Graphics.Dc) as Void {var databattery=frameContext[:databattery];var cfgTheme=frameContext[:cfgTheme] as Toybox.Lang.Number;

// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22vital_aod_battery%22%2C%22partId%22%3A%22vital_aod_battery%22%2C%22capabilityId%22%3A%22core.metric%22%2C%22mode%22%3A%22aod%22%7D
if(true){if(cfgTheme==2){{var value=databattery;textPaint(dc,0x8F8F8F,255);dc.drawText(px(227),px(379),fontFor(Rez.Fonts.GfcCustom_local_ca1eb715b1edcd220e65771900000000_24),metricText(value,"battery","","%",0,"--",false),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}}
// GFC_LAYER_END

}
 function onUpdate(dc as Graphics.Dc) as Void {
  frameContext=null;
  bitmapUsed={};prepareSettings();var cfgTheme=settingsCache["Gfc_Theme"] as Toybox.Lang.Number;var cfgThemeBackground=settingsCache[["Gfc_Background_2009808953","Gfc_Background_2078923795","Gfc_Background_1156566441"][cfgTheme]] as Toybox.Lang.Number;var cfg_apex_value_apex_tl=settingsCache["Gfc_Source_apex_value_apex_tl"] as Toybox.Lang.String;var cfg_apex_value_apex_tl_color=settingsCache["Gfc_apex_value_apex_tl_color"] as Toybox.Lang.Number;var cfg_apex_value_apex_tr=settingsCache["Gfc_Source_apex_value_apex_tr"] as Toybox.Lang.String;var cfg_apex_value_apex_tr_color=settingsCache["Gfc_apex_value_apex_tr_color"] as Toybox.Lang.Number;var cfg_apex_value_apex_bl=settingsCache["Gfc_Source_apex_value_apex_bl"] as Toybox.Lang.String;var cfg_apex_value_apex_bl_color=settingsCache["Gfc_apex_value_apex_bl_color"] as Toybox.Lang.Number;var cfg_apex_value_apex_br=settingsCache["Gfc_Source_apex_value_apex_br"] as Toybox.Lang.String;var cfg_apex_value_apex_br_color=settingsCache["Gfc_apex_value_apex_br_color"] as Toybox.Lang.Number;var cfg_apex_battery_color=settingsCache["Gfc_apex_battery_color"] as Toybox.Lang.Number;var cfg_apex_time_color=settingsCache["Gfc_apex_time_color"] as Toybox.Lang.Number;var cfg_apex_show_bg_art=settingsCache["Gfc_apex_show_bg_art"] as Toybox.Lang.Boolean;var cfg_apex_show_ticks=settingsCache["Gfc_apex_show_ticks"] as Toybox.Lang.Boolean;var cfg_apex_show_seconds=settingsCache["Gfc_apex_show_seconds"] as Toybox.Lang.Boolean;var cfg_trail_value_trail_tl=settingsCache["Gfc_Source_trail_value_trail_tl"] as Toybox.Lang.String;var cfg_trail_value_trail_tl_color=settingsCache["Gfc_trail_value_trail_tl_color"] as Toybox.Lang.Number;var cfg_trail_value_trail_tr=settingsCache["Gfc_Source_trail_value_trail_tr"] as Toybox.Lang.String;var cfg_trail_value_trail_tr_color=settingsCache["Gfc_trail_value_trail_tr_color"] as Toybox.Lang.Number;var cfg_trail_value_trail_bl=settingsCache["Gfc_Source_trail_value_trail_bl"] as Toybox.Lang.String;var cfg_trail_value_trail_bl_color=settingsCache["Gfc_trail_value_trail_bl_color"] as Toybox.Lang.Number;var cfg_trail_value_trail_br=settingsCache["Gfc_Source_trail_value_trail_br"] as Toybox.Lang.String;var cfg_trail_value_trail_br_color=settingsCache["Gfc_trail_value_trail_br_color"] as Toybox.Lang.Number;var cfg_trail_battery_color=settingsCache["Gfc_trail_battery_color"] as Toybox.Lang.Number;var cfg_trail_time_color=settingsCache["Gfc_trail_time_color"] as Toybox.Lang.Number;var cfg_trail_show_bg_art=settingsCache["Gfc_trail_show_bg_art"] as Toybox.Lang.Boolean;var cfg_trail_show_ticks=settingsCache["Gfc_trail_show_ticks"] as Toybox.Lang.Boolean;var cfg_trail_show_seconds=settingsCache["Gfc_trail_show_seconds"] as Toybox.Lang.Boolean;var cfg_vital_heart_big=settingsCache["Gfc_Source_vital_heart_big"] as Toybox.Lang.String;var cfg_vital_heart_big_color=settingsCache["Gfc_vital_heart_big_color"] as Toybox.Lang.Number;var cfg_vital_value_vital_bl=settingsCache["Gfc_Source_vital_value_vital_bl"] as Toybox.Lang.String;var cfg_vital_value_vital_bl_color=settingsCache["Gfc_vital_value_vital_bl_color"] as Toybox.Lang.Number;var cfg_vital_value_vital_br=settingsCache["Gfc_Source_vital_value_vital_br"] as Toybox.Lang.String;var cfg_vital_value_vital_br_color=settingsCache["Gfc_vital_value_vital_br_color"] as Toybox.Lang.Number;var cfg_vital_battery_color=settingsCache["Gfc_vital_battery_color"] as Toybox.Lang.Number;var cfg_vital_time_color=settingsCache["Gfc_vital_time_color"] as Toybox.Lang.Number;var cfg_vital_show_bg_art=settingsCache["Gfc_vital_show_bg_art"] as Toybox.Lang.Boolean;var cfg_vital_show_ticks=settingsCache["Gfc_vital_show_ticks"] as Toybox.Lang.Boolean;var cfg_vital_show_zone_decoration=settingsCache["Gfc_vital_show_zone_decoration"] as Toybox.Lang.Boolean;scale=dc.getWidth()/454.0;var clock=System.getClockTime();var dataheartRate=null;var datasteps=null;var datacalories=null;var datadistance=null;var databattery=null;var datatemperature=null;var currentActivityInfo=null;if(!sleeping){try {currentActivityInfo=ActivityMonitor.getInfo();var info=currentActivityInfo;if(info!=null){if(info has :steps){datasteps=info.steps;}if(info has :calories){datacalories=info.calories;}if(info has :distance){datadistance=info.distance==null ? null : info.distance/100000.0;}}}catch(e){}try {databattery=System.getSystemStats().battery;}catch(e){}try {if((Toybox has :SensorHistory)&&(Toybox.SensorHistory has :getHeartRateHistory)){var history=SensorHistory.getHeartRateHistory({:period=>1,:order=>SensorHistory.ORDER_NEWEST_FIRST});if(history!=null){var sample=history.next();if(sample!=null){var hr=sample.data;if(hr!=null && hr>0 && hr<1.0e12){dataheartRate=hr;}}}}}catch(e){}{var extra=gfcExtraMetrics();if(extra.hasKey(:temperature)){datatemperature=extra[:temperature];}}gfcMetricCache[:heartRate]=dataheartRate;gfcMetricCache[:steps]=datasteps;gfcMetricCache[:calories]=datacalories;gfcMetricCache[:distance]=datadistance;gfcMetricCache[:battery]=databattery;gfcMetricCache[:temperature]=datatemperature;}else{if(gfcMetricCache.hasKey(:heartRate)){dataheartRate=gfcMetricCache[:heartRate];}if(gfcMetricCache.hasKey(:steps)){datasteps=gfcMetricCache[:steps];}if(gfcMetricCache.hasKey(:calories)){datacalories=gfcMetricCache[:calories];}if(gfcMetricCache.hasKey(:distance)){datadistance=gfcMetricCache[:distance];}if(gfcMetricCache.hasKey(:battery)){databattery=gfcMetricCache[:battery];}if(gfcMetricCache.hasKey(:temperature)){datatemperature=gfcMetricCache[:temperature];}}var calendar=Gregorian.info(Time.now(),Time.FORMAT_SHORT);var dateText=["SUN","MON","TUE","WED","THU","FRI","SAT"][calendar.day_of_week-1]+" "+calendar.day.format("%d");
  
  
  var bg=sleeping?Graphics.COLOR_BLACK:cfgThemeBackground;dc.setColor(bg,bg);dc.clear();dc.setBlendMode(Graphics.BLEND_MODE_SOURCE_OVER);
  frameContext={:bg=>bg,:clock=>clock,:dataheartRate=>dataheartRate,:datasteps=>datasteps,:datacalories=>datacalories,:datadistance=>datadistance,:databattery=>databattery,:datatemperature=>datatemperature,:cfgTheme=>cfgTheme,:cfgThemeBackground=>cfgThemeBackground,:cfg_apex_value_apex_tl=>cfg_apex_value_apex_tl,:cfg_apex_value_apex_tl_color=>cfg_apex_value_apex_tl_color,:cfg_apex_value_apex_tr=>cfg_apex_value_apex_tr,:cfg_apex_value_apex_tr_color=>cfg_apex_value_apex_tr_color,:cfg_apex_value_apex_bl=>cfg_apex_value_apex_bl,:cfg_apex_value_apex_bl_color=>cfg_apex_value_apex_bl_color,:cfg_apex_value_apex_br=>cfg_apex_value_apex_br,:cfg_apex_value_apex_br_color=>cfg_apex_value_apex_br_color,:cfg_apex_battery_color=>cfg_apex_battery_color,:cfg_apex_time_color=>cfg_apex_time_color,:cfg_apex_show_bg_art=>cfg_apex_show_bg_art,:cfg_apex_show_ticks=>cfg_apex_show_ticks,:cfg_apex_show_seconds=>cfg_apex_show_seconds,:cfg_trail_value_trail_tl=>cfg_trail_value_trail_tl,:cfg_trail_value_trail_tl_color=>cfg_trail_value_trail_tl_color,:cfg_trail_value_trail_tr=>cfg_trail_value_trail_tr,:cfg_trail_value_trail_tr_color=>cfg_trail_value_trail_tr_color,:cfg_trail_value_trail_bl=>cfg_trail_value_trail_bl,:cfg_trail_value_trail_bl_color=>cfg_trail_value_trail_bl_color,:cfg_trail_value_trail_br=>cfg_trail_value_trail_br,:cfg_trail_value_trail_br_color=>cfg_trail_value_trail_br_color,:cfg_trail_battery_color=>cfg_trail_battery_color,:cfg_trail_time_color=>cfg_trail_time_color,:cfg_trail_show_bg_art=>cfg_trail_show_bg_art,:cfg_trail_show_ticks=>cfg_trail_show_ticks,:cfg_trail_show_seconds=>cfg_trail_show_seconds,:cfg_vital_heart_big=>cfg_vital_heart_big,:cfg_vital_heart_big_color=>cfg_vital_heart_big_color,:cfg_vital_value_vital_bl=>cfg_vital_value_vital_bl,:cfg_vital_value_vital_bl_color=>cfg_vital_value_vital_bl_color,:cfg_vital_value_vital_br=>cfg_vital_value_vital_br,:cfg_vital_value_vital_br_color=>cfg_vital_value_vital_br_color,:cfg_vital_battery_color=>cfg_vital_battery_color,:cfg_vital_time_color=>cfg_vital_time_color,:cfg_vital_show_bg_art=>cfg_vital_show_bg_art,:cfg_vital_show_ticks=>cfg_vital_show_ticks,:cfg_vital_show_zone_decoration=>cfg_vital_show_zone_decoration,:calendar=>calendar,:dateText=>dateText};
  if(sleeping){render_aod_0(dc);render_aod_1(dc);render_aod_2(dc);render_aod_3(dc);render_aod_4(dc);render_aod_5(dc);render_aod_6(dc);render_aod_7(dc);render_aod_8(dc);render_aod_9(dc);render_aod_10(dc);render_aod_11(dc);render_aod_12(dc);render_aod_13(dc);render_aod_14(dc);render_aod_15(dc);render_aod_16(dc);render_aod_17(dc);render_aod_18(dc);render_aod_19(dc);render_aod_20(dc);render_aod_21(dc);render_aod_22(dc);render_aod_23(dc);render_aod_24(dc);render_aod_25(dc);render_aod_26(dc);render_aod_27(dc);render_aod_28(dc);render_aod_29(dc);render_aod_30(dc);}else{render_active_0(dc);render_active_1(dc);render_active_2(dc);render_active_3(dc);render_active_4(dc);render_active_5(dc);render_active_6(dc);render_active_7(dc);render_active_8(dc);render_active_9(dc);render_active_10(dc);render_active_11(dc);render_active_12(dc);render_active_13(dc);render_active_14(dc);render_active_15(dc);render_active_16(dc);render_active_17(dc);render_active_18(dc);render_active_19(dc);render_active_20(dc);render_active_21(dc);render_active_22(dc);render_active_23(dc);render_active_24(dc);render_active_25(dc);render_active_26(dc);render_active_27(dc);render_active_28(dc);render_active_29(dc);render_active_30(dc);}
  frameContext=null;
  trimImages();
  if(!gfcFrameReported){System.println("GFC_RENDER_READY target=venu445mm mode="+(sleeping?"aod":"active"));gfcFrameReported=true;}
 }
}