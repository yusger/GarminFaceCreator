// GarminFaceCreator local generator basic-24-convex-polygon; approximate system font mapping, no SDK fonts bundled.
import Toybox.Application;import Toybox.WatchUi;import Toybox.Graphics;import Toybox.System;import Toybox.SensorHistory;import Toybox.ActivityMonitor;import Toybox.Time;import Toybox.Time.Gregorian;import Toybox.Math;
class GeneratedApp extends Application.AppBase {var mainView=null;function initialize(){AppBase.initialize();} function getInitialView(){mainView=new GeneratedView();return [mainView];}}
class GeneratedView extends WatchUi.WatchFace {
 var sleeping=false;var scale=1.0;
 function mixTextInk(ink,alpha,bg){var r=(((ink>>16)&255)*alpha+((bg>>16)&255)*(255-alpha))/255;var g=(((ink>>8)&255)*alpha+((bg>>8)&255)*(255-alpha))/255;var b=((ink&255)*alpha+(bg&255)*(255-alpha))/255;return (r.toNumber()<<16)|(g.toNumber()<<8)|b.toNumber();}
 
 
 var fonts={};function fontFor(id){if(!fonts.hasKey(id)){fonts[id]=WatchUi.loadResource(id);}return fonts[id];}
 function initialize(){WatchFace.initialize();}
 function onEnterSleep(){sleeping=true;WatchUi.requestUpdate();}
 function onExitSleep(){sleeping=false;WatchUi.requestUpdate();}
 
 function metricValid(value,battery){return value!=null && value==value && value>=0 && value<1.0e12 && (!battery || value<=100);}
 function metricText(value,source,label,unit,precision,missing,group){
  if(source.equals("temperature") ? (value==null || value!=value || value < -273.15 || value>1000) : !metricValid(value,source.equals("battery"))){return label+missing;}
  var text="";
  if(precision>=0){text=value.toFloat().format("%."+precision.format("%d")+"f");}
  else if(source.equals("seconds")){text=value.toNumber().format("%02d");}
  else if(source.equals("steps")){var digits=value.toNumber().format("%d");var length=digits.length();for(var i=0;i<length;i++){if(i>0 && (length-i)%3==0){text+=",";}text+=digits.substring(i,i+1);}}
  else {text=value.toFloat().format("%.6f");while(text.length()>0 && text.substring(text.length()-1,text.length()).equals("0")){text=text.substring(0,text.length()-1);}if(text.substring(text.length()-1,text.length()).equals(".")){text=text.substring(0,text.length()-1);}}
  if(group && !source.equals("steps")){var cut=text.length();for(var c=0;c<text.length();c++){if(text.substring(c,c+1).equals(".")){cut=c;break;}}var grouped="";for(var k=0;k<text.length();k++){if(k>0 && k<cut && (cut-k)%3==0 && !text.substring(k-1,k).equals("-")){grouped+=",";}grouped+=text.substring(k,k+1);}text=grouped;}
  if(group && source.equals("steps") && precision>=0){var grouped="";for(var k=0;k<text.length();k++){if(k>0 && (text.length()-k)%3==0){grouped+=",";}grouped+=text.substring(k,k+1);}text=grouped;}
  return label+text+unit;
 }
 
 
 
 var bitmapCache={};var bitmapUsed={};
 function drawStaticImage(dc,id,x,y){bitmapUsed[id]=true;if(!bitmapCache.hasKey(id)){bitmapCache[id]=WatchUi.loadResource(id);}dc.drawBitmap(x,y,bitmapCache[id]);}
 function drawBitmapHand(dc,clock,id,kind,x,y,w,h,pvx,pvy,low,tint){bitmapUsed[id]=true;if(!bitmapCache.hasKey(id)){bitmapCache[id]=WatchUi.loadResource(id);}var bitmap=bitmapCache[id];var cx=w*pvx;var cy=h*pvy;var r=cx;if(w-cx<r){r=w-cx;}if(cy<r){r=cy;}if(h-cy<r){r=h-cy;}if(r<=0){return;}var sec=low?0:clock.sec;var deg=kind==0?((clock.hour%12)+clock.min/60.0+sec/3600.0)*30:(kind==1?(clock.min+sec/60.0)*6:sec*6);var a=deg*Math.PI/180.0;var transform=new Graphics.AffineTransform();transform.translate((px(x+cx)*1.0),(px(y+cy)*1.0));transform.rotate(a);transform.scale(px(r*2)*1.0/bitmap.getWidth(),px(r*2)*1.0/bitmap.getHeight());transform.translate(-bitmap.getWidth()/2.0,-bitmap.getHeight()/2.0);var options={:transform=>transform};if(low){options[:tintColor]=tint;}dc.drawBitmap2(0,0,bitmap,options);}
 function trimImages(){var keys=bitmapCache.keys();for(var i=0;i<keys.size();i++){if(!bitmapUsed.hasKey(keys[i])){bitmapCache.remove(keys[i]);}}}
 
 function px(value){return (value*scale).toNumber();}
 function onUpdate(dc as Graphics.Dc) as Void {
  bitmapUsed={};scale=dc.getWidth()/454.0;var clock=System.getClockTime();var dataheartRate=null;var databattery=null;var datasteps=null;try {var info=ActivityMonitor.getInfo();if(info!=null){if(info has :steps){datasteps=info.steps;}}}catch(e){}try {databattery=System.getSystemStats().battery;}catch(e){}try {if((Toybox has :SensorHistory)&&(Toybox.SensorHistory has :getHeartRateHistory)){var history=SensorHistory.getHeartRateHistory({:period=>1,:order=>SensorHistory.ORDER_NEWEST_FIRST});if(history!=null){var sample=history.next();if(sample!=null){var hr=sample.data;if(hr!=null && hr>0 && hr<1.0e12){dataheartRate=hr;}}}}}catch(e){}var calendar=Gregorian.info(Time.now(),Time.FORMAT_SHORT);var dateText=["SUN","MON","TUE","WED","THU","FRI","SAT"][calendar.day_of_week-1]+" "+calendar.day.format("%d");
  
  var bg=sleeping?Graphics.COLOR_BLACK:0x000000;dc.setColor(bg,bg);dc.clear();dc.setBlendMode(Graphics.BLEND_MODE_SOURCE_OVER);
  if(sleeping){

if(true){drawStaticImage(dc,Rez.Drawables.GfcImage_pulse_layer_2,px(117),px(104));}



if(true){drawStaticImage(dc,Rez.Drawables.GfcImage_pulse_layer_6,px(198),px(189));}
if(true){{var value=dataheartRate;dc.setColor(0x888888,Graphics.COLOR_TRANSPARENT);dc.setFill(Graphics.createColor(255,(0x888888>>16)&255,(0x888888>>8)&255,0x888888&255));dc.setStroke(Graphics.createColor(255,(0x888888>>16)&255,(0x888888>>8)&255,0x888888&255));dc.drawText(px(227),px(216),fontFor(Rez.Fonts.GfcChalkLatin18),metricText(value,"heartRate","","",0,"--",false),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}













if(true){dc.setColor(0x888888,Graphics.COLOR_TRANSPARENT);dc.setFill(Graphics.createColor(255,(0x888888>>16)&255,(0x888888>>8)&255,0x888888&255));dc.setStroke(Graphics.createColor(255,(0x888888>>16)&255,(0x888888>>8)&255,0x888888&255));dc.drawText(px(227),px(369.5),fontFor(Rez.Fonts.GfcChalkLatin54),clock.hour.format("%02d")+":"+clock.min.format("%02d"),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}else{if(true){drawStaticImage(dc,Rez.Drawables.GfcImage_pulse_layer_1,px(0),px(0));}
if(true){drawStaticImage(dc,Rez.Drawables.GfcImage_pulse_chalk_ring,px(11),px(11));}
if(((dataheartRate!=null && dataheartRate==dataheartRate && dataheartRate>0 && dataheartRate<1.0e12) ? (true && dataheartRate<100) : true)){drawStaticImage(dc,Rez.Drawables.GfcImage_pulse_layer_2,px(117),px(104));}
if(((dataheartRate!=null && dataheartRate==dataheartRate && dataheartRate>0 && dataheartRate<1.0e12) ? (dataheartRate>=100 && dataheartRate<120) : false)){drawStaticImage(dc,Rez.Drawables.GfcImage_pulse_layer_3,px(117),px(104));}
if(((dataheartRate!=null && dataheartRate==dataheartRate && dataheartRate>0 && dataheartRate<1.0e12) ? (dataheartRate>=120 && dataheartRate<=140) : false)){drawStaticImage(dc,Rez.Drawables.GfcImage_pulse_layer_4,px(117),px(104));}
if(((dataheartRate!=null && dataheartRate==dataheartRate && dataheartRate>0 && dataheartRate<1.0e12) ? (dataheartRate>140 && true) : false)){drawStaticImage(dc,Rez.Drawables.GfcImage_pulse_layer_5,px(117),px(104));}
if(((dataheartRate!=null && dataheartRate==dataheartRate && dataheartRate>0 && dataheartRate<1.0e12) ? (true && dataheartRate<100) : true)){drawStaticImage(dc,Rez.Drawables.GfcImage_pulse_layer_6,px(198),px(189));}
if(((dataheartRate!=null && dataheartRate==dataheartRate && dataheartRate>0 && dataheartRate<1.0e12) ? (true && dataheartRate<100) : true)){{var value=dataheartRate;dc.setColor(0xb8c0cc,Graphics.COLOR_TRANSPARENT);dc.setFill(Graphics.createColor(255,(0xb8c0cc>>16)&255,(0xb8c0cc>>8)&255,0xb8c0cc&255));dc.setStroke(Graphics.createColor(255,(0xb8c0cc>>16)&255,(0xb8c0cc>>8)&255,0xb8c0cc&255));dc.drawText(px(227),px(216),fontFor(Rez.Fonts.GfcChalkLatin18),metricText(value,"heartRate","","",0,"--",false),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}
if(((dataheartRate!=null && dataheartRate==dataheartRate && dataheartRate>0 && dataheartRate<1.0e12) ? (dataheartRate>=100 && dataheartRate<120) : false)){drawStaticImage(dc,Rez.Drawables.GfcImage_pulse_layer_8,px(198),px(189));}
if(((dataheartRate!=null && dataheartRate==dataheartRate && dataheartRate>0 && dataheartRate<1.0e12) ? (dataheartRate>=100 && dataheartRate<120) : false)){{var value=dataheartRate;dc.setColor(0xe8dfb5,Graphics.COLOR_TRANSPARENT);dc.setFill(Graphics.createColor(255,(0xe8dfb5>>16)&255,(0xe8dfb5>>8)&255,0xe8dfb5&255));dc.setStroke(Graphics.createColor(255,(0xe8dfb5>>16)&255,(0xe8dfb5>>8)&255,0xe8dfb5&255));dc.drawText(px(227),px(216),fontFor(Rez.Fonts.GfcChalkLatin18),metricText(value,"heartRate","","",0,"--",false),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}
if(((dataheartRate!=null && dataheartRate==dataheartRate && dataheartRate>0 && dataheartRate<1.0e12) ? (dataheartRate>=120 && dataheartRate<=140) : false)){drawStaticImage(dc,Rez.Drawables.GfcImage_pulse_layer_10,px(198),px(189));}
if(((dataheartRate!=null && dataheartRate==dataheartRate && dataheartRate>0 && dataheartRate<1.0e12) ? (dataheartRate>=120 && dataheartRate<=140) : false)){{var value=dataheartRate;dc.setColor(0xffc107,Graphics.COLOR_TRANSPARENT);dc.setFill(Graphics.createColor(255,(0xffc107>>16)&255,(0xffc107>>8)&255,0xffc107&255));dc.setStroke(Graphics.createColor(255,(0xffc107>>16)&255,(0xffc107>>8)&255,0xffc107&255));dc.drawText(px(227),px(216),fontFor(Rez.Fonts.GfcChalkLatin18),metricText(value,"heartRate","","",0,"--",false),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}
if(((dataheartRate!=null && dataheartRate==dataheartRate && dataheartRate>0 && dataheartRate<1.0e12) ? (dataheartRate>140 && true) : false)){drawStaticImage(dc,Rez.Drawables.GfcImage_pulse_layer_12,px(198),px(189));}
if(((dataheartRate!=null && dataheartRate==dataheartRate && dataheartRate>0 && dataheartRate<1.0e12) ? (dataheartRate>140 && true) : false)){{var value=dataheartRate;dc.setColor(0xf44336,Graphics.COLOR_TRANSPARENT);dc.setFill(Graphics.createColor(255,(0xf44336>>16)&255,(0xf44336>>8)&255,0xf44336&255));dc.setStroke(Graphics.createColor(255,(0xf44336>>16)&255,(0xf44336>>8)&255,0xf44336&255));dc.drawText(px(227),px(216),fontFor(Rez.Fonts.GfcChalkLatin18),metricText(value,"heartRate","","",0,"--",false),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}
if(((dataheartRate!=null && dataheartRate==dataheartRate && dataheartRate>0 && dataheartRate<1.0e12) ? (dataheartRate>140 && true) : false)){dc.setColor(0xe8ecf1,Graphics.COLOR_TRANSPARENT);dc.setFill(Graphics.createColor(255,(0xe8ecf1>>16)&255,(0xe8ecf1>>8)&255,0xe8ecf1&255));dc.setStroke(Graphics.createColor(255,(0xe8ecf1>>16)&255,(0xe8ecf1>>8)&255,0xe8ecf1&255));dc.drawText(px(75),px(167),fontFor(Rez.Fonts.GfcChalkHan30),"彻",Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}
if(((dataheartRate!=null && dataheartRate==dataheartRate && dataheartRate>0 && dataheartRate<1.0e12) ? (dataheartRate>140 && true) : false)){dc.setColor(0xe8ecf1,Graphics.COLOR_TRANSPARENT);dc.setFill(Graphics.createColor(255,(0xe8ecf1>>16)&255,(0xe8ecf1>>8)&255,0xe8ecf1&255));dc.setStroke(Graphics.createColor(255,(0xe8ecf1>>16)&255,(0xe8ecf1>>8)&255,0xe8ecf1&255));dc.drawText(px(379),px(167),fontFor(Rez.Fonts.GfcChalkHan30),"底",Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}
if(((dataheartRate!=null && dataheartRate==dataheartRate && dataheartRate>0 && dataheartRate<1.0e12) ? (dataheartRate>140 && true) : false)){dc.setColor(0xe8ecf1,Graphics.COLOR_TRANSPARENT);dc.setFill(Graphics.createColor(255,(0xe8ecf1>>16)&255,(0xe8ecf1>>8)&255,0xe8ecf1&255));dc.setStroke(Graphics.createColor(255,(0xe8ecf1>>16)&255,(0xe8ecf1>>8)&255,0xe8ecf1&255));dc.drawText(px(78),px(283),fontFor(Rez.Fonts.GfcChalkHan30),"疯",Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}
if(((dataheartRate!=null && dataheartRate==dataheartRate && dataheartRate>0 && dataheartRate<1.0e12) ? (dataheartRate>140 && true) : false)){dc.setColor(0xe8ecf1,Graphics.COLOR_TRANSPARENT);dc.setFill(Graphics.createColor(255,(0xe8ecf1>>16)&255,(0xe8ecf1>>8)&255,0xe8ecf1&255));dc.setStroke(Graphics.createColor(255,(0xe8ecf1>>16)&255,(0xe8ecf1>>8)&255,0xe8ecf1&255));dc.drawText(px(376),px(283),fontFor(Rez.Fonts.GfcChalkHan30),"狂",Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}
if(true){{var value=databattery;dc.setColor(0x8A93A0,Graphics.COLOR_TRANSPARENT);dc.setFill(Graphics.createColor(255,(0x8A93A0>>16)&255,(0x8A93A0>>8)&255,0x8A93A0&255));dc.setStroke(Graphics.createColor(255,(0x8A93A0>>16)&255,(0x8A93A0>>8)&255,0x8A93A0&255));dc.drawText(px(227),px(71.5),fontFor(Rez.Fonts.GfcChalkLatin16),metricText(value,"battery","BAT ","%",0,"--",false),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}
if(true){{var value=datasteps;dc.setColor(0x8A93A0,Graphics.COLOR_TRANSPARENT);dc.setFill(Graphics.createColor(255,(0x8A93A0>>16)&255,(0x8A93A0>>8)&255,0x8A93A0&255));dc.setStroke(Graphics.createColor(255,(0x8A93A0>>16)&255,(0x8A93A0>>8)&255,0x8A93A0&255));dc.drawText(px(227),px(97.5),fontFor(Rez.Fonts.GfcChalkLatin16),metricText(value,"steps","STEPS ","",0,"--",false),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}
if(true){dc.setColor(0x8A93A0,Graphics.COLOR_TRANSPARENT);dc.setFill(Graphics.createColor(255,(0x8A93A0>>16)&255,(0x8A93A0>>8)&255,0x8A93A0&255));dc.setStroke(Graphics.createColor(255,(0x8A93A0>>16)&255,(0x8A93A0>>8)&255,0x8A93A0&255));dc.drawText(px(227),px(330.5),fontFor(Rez.Fonts.GfcChalkLatin16),dateText,Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}
if(true){dc.setColor(0xE8ECF1,Graphics.COLOR_TRANSPARENT);dc.setFill(Graphics.createColor(255,(0xE8ECF1>>16)&255,(0xE8ECF1>>8)&255,0xE8ECF1&255));dc.setStroke(Graphics.createColor(255,(0xE8ECF1>>16)&255,(0xE8ECF1>>8)&255,0xE8ECF1&255));dc.drawText(px(227),px(369.5),fontFor(Rez.Fonts.GfcChalkLatin62),clock.hour.format("%02d")+":"+clock.min.format("%02d"),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}
  trimImages();
 }
}