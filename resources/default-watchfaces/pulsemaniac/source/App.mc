// GarminFaceCreator local generator basic-68-library-icon-masks; approximate system font mapping, no SDK fonts bundled.
// Target venu445mm; device metadata sdk-metadata-1-7722889381ba; package eddc2840754f6d29c6c9a3ede43befdaadd25a09; compiler SHA256 1aa85d1594c28318b66e6cdc656d4f5e7c782c81fbf488bd44a4b7c2439feaf4. Hardware/AOD/power unverified.
import Toybox.Application;import Toybox.WatchUi;import Toybox.Graphics;import Toybox.System;import Toybox.SensorHistory;import Toybox.ActivityMonitor;import Toybox.Time;import Toybox.Time.Gregorian;import Toybox.Math;
class GeneratedApp extends Application.AppBase {var mainView=null;function initialize(){AppBase.initialize();} function getInitialView(){mainView=new GeneratedView();return [mainView];}}
class GeneratedView extends WatchUi.WatchFace {
 var gfcMetricCache={};
 

 var sleeping=false;var scale=1.0;var frameContext=null;var gfcFrameReported=false;
 function mixTextInk(ink,alpha,bg){var r=(((ink>>16)&255)*alpha+((bg>>16)&255)*(255-alpha))/255;var g=(((ink>>8)&255)*alpha+((bg>>8)&255)*(255-alpha))/255;var b=((ink&255)*alpha+(bg&255)*(255-alpha))/255;return (r.toNumber()<<16)|(g.toNumber()<<8)|b.toNumber();}
 
 
 
 function textPaint(dc,ink,alpha){dc.setColor(ink,Graphics.COLOR_TRANSPARENT);dc.setFill(Graphics.createColor(alpha,(ink>>16)&255,(ink>>8)&255,ink&255));dc.setStroke(Graphics.createColor(alpha,(ink>>16)&255,(ink>>8)&255,ink&255));if(alpha==255){dc.setColor(ink,Graphics.COLOR_TRANSPARENT);}}
 function fontFor(id){return WatchUi.loadResource(id);}

 function initialize(){WatchFace.initialize();}
 function onEnterSleep(){sleeping=true;WatchUi.requestUpdate();}
 function onExitSleep(){sleeping=false;WatchUi.requestUpdate();}
 
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
 
 
 
 
 var bitmapCache={};var bitmapUsed={};
 function drawStaticImage(dc,id,x,y){bitmapUsed[id]=true;if(!bitmapCache.hasKey(id)){bitmapCache[id]=WatchUi.loadResource(id);}dc.drawBitmap(x,y,bitmapCache[id]);}
 function drawBitmapHand(dc,clock,id,kind,x,y,w,h,pvx,pvy,low,tint){bitmapUsed[id]=true;if(!bitmapCache.hasKey(id)){bitmapCache[id]=WatchUi.loadResource(id);}var bitmap=bitmapCache[id];var cx=w*pvx;var cy=h*pvy;var r=cx;if(w-cx<r){r=w-cx;}if(cy<r){r=cy;}if(h-cy<r){r=h-cy;}if(r<=0){return;}var sec=low?0:clock.sec;var deg=kind==0?((clock.hour%12)+clock.min/60.0+sec/3600.0)*30:(kind==1?(clock.min+sec/60.0)*6:sec*6);var a=deg*Math.PI/180.0;var transform=new Graphics.AffineTransform();transform.translate((px(x+cx)*1.0),(px(y+cy)*1.0));transform.rotate(a);transform.scale(px(r*2)*1.0/bitmap.getWidth(),px(r*2)*1.0/bitmap.getHeight());transform.translate(-bitmap.getWidth()/2.0,-bitmap.getHeight()/2.0);var options={:transform=>transform};if(low){options[:tintColor]=tint;}dc.drawBitmap2(0,0,bitmap,options);}
 function trimImages(){var keys=bitmapCache.keys();for(var i=0;i<keys.size();i++){if(!bitmapUsed.hasKey(keys[i])){bitmapCache.remove(keys[i]);}}}
 
 
 function px(value){return (value*scale).toNumber();}
 function render_active_0(dc as Graphics.Dc) as Void {var dataheartRate=frameContext[:dataheartRate];

// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22pulse-layer-1%22%2C%22partId%22%3A%22pulse-layer-1%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22active%22%7D
if(true){drawStaticImage(dc,Rez.Drawables.GfcImage_pulse_layer_1,px(0),px(0));}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22pulse-chalk-ring%22%2C%22partId%22%3A%22pulse-chalk-ring%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22active%22%7D
if(true){drawStaticImage(dc,Rez.Drawables.GfcImage_pulse_chalk_ring,px(11),px(11));}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22pulse-layer-2%22%2C%22partId%22%3A%22pulse-layer-2%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22active%22%7D
if(((dataheartRate!=null && dataheartRate==dataheartRate && dataheartRate>0 && dataheartRate<1.0e12) ? (true && dataheartRate<100) : true)){drawStaticImage(dc,Rez.Drawables.GfcImage_pulse_layer_2,px(117),px(104));}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22pulse-layer-3%22%2C%22partId%22%3A%22pulse-layer-3%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22active%22%7D
if(((dataheartRate!=null && dataheartRate==dataheartRate && dataheartRate>0 && dataheartRate<1.0e12) ? (dataheartRate>=100 && dataheartRate<120) : false)){drawStaticImage(dc,Rez.Drawables.GfcImage_pulse_layer_3,px(117),px(104));}
// GFC_LAYER_END

}
function render_active_1(dc as Graphics.Dc) as Void {var dataheartRate=frameContext[:dataheartRate];

// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22pulse-layer-4%22%2C%22partId%22%3A%22pulse-layer-4%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22active%22%7D
if(((dataheartRate!=null && dataheartRate==dataheartRate && dataheartRate>0 && dataheartRate<1.0e12) ? (dataheartRate>=120 && dataheartRate<=140) : false)){drawStaticImage(dc,Rez.Drawables.GfcImage_pulse_layer_4,px(117),px(104));}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22pulse-layer-5%22%2C%22partId%22%3A%22pulse-layer-5%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22active%22%7D
if(((dataheartRate!=null && dataheartRate==dataheartRate && dataheartRate>0 && dataheartRate<1.0e12) ? (dataheartRate>140 && true) : false)){drawStaticImage(dc,Rez.Drawables.GfcImage_pulse_layer_5,px(117),px(104));}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22pulse-layer-6%22%2C%22partId%22%3A%22pulse-layer-6%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22active%22%7D
if(((dataheartRate!=null && dataheartRate==dataheartRate && dataheartRate>0 && dataheartRate<1.0e12) ? (true && dataheartRate<100) : true)){drawStaticImage(dc,Rez.Drawables.GfcImage_pulse_layer_6,px(198),px(189));}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22pulse-layer-7%22%2C%22partId%22%3A%22pulse-layer-7%22%2C%22capabilityId%22%3A%22core.metric%22%2C%22mode%22%3A%22active%22%7D
if(((dataheartRate!=null && dataheartRate==dataheartRate && dataheartRate>0 && dataheartRate<1.0e12) ? (true && dataheartRate<100) : true)){{var value=dataheartRate;textPaint(dc,0xb8c0cc,255);dc.drawText(px(227),px(216),fontFor(Rez.Fonts.GfcChalkLatin18),metricText(value,"heartRate","","",0,"--",false),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}
// GFC_LAYER_END

}
function render_active_2(dc as Graphics.Dc) as Void {var dataheartRate=frameContext[:dataheartRate];

// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22pulse-layer-8%22%2C%22partId%22%3A%22pulse-layer-8%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22active%22%7D
if(((dataheartRate!=null && dataheartRate==dataheartRate && dataheartRate>0 && dataheartRate<1.0e12) ? (dataheartRate>=100 && dataheartRate<120) : false)){drawStaticImage(dc,Rez.Drawables.GfcImage_pulse_layer_8,px(198),px(189));}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22pulse-layer-9%22%2C%22partId%22%3A%22pulse-layer-9%22%2C%22capabilityId%22%3A%22core.metric%22%2C%22mode%22%3A%22active%22%7D
if(((dataheartRate!=null && dataheartRate==dataheartRate && dataheartRate>0 && dataheartRate<1.0e12) ? (dataheartRate>=100 && dataheartRate<120) : false)){{var value=dataheartRate;textPaint(dc,0xe8dfb5,255);dc.drawText(px(227),px(216),fontFor(Rez.Fonts.GfcChalkLatin18),metricText(value,"heartRate","","",0,"--",false),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22pulse-layer-10%22%2C%22partId%22%3A%22pulse-layer-10%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22active%22%7D
if(((dataheartRate!=null && dataheartRate==dataheartRate && dataheartRate>0 && dataheartRate<1.0e12) ? (dataheartRate>=120 && dataheartRate<=140) : false)){drawStaticImage(dc,Rez.Drawables.GfcImage_pulse_layer_10,px(198),px(189));}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22pulse-layer-11%22%2C%22partId%22%3A%22pulse-layer-11%22%2C%22capabilityId%22%3A%22core.metric%22%2C%22mode%22%3A%22active%22%7D
if(((dataheartRate!=null && dataheartRate==dataheartRate && dataheartRate>0 && dataheartRate<1.0e12) ? (dataheartRate>=120 && dataheartRate<=140) : false)){{var value=dataheartRate;textPaint(dc,0xffc107,255);dc.drawText(px(227),px(216),fontFor(Rez.Fonts.GfcChalkLatin18),metricText(value,"heartRate","","",0,"--",false),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}
// GFC_LAYER_END

}
function render_active_3(dc as Graphics.Dc) as Void {var dataheartRate=frameContext[:dataheartRate];

// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22pulse-layer-12%22%2C%22partId%22%3A%22pulse-layer-12%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22active%22%7D
if(((dataheartRate!=null && dataheartRate==dataheartRate && dataheartRate>0 && dataheartRate<1.0e12) ? (dataheartRate>140 && true) : false)){drawStaticImage(dc,Rez.Drawables.GfcImage_pulse_layer_12,px(198),px(189));}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22pulse-layer-13%22%2C%22partId%22%3A%22pulse-layer-13%22%2C%22capabilityId%22%3A%22core.metric%22%2C%22mode%22%3A%22active%22%7D
if(((dataheartRate!=null && dataheartRate==dataheartRate && dataheartRate>0 && dataheartRate<1.0e12) ? (dataheartRate>140 && true) : false)){{var value=dataheartRate;textPaint(dc,0xf44336,255);dc.drawText(px(227),px(216),fontFor(Rez.Fonts.GfcChalkLatin18),metricText(value,"heartRate","","",0,"--",false),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22pulse-layer-14%22%2C%22partId%22%3A%22pulse-layer-14%22%2C%22capabilityId%22%3A%22core.text%22%2C%22mode%22%3A%22active%22%7D
if(((dataheartRate!=null && dataheartRate==dataheartRate && dataheartRate>0 && dataheartRate<1.0e12) ? (dataheartRate>140 && true) : false)){textPaint(dc,0xe8ecf1,255);dc.drawText(px(75),px(167),fontFor(Rez.Fonts.GfcChalkHan30),"彻",Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22pulse-layer-15%22%2C%22partId%22%3A%22pulse-layer-15%22%2C%22capabilityId%22%3A%22core.text%22%2C%22mode%22%3A%22active%22%7D
if(((dataheartRate!=null && dataheartRate==dataheartRate && dataheartRate>0 && dataheartRate<1.0e12) ? (dataheartRate>140 && true) : false)){textPaint(dc,0xe8ecf1,255);dc.drawText(px(379),px(167),fontFor(Rez.Fonts.GfcChalkHan30),"底",Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}
// GFC_LAYER_END

}
function render_active_4(dc as Graphics.Dc) as Void {var dataheartRate=frameContext[:dataheartRate];var databattery=frameContext[:databattery];var datasteps=frameContext[:datasteps];

// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22pulse-layer-16%22%2C%22partId%22%3A%22pulse-layer-16%22%2C%22capabilityId%22%3A%22core.text%22%2C%22mode%22%3A%22active%22%7D
if(((dataheartRate!=null && dataheartRate==dataheartRate && dataheartRate>0 && dataheartRate<1.0e12) ? (dataheartRate>140 && true) : false)){textPaint(dc,0xe8ecf1,255);dc.drawText(px(78),px(283),fontFor(Rez.Fonts.GfcChalkHan30),"疯",Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22pulse-layer-17%22%2C%22partId%22%3A%22pulse-layer-17%22%2C%22capabilityId%22%3A%22core.text%22%2C%22mode%22%3A%22active%22%7D
if(((dataheartRate!=null && dataheartRate==dataheartRate && dataheartRate>0 && dataheartRate<1.0e12) ? (dataheartRate>140 && true) : false)){textPaint(dc,0xe8ecf1,255);dc.drawText(px(376),px(283),fontFor(Rez.Fonts.GfcChalkHan30),"狂",Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22pulse-layer-18%22%2C%22partId%22%3A%22pulse-layer-18%22%2C%22capabilityId%22%3A%22core.metric%22%2C%22mode%22%3A%22active%22%7D
if(true){{var value=databattery;textPaint(dc,0x8A93A0,255);dc.drawText(px(227),px(71.5),fontFor(Rez.Fonts.GfcChalkLatin16),metricText(value,"battery","BAT ","%",0,"--",false),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22pulse-layer-19%22%2C%22partId%22%3A%22pulse-layer-19%22%2C%22capabilityId%22%3A%22core.metric%22%2C%22mode%22%3A%22active%22%7D
if(true){{var value=datasteps;textPaint(dc,0x8A93A0,255);dc.drawText(px(227),px(97.5),fontFor(Rez.Fonts.GfcChalkLatin16),metricText(value,"steps","STEPS ","",0,"--",false),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}
// GFC_LAYER_END

}
function render_active_5(dc as Graphics.Dc) as Void {var clock=frameContext[:clock];var dateText=frameContext[:dateText];

// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22pulse-layer-20%22%2C%22partId%22%3A%22pulse-layer-20%22%2C%22capabilityId%22%3A%22core.date%22%2C%22mode%22%3A%22active%22%7D
if(true){textPaint(dc,0x8A93A0,255);dc.drawText(px(227),px(330.5),fontFor(Rez.Fonts.GfcChalkLatin16),dateText,Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22pulse-layer-21%22%2C%22partId%22%3A%22pulse-layer-21%22%2C%22capabilityId%22%3A%22core.time%22%2C%22mode%22%3A%22active%22%7D
if(true){textPaint(dc,0xE8ECF1,255);dc.drawText(px(227),px(369.5),fontFor(Rez.Fonts.GfcChalkLatin62),clock.hour.format("%02d")+":"+clock.min.format("%02d"),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}
// GFC_LAYER_END

}
function render_aod_0(dc as Graphics.Dc) as Void {var clock=frameContext[:clock];var dataheartRate=frameContext[:dataheartRate];

// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22pulse-layer-2%22%2C%22partId%22%3A%22pulse-layer-2%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22aod%22%7D
if(true){drawStaticImage(dc,Rez.Drawables.GfcImage_pulse_layer_2,px(117),px(104));}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22pulse-layer-6%22%2C%22partId%22%3A%22pulse-layer-6%22%2C%22capabilityId%22%3A%22core.image%22%2C%22mode%22%3A%22aod%22%7D
if(true){drawStaticImage(dc,Rez.Drawables.GfcImage_pulse_layer_6,px(198),px(189));}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22pulse-layer-7%22%2C%22partId%22%3A%22pulse-layer-7%22%2C%22capabilityId%22%3A%22core.metric%22%2C%22mode%22%3A%22aod%22%7D
if(true){{var value=dataheartRate;textPaint(dc,0x888888,255);dc.drawText(px(227),px(216),fontFor(Rez.Fonts.GfcChalkLatin18),metricText(value,"heartRate","","",0,"--",false),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}
// GFC_LAYER_END


// GFC_LAYER_BEGIN %7B%22layerId%22%3A%22pulse-layer-21%22%2C%22partId%22%3A%22pulse-layer-21%22%2C%22capabilityId%22%3A%22core.time%22%2C%22mode%22%3A%22aod%22%7D
if(true){textPaint(dc,0x888888,255);dc.drawText(px(227),px(369.5),fontFor(Rez.Fonts.GfcChalkLatin54),clock.hour.format("%02d")+":"+clock.min.format("%02d"),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}
// GFC_LAYER_END

}
 function onUpdate(dc as Graphics.Dc) as Void {
  frameContext=null;
  bitmapUsed={};scale=dc.getWidth()/454.0;var clock=System.getClockTime();var dataheartRate=null;var databattery=null;var datasteps=null;var currentActivityInfo=null;if(!sleeping){try {currentActivityInfo=ActivityMonitor.getInfo();var info=currentActivityInfo;if(info!=null){if(info has :steps){datasteps=info.steps;}}}catch(e){}try {databattery=System.getSystemStats().battery;}catch(e){}try {if((Toybox has :SensorHistory)&&(Toybox.SensorHistory has :getHeartRateHistory)){var history=SensorHistory.getHeartRateHistory({:period=>1,:order=>SensorHistory.ORDER_NEWEST_FIRST});if(history!=null){var sample=history.next();if(sample!=null){var hr=sample.data;if(hr!=null && hr>0 && hr<1.0e12){dataheartRate=hr;}}}}}catch(e){}gfcMetricCache[:heartRate]=dataheartRate;gfcMetricCache[:battery]=databattery;gfcMetricCache[:steps]=datasteps;}else{if(gfcMetricCache.hasKey(:heartRate)){dataheartRate=gfcMetricCache[:heartRate];}if(gfcMetricCache.hasKey(:battery)){databattery=gfcMetricCache[:battery];}if(gfcMetricCache.hasKey(:steps)){datasteps=gfcMetricCache[:steps];}}var calendar=Gregorian.info(Time.now(),Time.FORMAT_SHORT);var dateText=["SUN","MON","TUE","WED","THU","FRI","SAT"][calendar.day_of_week-1]+" "+calendar.day.format("%d");
  
  
  var bg=sleeping?Graphics.COLOR_BLACK:0x000000;dc.setColor(bg,bg);dc.clear();dc.setBlendMode(Graphics.BLEND_MODE_SOURCE_OVER);
  frameContext={:bg=>bg,:clock=>clock,:dataheartRate=>dataheartRate,:databattery=>databattery,:datasteps=>datasteps,:calendar=>calendar,:dateText=>dateText};
  if(sleeping){render_aod_0(dc);}else{render_active_0(dc);render_active_1(dc);render_active_2(dc);render_active_3(dc);render_active_4(dc);render_active_5(dc);}
  frameContext=null;
  trimImages();
  if(!gfcFrameReported){System.println("GFC_RENDER_READY target=venu445mm mode="+(sleeping?"aod":"active"));gfcFrameReported=true;}
 }
}