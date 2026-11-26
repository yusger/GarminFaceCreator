// GarminFaceCreator local generator basic-11-solar-events; approximate system font mapping, no SDK fonts bundled.
// Celestial Creator theme/layout adaptation of Cutwell/garmin-celestial-watchface @ c5d124c54866f23dbee7528a488c3802d120b715; original MIT; Creator native templates GPL-3.0-or-later. See notices.
import Toybox.Application;import Toybox.WatchUi;import Toybox.Graphics;import Toybox.System;import Toybox.Time;import Toybox.Time.Gregorian;import Toybox.Position;import Toybox.Weather;import Toybox.Math;
class GeneratedApp extends Application.AppBase {function initialize(){AppBase.initialize();} function getInitialView(){return [new GeneratedView()];}}
class GeneratedView extends WatchUi.WatchFace {
 var sleeping=false;var scale=1.0;
 function initialize(){WatchFace.initialize();}
 function onEnterSleep(){sleeping=true;WatchUi.requestUpdate();}
 function onExitSleep(){sleeping=false;WatchUi.requestUpdate();}
 
 function metricValid(value,battery){return value!=null && value==value && value>=0 && value<1.0e12 && (!battery || value<=100);}
 function metricText(value,source,label,unit,precision,missing){
  if(!metricValid(value,source.equals("battery"))){return label+missing;}
  var text="";
  if(precision>=0){text=value.toFloat().format("%."+precision.format("%d")+"f");}
  else if(source.equals("seconds")){text=value.toNumber().format("%02d");}
  else if(source.equals("steps")){var digits=value.toNumber().format("%d");var length=digits.length();for(var i=0;i<length;i++){if(i>0 && (length-i)%3==0){text+=",";}text+=digits.substring(i,i+1);}}
  else {text=value.toFloat().format("%.6f");while(text.length()>0 && text.substring(text.length()-1,text.length()).equals("0")){text=text.substring(0,text.length()-1);}if(text.substring(text.length()-1,text.length()).equals(".")){text=text.substring(0,text.length()-1);}}
  return label+text+unit;
 }
 
 
 var solarMinute=-1;var solarCached=[-1,0.0];var solarEventKey="";var solarRises=[];var solarSets=[];
 function getSolarState(){
  var now=Time.now();var stamp=(now.value()/60).toNumber();if(solarMinute==stamp){return solarCached;}solarMinute=stamp;solarCached=[-1,0.0];
  try{if((Toybox has :Position)&&(Toybox has :Weather)&&(Position has :getInfo)&&(Weather has :getSunrise)&&(Weather has :getSunset)){
   var info=Position.getInfo();if(info!=null && info.position!=null){
    var coords=info.position.toDegrees();var key=(now.value()/86400).toNumber().format("%d")+":"+coords[0].format("%.6f")+":"+coords[1].format("%.6f");
    if(key!=solarEventKey){solarRises=[];solarSets=[];for(var day=-1;day<=1;day++){var query=new Time.Moment(now.value()+day*86400);var rise=Weather.getSunrise(info.position,query);var set=Weather.getSunset(info.position,query);if(rise!=null){solarRises.add(rise.value());}if(set!=null){solarSets.add(set.value());}}solarEventKey=key;}
    var value=now.value();var lastRise=-1;var lastSet=-1;var nextRise=-1;var nextSet=-1;
    for(var i=0;i<solarRises.size();i++){var r=solarRises[i];if(r<=value && r>lastRise){lastRise=r;}if(r>value && (nextRise<0 || r<nextRise)){nextRise=r;}}
    for(var j=0;j<solarSets.size();j++){var t=solarSets[j];if(t<=value && t>lastSet){lastSet=t;}if(t>value && (nextSet<0 || t<nextSet)){nextSet=t;}}
    if(lastRise>lastSet && lastRise>=0 && nextSet>value && value-lastRise<86400 && nextSet-value<86400){solarCached=[1,(value-lastRise)*1.0/(nextSet-lastRise)];}
    else if(lastSet>lastRise && lastSet>=0 && nextRise>value && value-lastSet<86400 && nextRise-value<86400){solarCached=[0,0.5];}
   }else{solarEventKey="";}
  }}catch(e){solarEventKey="";}return solarCached;
 }
 function solarPaint(dc,ink){dc.setFill(Graphics.createColor(255,(ink>>16)&255,(ink>>8)&255,ink&255));dc.setStroke(Graphics.createColor(255,(ink>>16)&255,(ink>>8)&255,ink&255));dc.setColor(ink,Graphics.COLOR_TRANSPARENT);}
 function drawCelestial(dc,state,part,x,y,w,h,day,night,missing){
  var mode=state[0];var p=state[1];
  if(part==0){solarPaint(dc,mode==1?day:(mode==0?night:missing));dc.fillRectangle(px(x),px(y),px(w),px(h));if(mode<0){solarPaint(dc,0x9aabbc);dc.drawText(px(x+w/2),px(y+h/2),Graphics.FONT_XTINY,"N/A",Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}return;}
  if(mode<0){return;}if(p<0){p=0;}if(p>1){p=1;}var radius=(w<h?w:h)*0.09;var cx=x+w*(0.15+0.7*p);var cy=y+h*(0.84-0.65*Math.sin(Math.PI*p));
  solarPaint(dc,mode==1?day:night);dc.setPenWidth(px(2)>0?px(2):1);if(mode==1){dc.fillCircle(px(cx),px(cy),px(radius));for(var i=0;i<8;i++){var a=i*Math.PI/4;dc.drawLine(px(cx+Math.cos(a)*radius*1.25),px(cy+Math.sin(a)*radius*1.25),px(cx+Math.cos(a)*radius*1.55),px(cy+Math.sin(a)*radius*1.55));}}else{dc.drawCircle(px(cx),px(cy),px(radius));dc.fillCircle(px(cx+radius*0.25),px(cy-radius*0.2),px(radius*0.13));dc.fillCircle(px(cx-radius*0.3),px(cy+radius*0.2),px(radius*0.18));}
 }
 
 function px(value){return (value*scale).toNumber();}
 function onUpdate(dc as Graphics.Dc) as Void {
  scale=dc.getWidth()/454.0;var clock=System.getClockTime();var solar=sleeping?solarCached:getSolarState();var databattery=null;try {databattery=System.getSystemStats().battery;}catch(e){}var calendar=Gregorian.info(Time.now(),Time.FORMAT_SHORT);var dateText=["SUN","MON","TUE","WED","THU","FRI","SAT"][calendar.day_of_week-1]+" "+calendar.day.format("%d");
  dc.setColor(Graphics.COLOR_BLACK,Graphics.COLOR_BLACK);dc.clear();dc.setBlendMode(Graphics.BLEND_MODE_SOURCE_OVER);
  if(sleeping){{dc.setFill(Graphics.createColor(255,(0x000000>>16)&255,(0x000000>>8)&255,0x000000&255));dc.setStroke(Graphics.createColor(255,(0x000000>>16)&255,(0x000000>>8)&255,0x000000&255));dc.setPenWidth(px(2));var polygon=[[px(454),px(227)],[px(452.058),px(256.6294)],[px(446.2652),px(285.7519)],[px(436.7207),px(313.8691)],[px(423.5878),px(340.5)],[px(407.0912),px(365.1888)],[px(387.5132),px(387.5132)],[px(365.1888),px(407.0912)],[px(340.5),px(423.5878)],[px(313.8691),px(436.7207)],[px(285.7519),px(446.2652)],[px(256.6294),px(452.058)],[px(227),px(454)],[px(197.3706),px(452.058)],[px(168.2481),px(446.2652)],[px(140.1309),px(436.7207)],[px(113.5),px(423.5878)],[px(88.8112),px(407.0912)],[px(66.4868),px(387.5132)],[px(46.9088),px(365.1888)],[px(30.4122),px(340.5)],[px(17.2793),px(313.8691)],[px(7.7348),px(285.7519)],[px(1.942),px(256.6294)],[px(0),px(227)],[px(1.942),px(197.3706)],[px(7.7348),px(168.2481)],[px(17.2793),px(140.1309)],[px(30.4122),px(113.5)],[px(46.9088),px(88.8112)],[px(66.4868),px(66.4868)],[px(88.8112),px(46.9088)],[px(113.5),px(30.4122)],[px(140.1309),px(17.2793)],[px(168.2481),px(7.7348)],[px(197.3706),px(1.942)],[px(227),px(0)],[px(256.6294),px(1.942)],[px(285.7519),px(7.7348)],[px(313.8691),px(17.2793)],[px(340.5),px(30.4122)],[px(365.1888),px(46.9088)],[px(387.5132),px(66.4868)],[px(407.0912),px(88.8112)],[px(423.5878),px(113.5)],[px(436.7207),px(140.1309)],[px(446.2652),px(168.2481)],[px(452.058),px(197.3706)]];dc.fillPolygon(polygon);}







dc.setFill(Graphics.createColor(255,(0x6f7c82>>16)&255,(0x6f7c82>>8)&255,0x6f7c82&255));dc.setStroke(Graphics.createColor(255,(0x6f7c82>>16)&255,(0x6f7c82>>8)&255,0x6f7c82&255));dc.setColor(0x6f7c82,Graphics.COLOR_TRANSPARENT);dc.drawText(px(227),px(364.5),Graphics.FONT_NUMBER_HOT,clock.hour.format("%02d")+":"+clock.min.format("%02d"),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);
}else{{dc.setFill(Graphics.createColor(255,(0x000000>>16)&255,(0x000000>>8)&255,0x000000&255));dc.setStroke(Graphics.createColor(255,(0x000000>>16)&255,(0x000000>>8)&255,0x000000&255));dc.setPenWidth(px(2));var polygon=[[px(454),px(227)],[px(452.058),px(256.6294)],[px(446.2652),px(285.7519)],[px(436.7207),px(313.8691)],[px(423.5878),px(340.5)],[px(407.0912),px(365.1888)],[px(387.5132),px(387.5132)],[px(365.1888),px(407.0912)],[px(340.5),px(423.5878)],[px(313.8691),px(436.7207)],[px(285.7519),px(446.2652)],[px(256.6294),px(452.058)],[px(227),px(454)],[px(197.3706),px(452.058)],[px(168.2481),px(446.2652)],[px(140.1309),px(436.7207)],[px(113.5),px(423.5878)],[px(88.8112),px(407.0912)],[px(66.4868),px(387.5132)],[px(46.9088),px(365.1888)],[px(30.4122),px(340.5)],[px(17.2793),px(313.8691)],[px(7.7348),px(285.7519)],[px(1.942),px(256.6294)],[px(0),px(227)],[px(1.942),px(197.3706)],[px(7.7348),px(168.2481)],[px(17.2793),px(140.1309)],[px(30.4122),px(113.5)],[px(46.9088),px(88.8112)],[px(66.4868),px(66.4868)],[px(88.8112),px(46.9088)],[px(113.5),px(30.4122)],[px(140.1309),px(17.2793)],[px(168.2481),px(7.7348)],[px(197.3706),px(1.942)],[px(227),px(0)],[px(256.6294),px(1.942)],[px(285.7519),px(7.7348)],[px(313.8691),px(17.2793)],[px(340.5),px(30.4122)],[px(365.1888),px(46.9088)],[px(387.5132),px(66.4868)],[px(407.0912),px(88.8112)],[px(423.5878),px(113.5)],[px(436.7207),px(140.1309)],[px(446.2652),px(168.2481)],[px(452.058),px(197.3706)]];dc.fillPolygon(polygon);}
drawCelestial(dc,solar,0,0,0,454,268,0x326a88,0x0b1829,0x17212c);
drawCelestial(dc,solar,1,50,80,354,180,0xffce60,0xdfedff,0x17212c);
{dc.setFill(Graphics.createColor(255,(0x101b1c>>16)&255,(0x101b1c>>8)&255,0x101b1c&255));dc.setStroke(Graphics.createColor(255,(0x101b1c>>16)&255,(0x101b1c>>8)&255,0x101b1c&255));dc.setPenWidth(px(2));var polygon=[[px(0),px(260)],[px(454),px(260)],[px(454),px(454)],[px(0),px(454)]];dc.fillPolygon(polygon);}
{dc.setFill(Graphics.createColor(255,(0x101b1c>>16)&255,(0x101b1c>>8)&255,0x101b1c&255));dc.setStroke(Graphics.createColor(255,(0x101b1c>>16)&255,(0x101b1c>>8)&255,0x101b1c&255));dc.setPenWidth(px(2));var polygon=[[px(0),px(250)],[px(144),px(250)],[px(144),px(285)],[px(0),px(285)]];dc.fillPolygon(polygon);}
{dc.setFill(Graphics.createColor(255,(0x101b1c>>16)&255,(0x101b1c>>8)&255,0x101b1c&255));dc.setStroke(Graphics.createColor(255,(0x101b1c>>16)&255,(0x101b1c>>8)&255,0x101b1c&255));dc.setPenWidth(px(2));var polygon=[[px(310),px(240)],[px(454),px(240)],[px(454),px(285)],[px(310),px(285)]];dc.fillPolygon(polygon);}
dc.setFill(Graphics.createColor(255,(0xdbe9f0>>16)&255,(0xdbe9f0>>8)&255,0xdbe9f0&255));dc.setStroke(Graphics.createColor(255,(0xdbe9f0>>16)&255,(0xdbe9f0>>8)&255,0xdbe9f0&255));dc.setColor(0xdbe9f0,Graphics.COLOR_TRANSPARENT);dc.drawText(px(227),px(55),Graphics.FONT_XTINY,dateText,Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);
dc.setFill(Graphics.createColor(255,(0x7e9b99>>16)&255,(0x7e9b99>>8)&255,0x7e9b99&255));dc.setStroke(Graphics.createColor(255,(0x7e9b99>>16)&255,(0x7e9b99>>8)&255,0x7e9b99&255));dc.setColor(0x7e9b99,Graphics.COLOR_TRANSPARENT);dc.drawText(px(227),px(296),Graphics.FONT_XTINY,"CELESTIAL",Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);
dc.setFill(Graphics.createColor(255,(0xe5eff4>>16)&255,(0xe5eff4>>8)&255,0xe5eff4&255));dc.setStroke(Graphics.createColor(255,(0xe5eff4>>16)&255,(0xe5eff4>>8)&255,0xe5eff4&255));dc.setColor(0xe5eff4,Graphics.COLOR_TRANSPARENT);dc.drawText(px(227),px(364.5),Graphics.FONT_NUMBER_HOT,clock.hour.format("%02d")+":"+clock.min.format("%02d"),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);
{var value=databattery;var ink=0x718079;if(metricValid(value,true)){if(value>=0 && value<10){ink=0xff5566;}else if(value>=10 && value<30){ink=0xffee44;}else if(value>=30 && true){ink=0xacc8c1;}}dc.setFill(Graphics.createColor(255,(ink>>16)&255,(ink>>8)&255,ink&255));dc.setStroke(Graphics.createColor(255,(ink>>16)&255,(ink>>8)&255,ink&255));dc.setColor(ink,Graphics.COLOR_TRANSPARENT);dc.drawText(px(227),px(426),Graphics.FONT_XTINY,metricText(value,"battery","BAT ","%",-1,"--"),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}}
 }
}