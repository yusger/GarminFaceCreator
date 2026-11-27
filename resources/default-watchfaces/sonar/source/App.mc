// GarminFaceCreator local generator basic-39-source-decoration-aod; approximate system font mapping, no SDK fonts bundled.
// Target venu445mm; device metadata sdk-metadata-1-7722889381ba; package eddc2840754f6d29c6c9a3ede43befdaadd25a09; compiler SHA256 1aa85d1594c28318b66e6cdc656d4f5e7c782c81fbf488bd44a4b7c2439feaf4. Hardware/AOD/power unverified.
import Toybox.Application;import Toybox.WatchUi;import Toybox.Graphics;import Toybox.System;import Toybox.SensorHistory;import Toybox.ActivityMonitor;import Toybox.Time;import Toybox.Time.Gregorian;import Toybox.Math;
class GeneratedApp extends Application.AppBase {var mainView=null;function initialize(){AppBase.initialize();} function getInitialView(){mainView=new GeneratedView();return [mainView];}function onSettingsChanged(){if(mainView!=null){mainView.settingsCache=null;}WatchUi.requestUpdate();}}
class GeneratedView extends WatchUi.WatchFace {
 var sleeping=false;var scale=1.0;var frameContext=null;var gfcFrameReported=false;
 function mixTextInk(ink,alpha,bg){var r=(((ink>>16)&255)*alpha+((bg>>16)&255)*(255-alpha))/255;var g=(((ink>>8)&255)*alpha+((bg>>8)&255)*(255-alpha))/255;var b=((ink&255)*alpha+(bg&255)*(255-alpha))/255;return (r.toNumber()<<16)|(g.toNumber()<<8)|b.toNumber();}
 
 
 var settingsCache=null;function prepareSettings(){if(settingsCache==null){settingsCache={};{var v=null;try{v=Application.Properties.getValue("Gfc_primary_color");}catch(e){}settingsCache["Gfc_primary_color"]=(v!=null && (v instanceof Toybox.Lang.Number && v>=0 && v<=16777215))?v:0xDCE9F0;}{var v=null;try{v=Application.Properties.getValue("Gfc_hour_hand_color");}catch(e){}settingsCache["Gfc_hour_hand_color"]=(v!=null && (v instanceof Toybox.Lang.Number && v>=0 && v<=16777215))?v:0xDCE9F0;}{var v=null;try{v=Application.Properties.getValue("Gfc_minute_hand_color");}catch(e){}settingsCache["Gfc_minute_hand_color"]=(v!=null && (v instanceof Toybox.Lang.Number && v>=0 && v<=16777215))?v:0xDCE9F0;}{var v=null;try{v=Application.Properties.getValue("Gfc_second_hand_color");}catch(e){}settingsCache["Gfc_second_hand_color"]=(v!=null && (v instanceof Toybox.Lang.Number && v>=0 && v<=16777215))?v:0xF2A65F;}{var v=null;try{v=Application.Properties.getValue("Gfc_hr_normal_color");}catch(e){}settingsCache["Gfc_hr_normal_color"]=(v!=null && (v instanceof Toybox.Lang.Number && v>=0 && v<=16777215))?v:0x4FD1C5;}{var v=null;try{v=Application.Properties.getValue("Gfc_hr_warning_color");}catch(e){}settingsCache["Gfc_hr_warning_color"]=(v!=null && (v instanceof Toybox.Lang.Number && v>=0 && v<=16777215))?v:0xF2A65F;}{var v=null;try{v=Application.Properties.getValue("Gfc_hr_alert_color");}catch(e){}settingsCache["Gfc_hr_alert_color"]=(v!=null && (v instanceof Toybox.Lang.Number && v>=0 && v<=16777215))?v:0xFF6B6B;}{var v=null;try{v=Application.Properties.getValue("Gfc_batt_normal_color");}catch(e){}settingsCache["Gfc_batt_normal_color"]=(v!=null && (v instanceof Toybox.Lang.Number && v>=0 && v<=16777215))?v:0x4FD1C5;}{var v=null;try{v=Application.Properties.getValue("Gfc_batt_warning_color");}catch(e){}settingsCache["Gfc_batt_warning_color"]=(v!=null && (v instanceof Toybox.Lang.Number && v>=0 && v<=16777215))?v:0xF2A65F;}{var v=null;try{v=Application.Properties.getValue("Gfc_batt_alert_color");}catch(e){}settingsCache["Gfc_batt_alert_color"]=(v!=null && (v instanceof Toybox.Lang.Number && v>=0 && v<=16777215))?v:0xFF6B6B;}{var v=null;try{v=Application.Properties.getValue("Gfc_right_slot_source");}catch(e){}settingsCache["Gfc_right_slot_source"]=(v!=null && (v instanceof Toybox.Lang.Number && v>=0 && v<3 && v.toNumber()==v))?["steps","calories","distance"][v.toNumber()]:"steps";}{var v=null;try{v=Application.Properties.getValue("Gfc_show_seconds");}catch(e){}settingsCache["Gfc_show_seconds"]=(v!=null && (v instanceof Toybox.Lang.Boolean))?v:true;}}}
 var fonts={};function fontFor(id){if(!fonts.hasKey(id)){fonts[id]=WatchUi.loadResource(id);}return fonts[id];}
 function initialize(){WatchFace.initialize();}
 function onEnterSleep(){sleeping=true;WatchUi.requestUpdate();}
 function onExitSleep(){sleeping=false;WatchUi.requestUpdate();}
 function meterCount(value,goal,count,battery){if(value==null || value!=value || value<0 || value>1.0e12 || (battery && value>100)){return 0;}if(value>=goal){return count;}return (value*1.0/goal*count).toNumber();}
 function metricValid(value,source){if(value==null || value!=value || value<=-1.0e12 || value>=1.0e12){return false;}if(source.equals("heartRate")){return value>0;}if(source.equals("battery")){return value>=0 && value<=100;}if(source.equals("temperature")){return value>=-273.15 && value<=1000;}if(source.equals("humidity")){return value>=0 && value<=100;}if(source.equals("stress")){return value>=0 && value<=100;}if(source.equals("seconds")){return value>=0 && value<=59;}if(source.equals("altitude")){return value>=-1.0e12;}return value>=0;}
 function metricText(value,source,label,unit,precision,missing,group){
  if(!metricValid(value,source)){return label+missing;}
  var text="";
  if(precision>=0){text=value.toFloat().format("%."+precision.format("%d")+"f");}
  else if(source.equals("seconds")){text=value.toNumber().format("%02d");}
  else if(source.equals("steps")){text=value.toNumber().format("%d");}
  else {text=value.toFloat().format("%.6f");while(text.length()>0 && text.substring(text.length()-1,text.length()).equals("0")){text=text.substring(0,text.length()-1);}if(text.substring(text.length()-1,text.length()).equals(".")){text=text.substring(0,text.length()-1);}}
  if(group){var cut=text.length();for(var c=0;c<text.length();c++){if(text.substring(c,c+1).equals(".")){cut=c;break;}}var grouped="";for(var k=0;k<text.length();k++){if(k>0 && k<cut && (cut-k)%3==0 && !text.substring(k-1,k).equals("-")){grouped+=",";}grouped+=text.substring(k,k+1);}text=grouped;}

  return label+text+unit;
 }
 function drawHand(dc,clock,kind,x,y,w,h,pvx,pvy,reach,tail,stroke,ink,low,roundCap,shape){
  var cx=w*pvx;var cy=h*pvy;var radius=cx;if(w-cx<radius){radius=w-cx;}if(cy<radius){radius=cy;}if(h-cy<radius){radius=h-cy;}radius-=stroke/2.0;if(radius<0){radius=0;}
  var sec=low?0:clock.sec;var degrees=kind==0?((clock.hour%12)+clock.min/60.0+sec/3600.0)*30:(kind==1?(clock.min+sec/60.0)*6:sec*6);var a=degrees*Math.PI/180.0;var dx=Math.sin(a);var dy=-Math.cos(a);
  dc.setFill(Graphics.createColor(255,(ink>>16)&255,(ink>>8)&255,ink&255));dc.setStroke(Graphics.createColor(255,(ink>>16)&255,(ink>>8)&255,ink&255));dc.setColor(ink,Graphics.COLOR_TRANSPARENT);dc.setPenWidth(px(stroke)>0?px(stroke):1);
  if(shape!=null){var points=[];for(var si=0;si<shape.size();si++){var point=shape[si];var along=point[1]*radius*(point[1]>=0?reach:tail);var across=point[0]*stroke/2.0;points.add([px(x+cx+dx*along-dy*across),px(y+cy+dy*along+dx*across)]);}dc.fillPolygon(points);return;}
  dc.drawLine(px(x+cx-dx*radius*tail),px(y+cy-dy*radius*tail),px(x+cx+dx*radius*reach),px(y+cy+dy*radius*reach));
  if(roundCap){dc.fillCircle(px(x+cx-dx*radius*tail),px(y+cy-dy*radius*tail),px(stroke/2));dc.fillCircle(px(x+cx+dx*radius*reach),px(y+cy+dy*radius*reach),px(stroke/2));}
 }
 
 
 var bitmapCache={};var bitmapUsed={};
 function drawStaticImage(dc,id,x,y){bitmapUsed[id]=true;if(!bitmapCache.hasKey(id)){bitmapCache[id]=WatchUi.loadResource(id);}dc.drawBitmap(x,y,bitmapCache[id]);}
 function drawBitmapHand(dc,clock,id,kind,x,y,w,h,pvx,pvy,low,tint){bitmapUsed[id]=true;if(!bitmapCache.hasKey(id)){bitmapCache[id]=WatchUi.loadResource(id);}var bitmap=bitmapCache[id];var cx=w*pvx;var cy=h*pvy;var r=cx;if(w-cx<r){r=w-cx;}if(cy<r){r=cy;}if(h-cy<r){r=h-cy;}if(r<=0){return;}var sec=low?0:clock.sec;var deg=kind==0?((clock.hour%12)+clock.min/60.0+sec/3600.0)*30:(kind==1?(clock.min+sec/60.0)*6:sec*6);var a=deg*Math.PI/180.0;var transform=new Graphics.AffineTransform();transform.translate((px(x+cx)*1.0),(px(y+cy)*1.0));transform.rotate(a);transform.scale(px(r*2)*1.0/bitmap.getWidth(),px(r*2)*1.0/bitmap.getHeight());transform.translate(-bitmap.getWidth()/2.0,-bitmap.getHeight()/2.0);var options={:transform=>transform};if(low){options[:tintColor]=tint;}dc.drawBitmap2(0,0,bitmap,options);}
 function trimImages(){var keys=bitmapCache.keys();for(var i=0;i<keys.size();i++){if(!bitmapUsed.hasKey(keys[i])){bitmapCache.remove(keys[i]);}}}
 
 
 function px(value){return (value*scale).toNumber();}
 function render_active_0(dc as Graphics.Dc) as Void {var datasteps=frameContext[:datasteps];var datacalories=frameContext[:datacalories];var datadistance=frameContext[:datadistance];var cfg_primary_color=frameContext[:cfg_primary_color] as Toybox.Lang.Number;var cfg_right_slot_source=frameContext[:cfg_right_slot_source] as Toybox.Lang.String;var dateMonthDayWeek=frameContext[:dateMonthDayWeek];

// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22sonar_dial_rings%22%2C%22partId%22%3A%22sonar_dial_rings%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22active%22%7D
if(true){drawStaticImage(dc,Rez.Drawables.GfcImage_sonar_dial_rings,px(0),px(0));}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22sonar_scan_beam%22%2C%22partId%22%3A%22sonar_scan_beam%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22active%22%7D
if(true){drawStaticImage(dc,Rez.Drawables.GfcImage_sonar_scan_beam,px(0),px(0));}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22sonar_date%22%2C%22partId%22%3A%22sonar_date%22%2C%22capabilityId%22%3A%22core.date%22%2C%22mode%22%3A%22active%22%7D
if(true){dc.setColor(mixTextInk(cfg_primary_color,184,bg),Graphics.COLOR_TRANSPARENT);dc.setFill(Graphics.createColor(184,(mixTextInk(cfg_primary_color,184,bg)>>16)&255,(mixTextInk(cfg_primary_color,184,bg)>>8)&255,mixTextInk(cfg_primary_color,184,bg)&255));dc.setStroke(Graphics.createColor(184,(mixTextInk(cfg_primary_color,184,bg)>>16)&255,(mixTextInk(cfg_primary_color,184,bg)>>8)&255,mixTextInk(cfg_primary_color,184,bg)&255));dc.drawText(px(227),px(90),fontFor(Rez.Fonts.GfcCustom_sonar_label_font_16),dateMonthDayWeek,Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22sonar_steps_value%22%2C%22partId%22%3A%22sonar_steps_value%22%2C%22capabilityId%22%3A%22core.metric%22%2C%22mode%22%3A%22active%22%7D
if(true){if(cfg_right_slot_source.equals("steps")){{var value=datasteps;dc.setColor(cfg_primary_color,Graphics.COLOR_TRANSPARENT);dc.setFill(Graphics.createColor(255,(cfg_primary_color>>16)&255,(cfg_primary_color>>8)&255,cfg_primary_color&255));dc.setStroke(Graphics.createColor(255,(cfg_primary_color>>16)&255,(cfg_primary_color>>8)&255,cfg_primary_color&255));dc.drawText(px(352),px(226),fontFor(Rez.Fonts.GfcCustom_sonar_number_font_29),metricText(value,"steps","","",0,"--",true),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}else if(cfg_right_slot_source.equals("calories")){{var value=datacalories;dc.setColor(cfg_primary_color,Graphics.COLOR_TRANSPARENT);dc.setFill(Graphics.createColor(255,(cfg_primary_color>>16)&255,(cfg_primary_color>>8)&255,cfg_primary_color&255));dc.setStroke(Graphics.createColor(255,(cfg_primary_color>>16)&255,(cfg_primary_color>>8)&255,cfg_primary_color&255));dc.drawText(px(352),px(226),fontFor(Rez.Fonts.GfcCustom_sonar_number_font_29),metricText(value,"calories","","",0,"--",true),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}else if(cfg_right_slot_source.equals("distance")){{var value=datadistance;dc.setColor(cfg_primary_color,Graphics.COLOR_TRANSPARENT);dc.setFill(Graphics.createColor(255,(cfg_primary_color>>16)&255,(cfg_primary_color>>8)&255,cfg_primary_color&255));dc.setStroke(Graphics.createColor(255,(cfg_primary_color>>16)&255,(cfg_primary_color>>8)&255,cfg_primary_color&255));dc.drawText(px(352),px(226),fontFor(Rez.Fonts.GfcCustom_sonar_number_font_29),metricText(value,"distance","","",2,"--",true),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}}
// GFC_LAYER_END

}
function render_active_1(dc as Graphics.Dc) as Void {var datasteps=frameContext[:datasteps];var dataheartRate=frameContext[:dataheartRate];var cfg_hr_normal_color=frameContext[:cfg_hr_normal_color] as Toybox.Lang.Number;var cfg_hr_warning_color=frameContext[:cfg_hr_warning_color] as Toybox.Lang.Number;var cfg_hr_alert_color=frameContext[:cfg_hr_alert_color] as Toybox.Lang.Number;var cfg_right_slot_source=frameContext[:cfg_right_slot_source] as Toybox.Lang.String;

// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22sonar_steps_label%22%2C%22partId%22%3A%22sonar_steps_label%22%2C%22capabilityId%22%3A%22core.text%22%2C%22mode%22%3A%22active%22%7D
if(true){if(cfg_right_slot_source.equals("steps")){dc.setColor(mixTextInk(0xDCE9F0,158,bg),Graphics.COLOR_TRANSPARENT);dc.setFill(Graphics.createColor(158,(mixTextInk(0xDCE9F0,158,bg)>>16)&255,(mixTextInk(0xDCE9F0,158,bg)>>8)&255,mixTextInk(0xDCE9F0,158,bg)&255));dc.setStroke(Graphics.createColor(158,(mixTextInk(0xDCE9F0,158,bg)>>16)&255,(mixTextInk(0xDCE9F0,158,bg)>>8)&255,mixTextInk(0xDCE9F0,158,bg)&255));dc.drawText(px(352),px(253),fontFor(Rez.Fonts.GfcCustom_sonar_label_font_14),"steps",Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}else if(cfg_right_slot_source.equals("calories")){dc.setColor(mixTextInk(0xDCE9F0,158,bg),Graphics.COLOR_TRANSPARENT);dc.setFill(Graphics.createColor(158,(mixTextInk(0xDCE9F0,158,bg)>>16)&255,(mixTextInk(0xDCE9F0,158,bg)>>8)&255,mixTextInk(0xDCE9F0,158,bg)&255));dc.setStroke(Graphics.createColor(158,(mixTextInk(0xDCE9F0,158,bg)>>16)&255,(mixTextInk(0xDCE9F0,158,bg)>>8)&255,mixTextInk(0xDCE9F0,158,bg)&255));dc.drawText(px(352),px(253),fontFor(Rez.Fonts.GfcCustom_sonar_label_font_14),"kcal",Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}else if(cfg_right_slot_source.equals("distance")){dc.setColor(mixTextInk(0xDCE9F0,158,bg),Graphics.COLOR_TRANSPARENT);dc.setFill(Graphics.createColor(158,(mixTextInk(0xDCE9F0,158,bg)>>16)&255,(mixTextInk(0xDCE9F0,158,bg)>>8)&255,mixTextInk(0xDCE9F0,158,bg)&255));dc.setStroke(Graphics.createColor(158,(mixTextInk(0xDCE9F0,158,bg)>>16)&255,(mixTextInk(0xDCE9F0,158,bg)>>8)&255,mixTextInk(0xDCE9F0,158,bg)&255));dc.drawText(px(352),px(253),fontFor(Rez.Fonts.GfcCustom_sonar_label_font_14),"km",Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22sonar_steps_progress%22%2C%22partId%22%3A%22sonar_steps_progress%22%2C%22capabilityId%22%3A%22core.meter%22%2C%22mode%22%3A%22active%22%7D
if(true){if(cfg_right_slot_source.equals("steps")){{dc.setColor(0x16324A,Graphics.COLOR_TRANSPARENT);dc.fillRectangle(px(316),px(264),px(72),px(4));var ratio=0.0;if(datasteps!=null && datasteps==datasteps && datasteps>=0 && datasteps<1.0e12 ){ratio=datasteps*1.0/10000;if(ratio>1){ratio=1;}}dc.setColor(0x4FD1C5,Graphics.COLOR_TRANSPARENT);dc.fillRectangle(px(316),px(264),px(72*ratio),px(4));}}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22sonar_heart_icon%22%2C%22partId%22%3A%22sonar_heart_icon%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22active%22%7D
if(true){drawStaticImage(dc,Rez.Drawables.GfcImage_sonar_heart_icon,px(82),px(178));}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22sonar_heart_rate%22%2C%22partId%22%3A%22sonar_heart_rate%22%2C%22capabilityId%22%3A%22core.metric%22%2C%22mode%22%3A%22active%22%7D
if(true){{var value=dataheartRate;var ink=0x7C93A8;if(metricValid(value,"heartRate")){if(true && value<120){ink=cfg_hr_normal_color;}else if(value>=120 && value<150){ink=cfg_hr_warning_color;}else if(value>=150 && true){ink=cfg_hr_alert_color;}}dc.setColor(ink,Graphics.COLOR_TRANSPARENT);dc.setFill(Graphics.createColor(255,(ink>>16)&255,(ink>>8)&255,ink&255));dc.setStroke(Graphics.createColor(255,(ink>>16)&255,(ink>>8)&255,ink&255));dc.drawText(px(98),px(228),fontFor(Rez.Fonts.GfcCustom_sonar_number_font_38),metricText(value,"heartRate","","",0,"--",false),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}
// GFC_LAYER_END

}
function render_active_2(dc as Graphics.Dc) as Void {var clock=frameContext[:clock];var databattery=frameContext[:databattery];var cfg_primary_color=frameContext[:cfg_primary_color] as Toybox.Lang.Number;var cfg_batt_normal_color=frameContext[:cfg_batt_normal_color] as Toybox.Lang.Number;var cfg_batt_warning_color=frameContext[:cfg_batt_warning_color] as Toybox.Lang.Number;var cfg_batt_alert_color=frameContext[:cfg_batt_alert_color] as Toybox.Lang.Number;

// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22sonar_heart_rate_unit%22%2C%22partId%22%3A%22sonar_heart_rate_unit%22%2C%22capabilityId%22%3A%22core.text%22%2C%22mode%22%3A%22active%22%7D
if(true){dc.setColor(mixTextInk(0xDCE9F0,158,bg),Graphics.COLOR_TRANSPARENT);dc.setFill(Graphics.createColor(158,(mixTextInk(0xDCE9F0,158,bg)>>16)&255,(mixTextInk(0xDCE9F0,158,bg)>>8)&255,mixTextInk(0xDCE9F0,158,bg)&255));dc.setStroke(Graphics.createColor(158,(mixTextInk(0xDCE9F0,158,bg)>>16)&255,(mixTextInk(0xDCE9F0,158,bg)>>8)&255,mixTextInk(0xDCE9F0,158,bg)&255));dc.drawText(px(98),px(259),fontFor(Rez.Fonts.GfcCustom_sonar_label_font_14),"bpm",Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22sonar_battery_icon%22%2C%22partId%22%3A%22sonar_battery_icon%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22active%22%7D
if(true){drawStaticImage(dc,Rez.Drawables.GfcImage_sonar_battery_icon,px(316),px(330));}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22sonar_battery_value%22%2C%22partId%22%3A%22sonar_battery_value%22%2C%22capabilityId%22%3A%22core.metric%22%2C%22mode%22%3A%22active%22%7D
if(true){{var value=databattery;var ink=0x7C93A8;if(metricValid(value,"battery")){if(true && value<10){ink=cfg_batt_alert_color;}else if(value>=10 && value<30){ink=cfg_batt_warning_color;}else if(value>=30 && true){ink=cfg_batt_normal_color;}}dc.setColor(ink,Graphics.COLOR_TRANSPARENT);dc.setFill(Graphics.createColor(255,(ink>>16)&255,(ink>>8)&255,ink&255));dc.setStroke(Graphics.createColor(255,(ink>>16)&255,(ink>>8)&255,ink&255));dc.drawText(px(332),px(356),fontFor(Rez.Fonts.GfcCustom_sonar_number_font_16),metricText(value,"battery","","%",0,"--",false),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22sonar_digital_time%22%2C%22partId%22%3A%22sonar_digital_time%22%2C%22capabilityId%22%3A%22core.time%22%2C%22mode%22%3A%22active%22%7D
if(true){dc.setColor(cfg_primary_color,Graphics.COLOR_TRANSPARENT);dc.setFill(Graphics.createColor(255,(cfg_primary_color>>16)&255,(cfg_primary_color>>8)&255,cfg_primary_color&255));dc.setStroke(Graphics.createColor(255,(cfg_primary_color>>16)&255,(cfg_primary_color>>8)&255,cfg_primary_color&255));dc.drawText(px(203),px(356),fontFor(Rez.Fonts.GfcCustom_sonar_number_font_30),clock.hour.format("%02d")+":"+clock.min.format("%02d"),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}
// GFC_LAYER_END

}
function render_active_3(dc as Graphics.Dc) as Void {var clock=frameContext[:clock];var cfg_hour_hand_color=frameContext[:cfg_hour_hand_color] as Toybox.Lang.Number;var cfg_minute_hand_color=frameContext[:cfg_minute_hand_color] as Toybox.Lang.Number;var cfg_second_hand_color=frameContext[:cfg_second_hand_color] as Toybox.Lang.Number;var cfg_show_seconds=frameContext[:cfg_show_seconds] as Toybox.Lang.Boolean;

// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22sonar_digital_second%22%2C%22partId%22%3A%22sonar_digital_second%22%2C%22capabilityId%22%3A%22core.time%22%2C%22mode%22%3A%22active%22%7D
if(true){if(cfg_show_seconds){dc.setColor(cfg_second_hand_color,Graphics.COLOR_TRANSPARENT);dc.setFill(Graphics.createColor(255,(cfg_second_hand_color>>16)&255,(cfg_second_hand_color>>8)&255,cfg_second_hand_color&255));dc.setStroke(Graphics.createColor(255,(cfg_second_hand_color>>16)&255,(cfg_second_hand_color>>8)&255,cfg_second_hand_color&255));dc.drawText(px(276),px(356),fontFor(Rez.Fonts.GfcCustom_sonar_number_font_19),clock.sec.format("%02d"),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22sonar_analog_hour%22%2C%22partId%22%3A%22sonar_analog_hour%22%2C%22capabilityId%22%3A%22core.hand%22%2C%22mode%22%3A%22active%22%7D
if(true){drawHand(dc,clock,0,124,124,206,206,0.5,0.5,1,0,10,cfg_hour_hand_color,false,true,null);}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22sonar_analog_minute%22%2C%22partId%22%3A%22sonar_analog_minute%22%2C%22capabilityId%22%3A%22core.hand%22%2C%22mode%22%3A%22active%22%7D
if(true){drawHand(dc,clock,1,86,86,282,282,0.5,0.5,1,0,6,cfg_minute_hand_color,false,true,null);}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22sonar_analog_second%22%2C%22partId%22%3A%22sonar_analog_second%22%2C%22capabilityId%22%3A%22core.hand%22%2C%22mode%22%3A%22active%22%7D
if(true){if(cfg_show_seconds){drawHand(dc,clock,2,67.9,67.9,318.2,318.2,0.5,0.5,1,0.1899,2.2,cfg_second_hand_color,false,true,null);}}
// GFC_LAYER_END

}
function render_active_4(dc as Graphics.Dc) as Void {

// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22sonar_hand_pivot%22%2C%22partId%22%3A%22sonar_hand_pivot%22%2C%22capabilityId%22%3A%22core.circle%22%2C%22mode%22%3A%22active%22%7D
if(true){{var polygon=[[px(235),px(227)],[px(233.9282),px(231)],[px(231),px(233.9282)],[px(227),px(235)],[px(223),px(233.9282)],[px(220.0718),px(231)],[px(219),px(227)],[px(220.0718),px(223)],[px(223),px(220.0718)],[px(227),px(219)],[px(231),px(220.0718)],[px(233.9282),px(223)]];dc.setColor(0x4FD1C5,Graphics.COLOR_TRANSPARENT);dc.setFill(Graphics.createColor(255,(0x4FD1C5>>16)&255,(0x4FD1C5>>8)&255,0x4FD1C5&255));dc.setColor(0x4FD1C5,Graphics.COLOR_TRANSPARENT);dc.fillPolygon(polygon);dc.setColor(0x0B1B2B,Graphics.COLOR_TRANSPARENT);dc.setStroke(Graphics.createColor(255,(0x0B1B2B>>16)&255,(0x0B1B2B>>8)&255,0x0B1B2B&255));dc.setPenWidth(px(3)>0?px(3):1);dc.setColor(0x0B1B2B,Graphics.COLOR_TRANSPARENT);for(var i=0;i<polygon.size();i++){var j=(i+1)%polygon.size();dc.drawLine(polygon[i][0],polygon[i][1],polygon[j][0],polygon[j][1]);}}}
// GFC_LAYER_END

}
function render_aod_0(dc as Graphics.Dc) as Void {var dataheartRate=frameContext[:dataheartRate];var cfg_right_slot_source=frameContext[:cfg_right_slot_source] as Toybox.Lang.String;

// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22sonar_steps_value%22%2C%22partId%22%3A%22sonar_steps_value%22%2C%22capabilityId%22%3A%22core.metric%22%2C%22mode%22%3A%22aod%22%7D
if(true){if(cfg_right_slot_source.equals("steps")){}else if(cfg_right_slot_source.equals("calories")){}else if(cfg_right_slot_source.equals("distance")){}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22sonar_steps_label%22%2C%22partId%22%3A%22sonar_steps_label%22%2C%22capabilityId%22%3A%22core.text%22%2C%22mode%22%3A%22aod%22%7D
if(true){if(cfg_right_slot_source.equals("steps")){}else if(cfg_right_slot_source.equals("calories")){}else if(cfg_right_slot_source.equals("distance")){}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22sonar_steps_progress%22%2C%22partId%22%3A%22sonar_steps_progress%22%2C%22capabilityId%22%3A%22core.meter%22%2C%22mode%22%3A%22aod%22%7D
if(true){if(cfg_right_slot_source.equals("steps")){}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22sonar_heart_rate%22%2C%22partId%22%3A%22sonar_heart_rate%22%2C%22capabilityId%22%3A%22core.metric%22%2C%22mode%22%3A%22aod%22%7D
if(true){{var value=dataheartRate;dc.setColor(0x5E7C93,Graphics.COLOR_TRANSPARENT);dc.setFill(Graphics.createColor(255,(0x5E7C93>>16)&255,(0x5E7C93>>8)&255,0x5E7C93&255));dc.setStroke(Graphics.createColor(255,(0x5E7C93>>16)&255,(0x5E7C93>>8)&255,0x5E7C93&255));dc.drawText(px(98),px(228),fontFor(Rez.Fonts.GfcCustom_sonar_number_font_34),metricText(value,"heartRate","","",0,"--",false),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}
// GFC_LAYER_END

}
function render_aod_1(dc as Graphics.Dc) as Void {var clock=frameContext[:clock];var databattery=frameContext[:databattery];

// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22sonar_heart_rate_unit%22%2C%22partId%22%3A%22sonar_heart_rate_unit%22%2C%22capabilityId%22%3A%22core.text%22%2C%22mode%22%3A%22aod%22%7D
if(true){dc.setColor(mixTextInk(0x5E7C93,158,bg),Graphics.COLOR_TRANSPARENT);dc.setFill(Graphics.createColor(158,(mixTextInk(0x5E7C93,158,bg)>>16)&255,(mixTextInk(0x5E7C93,158,bg)>>8)&255,mixTextInk(0x5E7C93,158,bg)&255));dc.setStroke(Graphics.createColor(158,(mixTextInk(0x5E7C93,158,bg)>>16)&255,(mixTextInk(0x5E7C93,158,bg)>>8)&255,mixTextInk(0x5E7C93,158,bg)&255));dc.drawText(px(98),px(259),fontFor(Rez.Fonts.GfcCustom_sonar_label_font_14),"bpm",Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22sonar_battery_value%22%2C%22partId%22%3A%22sonar_battery_value%22%2C%22capabilityId%22%3A%22core.metric%22%2C%22mode%22%3A%22aod%22%7D
if(true){{var value=databattery;dc.setColor(0x5E7C93,Graphics.COLOR_TRANSPARENT);dc.setFill(Graphics.createColor(255,(0x5E7C93>>16)&255,(0x5E7C93>>8)&255,0x5E7C93&255));dc.setStroke(Graphics.createColor(255,(0x5E7C93>>16)&255,(0x5E7C93>>8)&255,0x5E7C93&255));dc.drawText(px(332),px(356),fontFor(Rez.Fonts.GfcCustom_sonar_number_font_15),metricText(value,"battery","","%",0,"--",false),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22sonar_battery_label%22%2C%22partId%22%3A%22sonar_battery_label%22%2C%22capabilityId%22%3A%22core.text%22%2C%22mode%22%3A%22aod%22%7D
if(true){dc.setColor(mixTextInk(0x5E7C93,158,bg),Graphics.COLOR_TRANSPARENT);dc.setFill(Graphics.createColor(158,(mixTextInk(0x5E7C93,158,bg)>>16)&255,(mixTextInk(0x5E7C93,158,bg)>>8)&255,mixTextInk(0x5E7C93,158,bg)&255));dc.setStroke(Graphics.createColor(158,(mixTextInk(0x5E7C93,158,bg)>>16)&255,(mixTextInk(0x5E7C93,158,bg)>>8)&255,mixTextInk(0x5E7C93,158,bg)&255));dc.drawText(px(332),px(375),fontFor(Rez.Fonts.GfcCustom_sonar_label_font_12),"batt",Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22sonar_digital_time%22%2C%22partId%22%3A%22sonar_digital_time%22%2C%22capabilityId%22%3A%22core.time%22%2C%22mode%22%3A%22aod%22%7D
if(true){dc.setColor(0x5E7C93,Graphics.COLOR_TRANSPARENT);dc.setFill(Graphics.createColor(255,(0x5E7C93>>16)&255,(0x5E7C93>>8)&255,0x5E7C93&255));dc.setStroke(Graphics.createColor(255,(0x5E7C93>>16)&255,(0x5E7C93>>8)&255,0x5E7C93&255));dc.drawText(px(203),px(356),fontFor(Rez.Fonts.GfcCustom_sonar_number_font_28),clock.hour.format("%02d")+":"+clock.min.format("%02d"),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}
// GFC_LAYER_END

}
function render_aod_2(dc as Graphics.Dc) as Void {var clock=frameContext[:clock];

// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22sonar_analog_hour%22%2C%22partId%22%3A%22sonar_analog_hour%22%2C%22capabilityId%22%3A%22core.hand%22%2C%22mode%22%3A%22aod%22%7D
if(true){drawHand(dc,clock,0,124,124,206,206,0.5,0.5,1,0,10,0x5E7C93,true,true,null);}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22sonar_analog_minute%22%2C%22partId%22%3A%22sonar_analog_minute%22%2C%22capabilityId%22%3A%22core.hand%22%2C%22mode%22%3A%22aod%22%7D
if(true){drawHand(dc,clock,1,86,86,282,282,0.5,0.5,1,0,6,0x5E7C93,true,true,null);}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22sonar_hand_pivot%22%2C%22partId%22%3A%22sonar_hand_pivot%22%2C%22capabilityId%22%3A%22core.circle%22%2C%22mode%22%3A%22aod%22%7D
if(true){{var polygon=[[px(235),px(227)],[px(233.9282),px(231)],[px(231),px(233.9282)],[px(227),px(235)],[px(223),px(233.9282)],[px(220.0718),px(231)],[px(219),px(227)],[px(220.0718),px(223)],[px(223),px(220.0718)],[px(227),px(219)],[px(231),px(220.0718)],[px(233.9282),px(223)]];dc.setColor(0x5E7C93,Graphics.COLOR_TRANSPARENT);dc.setFill(Graphics.createColor(255,(0x5E7C93>>16)&255,(0x5E7C93>>8)&255,0x5E7C93&255));dc.setColor(0x5E7C93,Graphics.COLOR_TRANSPARENT);dc.fillPolygon(polygon);dc.setColor(0x5E7C93,Graphics.COLOR_TRANSPARENT);dc.setStroke(Graphics.createColor(255,(0x5E7C93>>16)&255,(0x5E7C93>>8)&255,0x5E7C93&255));dc.setPenWidth(px(3)>0?px(3):1);dc.setColor(0x5E7C93,Graphics.COLOR_TRANSPARENT);for(var i=0;i<polygon.size();i++){var j=(i+1)%polygon.size();dc.drawLine(polygon[i][0],polygon[i][1],polygon[j][0],polygon[j][1]);}}}
// GFC_LAYER_END

}
 function onUpdate(dc as Graphics.Dc) as Void {
  frameContext=null;
  bitmapUsed={};prepareSettings();var cfg_primary_color=settingsCache["Gfc_primary_color"] as Toybox.Lang.Number;var cfg_hour_hand_color=settingsCache["Gfc_hour_hand_color"] as Toybox.Lang.Number;var cfg_minute_hand_color=settingsCache["Gfc_minute_hand_color"] as Toybox.Lang.Number;var cfg_second_hand_color=settingsCache["Gfc_second_hand_color"] as Toybox.Lang.Number;var cfg_hr_normal_color=settingsCache["Gfc_hr_normal_color"] as Toybox.Lang.Number;var cfg_hr_warning_color=settingsCache["Gfc_hr_warning_color"] as Toybox.Lang.Number;var cfg_hr_alert_color=settingsCache["Gfc_hr_alert_color"] as Toybox.Lang.Number;var cfg_batt_normal_color=settingsCache["Gfc_batt_normal_color"] as Toybox.Lang.Number;var cfg_batt_warning_color=settingsCache["Gfc_batt_warning_color"] as Toybox.Lang.Number;var cfg_batt_alert_color=settingsCache["Gfc_batt_alert_color"] as Toybox.Lang.Number;var cfg_right_slot_source=settingsCache["Gfc_right_slot_source"] as Toybox.Lang.String;var cfg_show_seconds=settingsCache["Gfc_show_seconds"] as Toybox.Lang.Boolean;scale=dc.getWidth()/454.0;var clock=System.getClockTime();var datasteps=null;var datacalories=null;var datadistance=null;var dataheartRate=null;var databattery=null;try {var info=ActivityMonitor.getInfo();if(info!=null){if(info has :steps){datasteps=info.steps;}if(info has :calories){datacalories=info.calories;}if(info has :distance){datadistance=info.distance==null ? null : info.distance/100000.0;}}}catch(e){}try {databattery=System.getSystemStats().battery;}catch(e){}try {if((Toybox has :SensorHistory)&&(Toybox.SensorHistory has :getHeartRateHistory)){var history=SensorHistory.getHeartRateHistory({:period=>1,:order=>SensorHistory.ORDER_NEWEST_FIRST});if(history!=null){var sample=history.next();if(sample!=null){var hr=sample.data;if(hr!=null && hr>0 && hr<1.0e12){dataheartRate=hr;}}}}}catch(e){}var calendar=Gregorian.info(Time.now(),Time.FORMAT_SHORT);var dateText=["SUN","MON","TUE","WED","THU","FRI","SAT"][calendar.day_of_week-1]+" "+calendar.day.format("%d");
  var dateMonthDayWeek=calendar.month.format("%02d")+"."+calendar.day.format("%02d")+" "+["SUN","MON","TUE","WED","THU","FRI","SAT"][calendar.day_of_week-1];
  var bg=sleeping?Graphics.COLOR_BLACK:0x0B1B2B;dc.setColor(bg,bg);dc.clear();dc.setBlendMode(Graphics.BLEND_MODE_SOURCE_OVER);
  frameContext={:clock=>clock,:datasteps=>datasteps,:datacalories=>datacalories,:datadistance=>datadistance,:dataheartRate=>dataheartRate,:databattery=>databattery,:cfg_primary_color=>cfg_primary_color,:cfg_hour_hand_color=>cfg_hour_hand_color,:cfg_minute_hand_color=>cfg_minute_hand_color,:cfg_second_hand_color=>cfg_second_hand_color,:cfg_hr_normal_color=>cfg_hr_normal_color,:cfg_hr_warning_color=>cfg_hr_warning_color,:cfg_hr_alert_color=>cfg_hr_alert_color,:cfg_batt_normal_color=>cfg_batt_normal_color,:cfg_batt_warning_color=>cfg_batt_warning_color,:cfg_batt_alert_color=>cfg_batt_alert_color,:cfg_right_slot_source=>cfg_right_slot_source,:cfg_show_seconds=>cfg_show_seconds,:calendar=>calendar,:dateText=>dateText,:dateMonthDayWeek=>dateMonthDayWeek};
  if(sleeping){render_aod_0(dc);render_aod_1(dc);render_aod_2(dc);}else{render_active_0(dc);render_active_1(dc);render_active_2(dc);render_active_3(dc);render_active_4(dc);}
  frameContext=null;
  trimImages();
  if(!gfcFrameReported){System.println("GFC_RENDER_READY target=venu445mm mode="+(sleeping?"aod":"active"));gfcFrameReported=true;}
 }
}