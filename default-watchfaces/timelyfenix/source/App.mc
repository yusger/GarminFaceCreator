// GarminFaceCreator local generator basic-6-calendar; approximate system font mapping, no SDK fonts bundled.
// TimelyFenix Creator layout adaptation of KWottrich/TimelyFenix @ d38a347a548667780a9f17b84f5f02155687a72c; GPL-3.0-only. See distributed notices.
import Toybox.Application;import Toybox.WatchUi;import Toybox.Graphics;import Toybox.System;import Toybox.Time;import Toybox.Time.Gregorian;
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
 
 var calendarStamp=0;var mondayCells=null;var sundayCells=null;
 function calendarMonthDays(year,month){if(month==2 && (year%400==0 || (year%4==0 && year%100!=0))){return 29;}return [31,28,31,30,31,30,31,31,30,31,30,31][month-1];}
 function calendarCells(info,start){
  var stamp=info.year*10000+info.month*100+info.day;
  if(stamp!=calendarStamp){calendarStamp=stamp;mondayCells=null;sundayCells=null;}
  if(start==1 && mondayCells!=null){return mondayCells;}if(start==0 && sundayCells!=null){return sundayCells;}
  var offset=-7-(info.day_of_week-1-start+7)%7;var cells=[];
  for(var i=0;i<21;i++){var y=info.year;var m=info.month;var d=info.day+offset+i;
   while(d<1){m--;if(m<1){m=12;y--;}d+=calendarMonthDays(y,m);}
   while(d>calendarMonthDays(y,m)){d-=calendarMonthDays(y,m);m++;if(m>12){m=1;y++;}}
   cells.add([d,m!=info.month,offset+i==0]);
  }
  if(start==1){mondayCells=cells;}else{sundayCells=cells;}return cells;
 }
 function calendarPaint(dc,ink){dc.setFill(Graphics.createColor(255,(ink>>16)&255,(ink>>8)&255,ink&255));dc.setStroke(Graphics.createColor(255,(ink>>16)&255,(ink>>8)&255,ink&255));dc.setColor(ink,Graphics.COLOR_TRANSPARENT);}
 function drawCalendar(dc,info,start,x,y,w,h,textFont,normal,muted,header,highlight,todayText){
  var names=["Su","Mo","Tu","We","Th","Fr","Sa"];var cells=calendarCells(info,start);
  calendarPaint(dc,header);
  for(var col=0;col<7;col++){dc.drawText(px(x+(col+0.5)*w/7),px(y+h/8),textFont,names[(start+col)%7],Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}
  for(var i=0;i<21;i++){var cx=x+(i%7+0.5)*w/7;var cy=y+((i/7).toNumber()+1.5)*h/4;
   if(cells[i][2]){calendarPaint(dc,highlight);var radius=w/7.0;if(h/4.0<radius){radius=h/4.0;}dc.fillCircle(px(cx),px(cy),px(radius*0.43));}
   calendarPaint(dc,cells[i][2]?todayText:(cells[i][1]?muted:normal));dc.drawText(px(cx),px(cy),textFont,cells[i][0].format("%d"),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);
  }
 }

 function px(value){return (value*scale).toNumber();}
 function onUpdate(dc as Graphics.Dc) as Void {
  scale=dc.getWidth()/454.0;var clock=System.getClockTime();var databattery=null;try {databattery=System.getSystemStats().battery;}catch(e){}var calendar=Gregorian.info(Time.now(),Time.FORMAT_SHORT);var dateText=["SUN","MON","TUE","WED","THU","FRI","SAT"][calendar.day_of_week-1]+" "+calendar.day.format("%d");
  dc.setColor(Graphics.COLOR_BLACK,Graphics.COLOR_BLACK);dc.clear();dc.setBlendMode(Graphics.BLEND_MODE_SOURCE_OVER);
  if(sleeping){{dc.setFill(Graphics.createColor(255,(0x000000>>16)&255,(0x000000>>8)&255,0x000000&255));dc.setStroke(Graphics.createColor(255,(0x000000>>16)&255,(0x000000>>8)&255,0x000000&255));dc.setPenWidth(px(2));var polygon=[[px(454),px(227)],[px(452.058),px(256.6294)],[px(446.2652),px(285.7519)],[px(436.7207),px(313.8691)],[px(423.5878),px(340.5)],[px(407.0912),px(365.1888)],[px(387.5132),px(387.5132)],[px(365.1888),px(407.0912)],[px(340.5),px(423.5878)],[px(313.8691),px(436.7207)],[px(285.7519),px(446.2652)],[px(256.6294),px(452.058)],[px(227),px(454)],[px(197.3706),px(452.058)],[px(168.2481),px(446.2652)],[px(140.1309),px(436.7207)],[px(113.5),px(423.5878)],[px(88.8112),px(407.0912)],[px(66.4868),px(387.5132)],[px(46.9088),px(365.1888)],[px(30.4122),px(340.5)],[px(17.2793),px(313.8691)],[px(7.7348),px(285.7519)],[px(1.942),px(256.6294)],[px(0),px(227)],[px(1.942),px(197.3706)],[px(7.7348),px(168.2481)],[px(17.2793),px(140.1309)],[px(30.4122),px(113.5)],[px(46.9088),px(88.8112)],[px(66.4868),px(66.4868)],[px(88.8112),px(46.9088)],[px(113.5),px(30.4122)],[px(140.1309),px(17.2793)],[px(168.2481),px(7.7348)],[px(197.3706),px(1.942)],[px(227),px(0)],[px(256.6294),px(1.942)],[px(285.7519),px(7.7348)],[px(313.8691),px(17.2793)],[px(340.5),px(30.4122)],[px(365.1888),px(46.9088)],[px(387.5132),px(66.4868)],[px(407.0912),px(88.8112)],[px(423.5878),px(113.5)],[px(436.7207),px(140.1309)],[px(446.2652),px(168.2481)],[px(452.058),px(197.3706)]];dc.fillPolygon(polygon);}

dc.setFill(Graphics.createColor(255,(0x667585>>16)&255,(0x667585>>8)&255,0x667585&255));dc.setStroke(Graphics.createColor(255,(0x667585>>16)&255,(0x667585>>8)&255,0x667585&255));dc.setColor(0x667585,Graphics.COLOR_TRANSPARENT);dc.drawText(px(227),px(118),Graphics.FONT_NUMBER_HOT,clock.hour.format("%02d")+":"+clock.min.format("%02d"),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);




}else{{dc.setFill(Graphics.createColor(255,(0x06101b>>16)&255,(0x06101b>>8)&255,0x06101b&255));dc.setStroke(Graphics.createColor(255,(0x06101b>>16)&255,(0x06101b>>8)&255,0x06101b&255));dc.setPenWidth(px(2));var polygon=[[px(454),px(227)],[px(452.058),px(256.6294)],[px(446.2652),px(285.7519)],[px(436.7207),px(313.8691)],[px(423.5878),px(340.5)],[px(407.0912),px(365.1888)],[px(387.5132),px(387.5132)],[px(365.1888),px(407.0912)],[px(340.5),px(423.5878)],[px(313.8691),px(436.7207)],[px(285.7519),px(446.2652)],[px(256.6294),px(452.058)],[px(227),px(454)],[px(197.3706),px(452.058)],[px(168.2481),px(446.2652)],[px(140.1309),px(436.7207)],[px(113.5),px(423.5878)],[px(88.8112),px(407.0912)],[px(66.4868),px(387.5132)],[px(46.9088),px(365.1888)],[px(30.4122),px(340.5)],[px(17.2793),px(313.8691)],[px(7.7348),px(285.7519)],[px(1.942),px(256.6294)],[px(0),px(227)],[px(1.942),px(197.3706)],[px(7.7348),px(168.2481)],[px(17.2793),px(140.1309)],[px(30.4122),px(113.5)],[px(46.9088),px(88.8112)],[px(66.4868),px(66.4868)],[px(88.8112),px(46.9088)],[px(113.5),px(30.4122)],[px(140.1309),px(17.2793)],[px(168.2481),px(7.7348)],[px(197.3706),px(1.942)],[px(227),px(0)],[px(256.6294),px(1.942)],[px(285.7519),px(7.7348)],[px(313.8691),px(17.2793)],[px(340.5),px(30.4122)],[px(365.1888),px(46.9088)],[px(387.5132),px(66.4868)],[px(407.0912),px(88.8112)],[px(423.5878),px(113.5)],[px(436.7207),px(140.1309)],[px(446.2652),px(168.2481)],[px(452.058),px(197.3706)]];dc.fillPolygon(polygon);}
dc.setFill(Graphics.createColor(255,(0x7891aa>>16)&255,(0x7891aa>>8)&255,0x7891aa&255));dc.setStroke(Graphics.createColor(255,(0x7891aa>>16)&255,(0x7891aa>>8)&255,0x7891aa&255));dc.setColor(0x7891aa,Graphics.COLOR_TRANSPARENT);dc.drawText(px(227),px(44),Graphics.FONT_XTINY,"TIMELY",Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);
dc.setFill(Graphics.createColor(255,(0xe8f1fa>>16)&255,(0xe8f1fa>>8)&255,0xe8f1fa&255));dc.setStroke(Graphics.createColor(255,(0xe8f1fa>>16)&255,(0xe8f1fa>>8)&255,0xe8f1fa&255));dc.setColor(0xe8f1fa,Graphics.COLOR_TRANSPARENT);dc.drawText(px(227),px(118),Graphics.FONT_NUMBER_HOT,clock.hour.format("%02d")+":"+clock.min.format("%02d"),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);
dc.setFill(Graphics.createColor(255,(0xc5d8e9>>16)&255,(0xc5d8e9>>8)&255,0xc5d8e9&255));dc.setStroke(Graphics.createColor(255,(0xc5d8e9>>16)&255,(0xc5d8e9>>8)&255,0xc5d8e9&255));dc.setColor(0xc5d8e9,Graphics.COLOR_TRANSPARENT);dc.drawText(px(256),px(185),Graphics.FONT_XTINY,dateText,Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);
{var value=databattery;var ink=0x70c7ff;if(metricValid(value,true)){if(value>=0 && value<10){ink=0xff5566;}else if(value>=10 && value<30){ink=0xffee44;}else if(value>=30 && true){ink=0x70c7ff;}}dc.setFill(Graphics.createColor(255,(ink>>16)&255,(ink>>8)&255,ink&255));dc.setStroke(Graphics.createColor(255,(ink>>16)&255,(ink>>8)&255,ink&255));dc.setColor(ink,Graphics.COLOR_TRANSPARENT);dc.drawText(px(256),px(219),Graphics.FONT_XTINY,metricText(value,"battery","BAT ","%",-1,"--"),Graphics.TEXT_JUSTIFY_CENTER|Graphics.TEXT_JUSTIFY_VCENTER);}
{dc.setFill(Graphics.createColor(255,(0x1b3147>>16)&255,(0x1b3147>>8)&255,0x1b3147&255));dc.setStroke(Graphics.createColor(255,(0x1b3147>>16)&255,(0x1b3147>>8)&255,0x1b3147&255));dc.setPenWidth(px(1));dc.drawLine(px(90),px(242),px(364),px(243));}
drawCalendar(dc,calendar,1,80,252,294,140,Graphics.FONT_XTINY,0xe8f1fa,0x586a7f,0x7891aa,0x70c7ff,0x06101b);
GfcIcons.draw_timely_008(dc,px(100),px(174));}
 }
}