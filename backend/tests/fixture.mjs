const appId = "4c3f31fda59c4f9bb25c4f7774eca711";
export const files = {
  "manifest.xml": `<iq:manifest xmlns:iq="http://www.garmin.com/xml/connectiq" version="3"><iq:application id="${appId}" type="watchface" name="@Strings.AppName" entry="SampleApp" launcherIcon="@Drawables.LauncherIcon" minApiLevel="5.1.0"><iq:products><iq:product id="venu445mm"/></iq:products><iq:permissions/><iq:languages><iq:language>eng</iq:language></iq:languages><iq:barrels/></iq:application></iq:manifest>`,
  "monkey.jungle":
    "project.manifest = manifest.xml\nbase.sourcePath = source\nbase.resourcePath = resources",
  "resources/strings/strings.xml":
    '<strings><string id="AppName">Creator Build Test</string></strings>',
  "resources/drawables/drawables.xml":
    '<drawables><bitmap id="LauncherIcon" filename="icon.svg"/></drawables>',
  "resources/drawables/icon.svg":
    '<svg xmlns="http://www.w3.org/2000/svg" width="65" height="65"><circle cx="32" cy="32" r="28" fill="#45d6be"/></svg>',
  "source/App.mc":
    'import Toybox.Application; import Toybox.WatchUi; import Toybox.Graphics; class SampleApp extends Application.AppBase { function initialize(){AppBase.initialize();} function getInitialView(){return [new SampleView()];}} class SampleView extends WatchUi.WatchFace {function initialize(){WatchFace.initialize();} function onUpdate(dc as Graphics.Dc) as Void {dc.setColor(Graphics.COLOR_BLACK, Graphics.COLOR_BLACK);dc.clear();dc.setColor(Graphics.COLOR_WHITE,Graphics.COLOR_TRANSPARENT);dc.drawText(227,200,Graphics.FONT_NUMBER_HOT,"09:41",Graphics.TEXT_JUSTIFY_CENTER);}}',
};
