import Toybox.Application;
import Toybox.Lang;
import Toybox.WatchUi;

module ClownConfig {
    function slotKeys() as Array<String> {
        return ["TopLeft", "TopRight", "MiddleLeft", "MiddleRight",
            "BottomLeft", "BottomCenter", "BottomRight", "Footer"];
    }

    function slotDefaults() as Array<Number> { return [1, 2, 3, 4, 5, 7, 6, 8]; }

    function slotTitles() as Array<ResourceId> {
        return [Rez.Strings.TopLeft, Rez.Strings.TopRight, Rez.Strings.MiddleLeft,
            Rez.Strings.MiddleRight, Rez.Strings.BottomLeft, Rez.Strings.BottomCenter,
            Rez.Strings.BottomRight, Rez.Strings.Footer];
    }

    function bounded(value as Object?, fallback as Number, low as Number, high as Number) as Number {
        return value instanceof Number && value >= low && value <= high ? value : fallback;
    }

    function number(key as String, fallback as Number, low as Number, high as Number) as Number {
        return bounded(Application.Properties.getValue(key), fallback, low, high);
    }

    function flag(key as String, fallback as Boolean) as Boolean {
        var value = Application.Properties.getValue(key);
        return value instanceof Boolean ? value : fallback;
    }

    function string(id as ResourceId) as String { return WatchUi.loadResource(id) as String; }

    function isColor(key as String) as Boolean {
        return key.equals("AccentColor") || key.equals("SecondHandColor") || key.equals("TongueColor")
            || key.equals("EyeColor") || key.equals("TextColor") || key.equals("BatteryColor");
    }

    function paletteValues() as Array<Number> {
        return [0xB77CFF, 0x55AAFF, 0x00DDCC, 0x55FF99, 0x3DA855, 0xFFEE44,
            0xFFCC33, 0xFFAA55, 0xFF5566, 0xFF77BB, 0xFFFFFF];
    }

    function paletteLabels() as Array<ResourceId> {
        return [Rez.Strings.ColorPurple, Rez.Strings.ColorBlue, Rez.Strings.ColorCyan,
            Rez.Strings.ColorGreen, Rez.Strings.ColorFieldGreen, Rez.Strings.ColorYellow,
            Rez.Strings.ColorGold, Rez.Strings.ColorOrange, Rez.Strings.ColorRed,
            Rez.Strings.ColorPink, Rez.Strings.ColorWhite];
    }

    function normalizeColor(key as String, value as Object?) as Object? {
        if (key.equals("BatteryColor")) {
            // Normal battery levels use white or cyan; migrate old palette choices.
            return value == 0xFFFFFF || value == 0xF4F5F7 ? 0xFFFFFF : 0x00DDCC;
        } else if (key.equals("BackgroundColor")) {
            if (value == 0x101820) { return 0x555555; }
            if (value == 0x071125) { return 0x0A1628; }
        } else if (isColor(key)) {
            // Keep the user's previous color choice when adopting Wildward's RGBs.
            if (value == 0x17DEEB) { return 0x00DDCC; }
            if (value == 0xF4F5F7) { return 0xFFFFFF; }
            if (value == 0xFF981F) { return 0xFFAA55; }
            if (value == 0x66E99C) { return 0x55FF99; }
            if (value == 0xFF6375) { return 0xFF5566; }
            if (value == 0xF0D65B) { return 0xFFCC33; }
        }
        return value;
    }

    function upgradeColors() as Void {
        var keys = ["AccentColor", "SecondHandColor", "TongueColor", "EyeColor",
            "TextColor", "BatteryColor", "BackgroundColor"];
        for (var i = 0; i < keys.size(); i++) {
            var saved = Application.Properties.getValue(keys[i]);
            var migrated = normalizeColor(keys[i], saved);
            if (migrated != saved) { Application.Properties.setValue(keys[i], migrated); }
        }
    }

    function values(key as String) as Array<Number> {
        if (key.equals("BatteryColor")) { return [0xFFFFFF, 0x00DDCC]; }
        if (key.equals("BackgroundColor")) { return [0x000000, 0x555555, 0xAAAAAA, 0xFFFFFF, 0x0A1628]; }
        if (isColor(key)) { return paletteValues(); }
        if (key.equals("TimeFormat") || key.equals("TimeSize")) { return [0, 1, 2]; }
        return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
    }

    function labels(key as String) as Array<ResourceId> {
        if (key.equals("BatteryColor")) { return [Rez.Strings.ColorWhite, Rez.Strings.ColorCyan]; }
        if (key.equals("BackgroundColor")) {
            return [Rez.Strings.ColorBlack, Rez.Strings.ColorDarkGray, Rez.Strings.ColorLightGray,
                Rez.Strings.ColorWhite, Rez.Strings.ColorNavy];
        }
        if (isColor(key)) { return paletteLabels(); }
        if (key.equals("TimeFormat")) { return [Rez.Strings.SystemFormat, Rez.Strings.Hour12, Rez.Strings.Hour24]; }
        if (key.equals("TimeSize")) { return [Rez.Strings.Small, Rez.Strings.Normal, Rez.Strings.Large]; }
        return [Rez.Strings.None, Rez.Strings.HeartRate, Rez.Strings.Steps, Rez.Strings.Calories,
            Rez.Strings.SpO2, Rez.Strings.Altitude, Rez.Strings.Battery, Rez.Strings.Weather,
            Rez.Strings.Pressure, Rez.Strings.BodyBattery, Rez.Strings.Stress,
            Rez.Strings.Respiration, Rez.Strings.Notifications, Rez.Strings.Seconds,
            Rez.Strings.ActiveCalories, Rez.Strings.DayDistance, Rez.Strings.WeekDistance];
    }

    function choiceDefault(key as String) as Number {
        var keys = slotKeys();
        var defaults = slotDefaults();
        for (var i = 0; i < keys.size(); i++) { if (key.equals(keys[i])) { return defaults[i]; } }
        if (key.equals("AccentColor") || key.equals("SecondHandColor")) { return 0x00DDCC; }
        if (key.equals("TongueColor")) { return 0x55AAFF; }
        if (key.equals("TextColor") || key.equals("EyeColor")) { return 0xFFFFFF; }
        if (key.equals("BatteryColor")) { return 0x00DDCC; }
        if (key.equals("BackgroundColor")) { return 0; }
        return key.equals("TimeSize") ? 1 : 0;
    }

    function choice(key as String) as Number {
        var value = normalizeColor(key, Application.Properties.getValue(key));
        var options = values(key);
        for (var i = 0; i < options.size(); i++) { if (value == options[i]) { return options[i]; } }
        return choiceDefault(key);
    }

    function choiceText(key as String) as String {
        var options = values(key);
        var names = labels(key);
        var value = choice(key);
        for (var i = 0; i < options.size(); i++) { if (value == options[i]) { return string(names[i]); } }
        return "--";
    }
}
