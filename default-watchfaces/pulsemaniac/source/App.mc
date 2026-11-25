// GarminFaceCreator local generator basic-17-chalk-fonts; approximate system font mapping, no SDK fonts bundled.
import Toybox.Application;import Toybox.WatchUi;import Toybox.Graphics;import Toybox.System;import Toybox.SensorHistory;import Toybox.ActivityMonitor;import Toybox.Time;import Toybox.Time.Gregorian;
class GeneratedApp extends Application.AppBase {function initialize(){AppBase.initialize();} function getInitialView(){return [new GeneratedView()];}}
class GeneratedView extends WatchUi.WatchFace {
 var sleeping=false;var scale=1.0;
 var fonts={};function fontFor(id){if(!fonts.hasKey(id)){fonts[id]=WatchUi.loadResource(id);}return fonts[id];}
 function initialize(){WatchFace.initialize();}
 function onEnterSleep(){sleeping=true;WatchUi.requestUpdate();}
 function onExitSleep(){sleeping=false;WatchUi.requestUpdate();}
 
 function metricValid(value,battery){return value!=null && value==value && value>=0 && value<1.0e12 && (!battery || value<=100);}
 function metricText(value,source,label,unit,precision,missing){
  if(source.equals("temperature") ? (value==null || value!=value || value < -273.15 || value>1000) : !metricValid(value,source.equals("battery"))){return label+missing;}
  var text="";
  if(precision>=0){text=value.toFloat().format("%."+precision.format("%d")+"f");}
  else if(source.equals("seconds")){text=value.toNumber().format("%02d");}
  else if(source.equals("steps")){var digits=value.toNumber().format("%d");var length=digits.length();for(var i=0;i<length;i++){if(i>0 && (length-i)%3==0){text+=",";}text+=digits.substring(i,i+1);}}
  else {text=value.toFloat().format("%.6f");while(text.length()>0 && text.substring(text.length()-1,text.length()).equals("0")){text=text.substring(0,text.length()-1);}if(text.substring(text.length()-1,text.length()).equals(".")){text=text.substring(0,text.length()-1);}}
  return label+text+unit;
 }
 
 
 
 var bitmapCache={};var bitmapUsed={};
 function drawStaticImage(dc,id,x,y){bitmapUsed[id]=true;if(!bitmapCache.hasKey(id)){bitmapCache[id]=WatchUi.loadResource(id);}dc.drawBitmap(x,y,bitmapCache[id]);}
 function trimImages(){var keys=bitmapCache.keys();for(var i=0;i<keys.size();i++){if(!bitmapUsed.hasKey(keys[i])){bitmapCache.remove(keys[i]);}}}
 function px(value){return (value*scale).toNumber();}
 function onUpdate(dc as Graphics.Dc) as Void {
  bitmapUsed={};scale=dc.getWidth()/454.0;var clock=System.getClockTime();var dataheartRate=null;var databattery=null;var datasteps=null;try {var info=ActivityMonitor.getInfo();if(info!=null){if(info has :steps){datasteps=info.steps;}}}catch(e){}try {databattery=System.getSystemStats().battery;}catch(e){}try {if((Toybox has :SensorHistory)&&(Toybox.SensorHistory has :getHeartRateHistory)){var history=SensorHistory.getHeartRateHistory({:period=>1,:order=>SensorHistory.ORDER_NEWEST_FIRST});if(history!=null){var sample=history.next();if(sample!=null){var hr=sample.data;if(hr!=null && hr>0 && hr<1.0e12){dataheartRate=hr;}}}}}catch(e){}var calendar=Gregorian.info(Time.now(),Time.FORMAT_SHORT);var dateText=["SUN","MON","TUE","WED","THU","FRI","SAT"][calendar.day_of_week-1]+" "+calendar.day.format("%d");
  dc.setColor(Graphics.COLOR_BLACK,Graphics.COLOR_BLACK);dc.clear();dc.setBlendMode(Graphics.BLEND_MODE_SOURCE_OVER);
  if(sleeping){

if(true){drawStaticImage(dc,Rez.Drawables.GfcImage_pulse_layer_2,px(117),px(104));}



if(true){drawStaticImage(dc,Rez.Drawables.GfcImage_pulse_layer_6,px(198),px(189));}
if(true){{var value=dataheartRate;dc.setFill(Graphics.createColor(255,(0x888888>>16)&255,(0x888888>>8)&255,0x888888&255));dc.setStroke(Graphics.createColor(255,(0x888888>>16)&255,(0x888888>>8)&255,0x888888&255));dc.setColor(0x888888,Graphics.COLOR_TRANSPARENT);dc.drawText(px(227),px(216),fontFor(Rez.Fonts.GfcChalkLatin18),metricText(value,"heartRate","","",0,"--"),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}













if(true){dc.setFill(Graphics.createColor(255,(0x888888>>16)&255,(0x888888>>8)&255,0x888888&255));dc.setStroke(Graphics.createColor(255,(0x888888>>16)&255,(0x888888>>8)&255,0x888888&255));dc.setColor(0x888888,Graphics.COLOR_TRANSPARENT);dc.drawText(px(227),px(385.5),fontFor(Rez.Fonts.GfcChalkLatin54),clock.hour.format("%02d")+":"+clock.min.format("%02d"),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}else{if(true){drawStaticImage(dc,Rez.Drawables.GfcImage_pulse_layer_1,px(0),px(0));}
if(true){drawStaticImage(dc,Rez.Drawables.GfcImage_pulse_chalk_ring,px(11),px(11));}
if(((dataheartRate!=null && dataheartRate==dataheartRate && dataheartRate>0 && dataheartRate<1.0e12) ? (true && dataheartRate<100) : true)){drawStaticImage(dc,Rez.Drawables.GfcImage_pulse_layer_2,px(117),px(104));}
if(((dataheartRate!=null && dataheartRate==dataheartRate && dataheartRate>0 && dataheartRate<1.0e12) ? (dataheartRate>=100 && dataheartRate<120) : false)){drawStaticImage(dc,Rez.Drawables.GfcImage_pulse_layer_3,px(117),px(104));}
if(((dataheartRate!=null && dataheartRate==dataheartRate && dataheartRate>0 && dataheartRate<1.0e12) ? (dataheartRate>=120 && dataheartRate<=140) : false)){drawStaticImage(dc,Rez.Drawables.GfcImage_pulse_layer_4,px(117),px(104));}
if(((dataheartRate!=null && dataheartRate==dataheartRate && dataheartRate>0 && dataheartRate<1.0e12) ? (dataheartRate>140 && true) : false)){drawStaticImage(dc,Rez.Drawables.GfcImage_pulse_layer_5,px(117),px(104));}
if(((dataheartRate!=null && dataheartRate==dataheartRate && dataheartRate>0 && dataheartRate<1.0e12) ? (true && dataheartRate<100) : true)){drawStaticImage(dc,Rez.Drawables.GfcImage_pulse_layer_6,px(198),px(189));}
if(((dataheartRate!=null && dataheartRate==dataheartRate && dataheartRate>0 && dataheartRate<1.0e12) ? (true && dataheartRate<100) : true)){{var value=dataheartRate;dc.setFill(Graphics.createColor(255,(0xb8c0cc>>16)&255,(0xb8c0cc>>8)&255,0xb8c0cc&255));dc.setStroke(Graphics.createColor(255,(0xb8c0cc>>16)&255,(0xb8c0cc>>8)&255,0xb8c0cc&255));dc.setColor(0xb8c0cc,Graphics.COLOR_TRANSPARENT);dc.drawText(px(227),px(216),fontFor(Rez.Fonts.GfcChalkLatin18),metricText(value,"heartRate","","",0,"--"),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}
if(((dataheartRate!=null && dataheartRate==dataheartRate && dataheartRate>0 && dataheartRate<1.0e12) ? (dataheartRate>=100 && dataheartRate<120) : false)){drawStaticImage(dc,Rez.Drawables.GfcImage_pulse_layer_8,px(198),px(189));}
if(((dataheartRate!=null && dataheartRate==dataheartRate && dataheartRate>0 && dataheartRate<1.0e12) ? (dataheartRate>=100 && dataheartRate<120) : false)){{var value=dataheartRate;dc.setFill(Graphics.createColor(255,(0xe8dfb5>>16)&255,(0xe8dfb5>>8)&255,0xe8dfb5&255));dc.setStroke(Graphics.createColor(255,(0xe8dfb5>>16)&255,(0xe8dfb5>>8)&255,0xe8dfb5&255));dc.setColor(0xe8dfb5,Graphics.COLOR_TRANSPARENT);dc.drawText(px(227),px(216),fontFor(Rez.Fonts.GfcChalkLatin18),metricText(value,"heartRate","","",0,"--"),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}
if(((dataheartRate!=null && dataheartRate==dataheartRate && dataheartRate>0 && dataheartRate<1.0e12) ? (dataheartRate>=120 && dataheartRate<=140) : false)){drawStaticImage(dc,Rez.Drawables.GfcImage_pulse_layer_10,px(198),px(189));}
if(((dataheartRate!=null && dataheartRate==dataheartRate && dataheartRate>0 && dataheartRate<1.0e12) ? (dataheartRate>=120 && dataheartRate<=140) : false)){{var value=dataheartRate;dc.setFill(Graphics.createColor(255,(0xffc107>>16)&255,(0xffc107>>8)&255,0xffc107&255));dc.setStroke(Graphics.createColor(255,(0xffc107>>16)&255,(0xffc107>>8)&255,0xffc107&255));dc.setColor(0xffc107,Graphics.COLOR_TRANSPARENT);dc.drawText(px(227),px(216),fontFor(Rez.Fonts.GfcChalkLatin18),metricText(value,"heartRate","","",0,"--"),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}
if(((dataheartRate!=null && dataheartRate==dataheartRate && dataheartRate>0 && dataheartRate<1.0e12) ? (dataheartRate>140 && true) : false)){drawStaticImage(dc,Rez.Drawables.GfcImage_pulse_layer_12,px(198),px(189));}
if(((dataheartRate!=null && dataheartRate==dataheartRate && dataheartRate>0 && dataheartRate<1.0e12) ? (dataheartRate>140 && true) : false)){{var value=dataheartRate;dc.setFill(Graphics.createColor(255,(0xf44336>>16)&255,(0xf44336>>8)&255,0xf44336&255));dc.setStroke(Graphics.createColor(255,(0xf44336>>16)&255,(0xf44336>>8)&255,0xf44336&255));dc.setColor(0xf44336,Graphics.COLOR_TRANSPARENT);dc.drawText(px(227),px(216),fontFor(Rez.Fonts.GfcChalkLatin18),metricText(value,"heartRate","","",0,"--"),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}
if(((dataheartRate!=null && dataheartRate==dataheartRate && dataheartRate>0 && dataheartRate<1.0e12) ? (dataheartRate>140 && true) : false)){dc.setFill(Graphics.createColor(255,(0xe8ecf1>>16)&255,(0xe8ecf1>>8)&255,0xe8ecf1&255));dc.setStroke(Graphics.createColor(255,(0xe8ecf1>>16)&255,(0xe8ecf1>>8)&255,0xe8ecf1&255));dc.setColor(0xe8ecf1,Graphics.COLOR_TRANSPARENT);dc.drawText(px(75),px(167),fontFor(Rez.Fonts.GfcChalkHan30),"彻",Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}
if(((dataheartRate!=null && dataheartRate==dataheartRate && dataheartRate>0 && dataheartRate<1.0e12) ? (dataheartRate>140 && true) : false)){dc.setFill(Graphics.createColor(255,(0xe8ecf1>>16)&255,(0xe8ecf1>>8)&255,0xe8ecf1&255));dc.setStroke(Graphics.createColor(255,(0xe8ecf1>>16)&255,(0xe8ecf1>>8)&255,0xe8ecf1&255));dc.setColor(0xe8ecf1,Graphics.COLOR_TRANSPARENT);dc.drawText(px(379),px(167),fontFor(Rez.Fonts.GfcChalkHan30),"底",Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}
if(((dataheartRate!=null && dataheartRate==dataheartRate && dataheartRate>0 && dataheartRate<1.0e12) ? (dataheartRate>140 && true) : false)){dc.setFill(Graphics.createColor(255,(0xe8ecf1>>16)&255,(0xe8ecf1>>8)&255,0xe8ecf1&255));dc.setStroke(Graphics.createColor(255,(0xe8ecf1>>16)&255,(0xe8ecf1>>8)&255,0xe8ecf1&255));dc.setColor(0xe8ecf1,Graphics.COLOR_TRANSPARENT);dc.drawText(px(78),px(283),fontFor(Rez.Fonts.GfcChalkHan30),"疯",Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}
if(((dataheartRate!=null && dataheartRate==dataheartRate && dataheartRate>0 && dataheartRate<1.0e12) ? (dataheartRate>140 && true) : false)){dc.setFill(Graphics.createColor(255,(0xe8ecf1>>16)&255,(0xe8ecf1>>8)&255,0xe8ecf1&255));dc.setStroke(Graphics.createColor(255,(0xe8ecf1>>16)&255,(0xe8ecf1>>8)&255,0xe8ecf1&255));dc.setColor(0xe8ecf1,Graphics.COLOR_TRANSPARENT);dc.drawText(px(376),px(283),fontFor(Rez.Fonts.GfcChalkHan30),"狂",Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}
if(true){{var value=databattery;dc.setFill(Graphics.createColor(255,(0x8A93A0>>16)&255,(0x8A93A0>>8)&255,0x8A93A0&255));dc.setStroke(Graphics.createColor(255,(0x8A93A0>>16)&255,(0x8A93A0>>8)&255,0x8A93A0&255));dc.setColor(0x8A93A0,Graphics.COLOR_TRANSPARENT);dc.drawText(px(227),px(64.5),fontFor(Rez.Fonts.GfcChalkLatin16),metricText(value,"battery","BAT ","%",0,"--"),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}
if(true){{var value=datasteps;dc.setFill(Graphics.createColor(255,(0x8A93A0>>16)&255,(0x8A93A0>>8)&255,0x8A93A0&255));dc.setStroke(Graphics.createColor(255,(0x8A93A0>>16)&255,(0x8A93A0>>8)&255,0x8A93A0&255));dc.setColor(0x8A93A0,Graphics.COLOR_TRANSPARENT);dc.drawText(px(227),px(91.5),fontFor(Rez.Fonts.GfcChalkLatin16),metricText(value,"steps","STEPS ","",0,"--"),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}
if(true){dc.setFill(Graphics.createColor(255,(0x8A93A0>>16)&255,(0x8A93A0>>8)&255,0x8A93A0&255));dc.setStroke(Graphics.createColor(255,(0x8A93A0>>16)&255,(0x8A93A0>>8)&255,0x8A93A0&255));dc.setColor(0x8A93A0,Graphics.COLOR_TRANSPARENT);dc.drawText(px(227),px(330.5),fontFor(Rez.Fonts.GfcChalkLatin16),dateText,Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}
if(true){dc.setFill(Graphics.createColor(255,(0xE8ECF1>>16)&255,(0xE8ECF1>>8)&255,0xE8ECF1&255));dc.setStroke(Graphics.createColor(255,(0xE8ECF1>>16)&255,(0xE8ECF1>>8)&255,0xE8ECF1&255));dc.setColor(0xE8ECF1,Graphics.COLOR_TRANSPARENT);dc.drawText(px(227),px(385.5),fontFor(Rez.Fonts.GfcChalkLatin62),clock.hour.format("%02d")+":"+clock.min.format("%02d"),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}
  trimImages();
 }
}