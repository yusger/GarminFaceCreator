import Toybox.Application;
import Toybox.Lang;
import Toybox.WatchUi;

// Personal build: settings are local; no upstream analytics/background service.
class finoclockApp extends Application.AppBase {
    function initialize() { AppBase.initialize(); }
    function getInitialView() as [Views] or [Views, InputDelegates] {
        return [new finoclockView()];
    }
    function onSettingsChanged() as Void {
        Settings.getProperties();
        WatchUi.requestUpdate();
    }
    function getSettingsView() as [Views] or [Views, InputDelegates] or Null {
        if (ViewRef.view != null) { ViewRef.view.releaseHeavyResources(); }
        return [new Menu(), new MenuDelegate()];
    }
}