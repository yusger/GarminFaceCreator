import Toybox.Application;
import Toybox.Lang;
import Toybox.WatchUi;

// The watch and phone write the same property keys.
class ClownSettingsMenu extends WatchUi.Menu2 {
    function initialize(section as Number) {
        Menu2.initialize({:title => Rez.Strings.AppName});
        if (section == 0) {
            addItem(new WatchUi.MenuItem(Rez.Strings.DataSettings, null, 1, null));
            addItem(new WatchUi.MenuItem(Rez.Strings.Appearance, null, 2, null));
        } else if (section == 1) {
            var keys = ClownConfig.slotKeys();
            var titles = ClownConfig.slotTitles();
            for (var i = 0; i < keys.size(); i++) { addChoice(keys[i], titles[i]); }
        } else {
            addChoice("SecondHandColor", Rez.Strings.SecondHandColor);
            addChoice("TongueColor", Rez.Strings.TongueColor);
            addChoice("EyeColor", Rez.Strings.EyeColor);
            addChoice("TextColor", Rez.Strings.TextColor);
            addChoice("AccentColor", Rez.Strings.AccentColor);
            addChoice("BatteryColor", Rez.Strings.BatteryColor);
            addToggle("ShowPortalBackground", Rez.Strings.ShowPortalBackground, true);
            addChoice("BackgroundColor", Rez.Strings.BackgroundColor);
            addChoice("TimeFormat", Rez.Strings.TimeFormat);
            addChoice("TimeSize", Rez.Strings.TimeSize);
            addToggle("ShowRing", Rez.Strings.ShowRing, true);
            addToggle("ShowSecondHand", Rez.Strings.ShowSecondHand, true);
            addToggle("ShowSmile", Rez.Strings.ShowSmile, true);
            addToggle("ShowDividers", Rez.Strings.ShowDividers, true);
            addToggle("ShowDate", Rez.Strings.ShowDate, true);
        }
        if (section == 0) { addToggle("PreviewMode", Rez.Strings.PreviewModeTitle, false); }
    }

    private function addChoice(key as String, title as ResourceId) as Void {
        addItem(new WatchUi.MenuItem(title, ClownConfig.choiceText(key), key, null));
    }

    private function addToggle(key as String, title as ResourceId, fallback as Boolean) as Void {
        addItem(new WatchUi.ToggleMenuItem(title, null, key, ClownConfig.flag(key, fallback), null));
    }
}

class ClownSettingsDelegate extends WatchUi.Menu2InputDelegate {
    function initialize(menu as WatchUi.Menu2) {
        Menu2InputDelegate.initialize();
    }

    function onSelect(item as WatchUi.MenuItem) as Void {
        var key = item.getId();
        if (key instanceof Number) {
            var menu = new ClownSettingsMenu(key);
            WatchUi.pushView(menu, new ClownSettingsDelegate(menu), WatchUi.SLIDE_LEFT);
        } else if (item instanceof WatchUi.ToggleMenuItem) {
            Application.Properties.setValue(key as String, item.isEnabled());
            notify();
        } else {
            var menu = new WatchUi.Menu2({:title => item.getLabel()});
            var values = ClownConfig.values(key as String);
            var labels = ClownConfig.labels(key as String);
            for (var i = 0; i < values.size(); i++) {
                menu.addItem(new WatchUi.MenuItem(labels[i],
                    values[i] == ClownConfig.choice(key as String) ? ClownConfig.string(Rez.Strings.Selected) : null,
                    values[i], null));
            }
            WatchUi.pushView(menu, new ClownChoiceDelegate(key as String, item), WatchUi.SLIDE_LEFT);
        }
    }

    private function notify() as Void {
        (Application.getApp() as ClownWatchApp).onSettingsChanged();
    }
}

class ClownChoiceDelegate extends WatchUi.Menu2InputDelegate {
    private var _key as String;
    private var _item as WatchUi.MenuItem;

    function initialize(key as String, item as WatchUi.MenuItem) {
        Menu2InputDelegate.initialize();
        _key = key;
        _item = item;
    }

    function onSelect(item as WatchUi.MenuItem) as Void {
        Application.Properties.setValue(_key, item.getId() as Number);
        _item.setSubLabel(ClownConfig.choiceText(_key));
        (Application.getApp() as ClownWatchApp).onSettingsChanged();
        WatchUi.popView(WatchUi.SLIDE_RIGHT);
    }
}
