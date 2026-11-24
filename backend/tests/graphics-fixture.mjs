export const graphicsSource = `import Toybox.Application; import Toybox.WatchUi; import Toybox.Graphics;
class SampleApp extends Application.AppBase {function initialize(){AppBase.initialize();}function getInitialView(){return [new SampleView()];}}
class SampleView extends WatchUi.WatchFace {
 var scale=1.0;
 function initialize(){WatchFace.initialize();}
 function p(value){return (value*scale).toNumber();}
 function onUpdate(dc as Graphics.Dc) as Void {
  scale=dc.getWidth()/454.0;
  dc.setColor(Graphics.COLOR_BLACK,Graphics.COLOR_BLACK);dc.clear();
  dc.setBlendMode(Graphics.BLEND_MODE_SOURCE_OVER);
  dc.setFill(Graphics.createColor(255,255,0,0));dc.fillRectangle(p(135),p(140),p(110),p(110));
  dc.setFill(Graphics.createColor(128,0,0,255));dc.fillRectangle(p(205),p(175),p(110),p(110));
  dc.setStroke(Graphics.createColor(255,0,255,0));dc.setPenWidth(p(4));dc.drawEllipse(p(227),p(330),p(65),p(30));
  dc.setFill(Graphics.createColor(255,255,255,255));dc.setStroke(Graphics.createColor(255,255,255,255));dc.setColor(Graphics.COLOR_WHITE,Graphics.COLOR_TRANSPARENT);
  dc.drawText(p(227),p(100),Graphics.FONT_SMALL,"RGBA / STROKE",Graphics.TEXT_JUSTIFY_CENTER);
 }
}`;
