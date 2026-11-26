import Toybox.Application;
import Toybox.Lang;
import Toybox.WatchUi;

class ClownWatchApp extends Application.AppBase {
    private var _view as ClownWatchView?;
    function initialize() {
        AppBase.initialize();
        ClownConfig.upgradeColors();
        // Existing visual drafts stored PreviewMode=true: switch to real data once.
        if (Application.Properties.getValue("DataModeVersion") != 1) {
            Application.Properties.setValue("PreviewMode", false);
            Application.Properties.setValue("DataModeVersion", 1);
        }
    }

    function getInitialView() as [Views] or [Views, InputDelegates] {
        _view = new ClownWatchView();
        return [_view];
    }

    function onSettingsChanged() as Void {
        if (_view != null) {
            _view.loadSettings();
            WatchUi.requestUpdate();
        }
    }

    function getSettingsView() as [Views] or [Views, InputDelegates] or Null {
        var menu = new ClownSettingsMenu(0);
        return [menu, new ClownSettingsDelegate(menu)];
    }
}
