import Toybox.Application;
import Toybox.Graphics;
import Toybox.Lang;
import Toybox.Math;
import Toybox.System;
import Toybox.Time;
import Toybox.Time.Gregorian;
import Toybox.WatchUi;
import Toybox.Weather;

// Centered design coordinates; the usable radius comes from the actual Dc size.
// PreviewMode uses explicitly marked sample values.
class ClownWatchView extends WatchUi.WatchFace {
    private var _portal as Graphics.BitmapType?;
    private var _showPortal as Boolean = true;
    private var _accent as Number = 0x00DDCC;
    private var _textColor as Number = 0xFFFFFF;
    private var _labelColor as Number = 0xB8B8B8;
    private var _batteryColor as Number = 0x00DDCC;
    private var _secondHandColor as Number = 0x00DDCC;
    private var _tongueColor as Number = 0x55AAFF;
    private var _eyeColor as Number = 0xFFFFFF;
    private var _background as Number = 0;
    private var _accentDim as Number = 0x17414A;
    private var _accentDark as Number = 0x102C34;
    private var _sleeping as Boolean = false;
    private var _preview as Boolean = false;
    private var _data as ClownData;
    private var _runeRing as ClownRuneRing;
    private var _slots as Array<Number> = [1, 2, 3, 4, 5, 7, 6, 8];
    private var _showRing as Boolean = true;
    private var _showSecondHand as Boolean = true;
    private var _showSmile as Boolean = true;
    private var _showDate as Boolean = true;
    private var _showDividers as Boolean = true;
    private var _timeFormat as Number = 0;
    private var _timeSize as Number = 1;
    private var _fontsDirty as Boolean = true;
    private var _scale as Float = 1.0;
    private var _cx as Number = 0;
    private var _cy as Number = 0;
    private var _radius as Float = 0.0;
    private var _labelFont as Graphics.FontType = Graphics.FONT_XTINY;
    private var _valueFont as Graphics.FontType = Graphics.FONT_SMALL;
    private var _microFont as Graphics.FontType = Graphics.FONT_XTINY;
    private var _timeFont as Graphics.FontType = Graphics.FONT_NUMBER_HOT;
    private var _compactFont as Graphics.FontType = Graphics.FONT_XTINY;
    private var _smallValueFont as Graphics.FontType = Graphics.FONT_SMALL;

    function initialize() {
        WatchFace.initialize();
        _data = new ClownData();
        _runeRing = new ClownRuneRing();
        loadSettings();
    }

    function loadSettings() as Void {
        _showPortal = ClownConfig.flag("ShowPortalBackground", true);
        _preview = ClownConfig.flag("PreviewMode", false);
        _accent = ClownConfig.choice("AccentColor");
        // Keep unlit strokes visible on the watch at lower display brightness.
        _accentDim = dimColor(_accent, 0.38);
        _accentDark = dimColor(_accent, 0.25);
        _textColor = ClownConfig.choice("TextColor");
        _labelColor = dimColor(_textColor, 0.72);
        _secondHandColor = ClownConfig.choice("SecondHandColor");
        _tongueColor = ClownConfig.choice("TongueColor");
        _eyeColor = ClownConfig.choice("EyeColor");
        _batteryColor = ClownConfig.choice("BatteryColor");
        _background = ClownConfig.choice("BackgroundColor");
        _showRing = ClownConfig.flag("ShowRing", true);
        _showSecondHand = ClownConfig.flag("ShowSecondHand", true);
        _showSmile = ClownConfig.flag("ShowSmile", true);
        _showDate = ClownConfig.flag("ShowDate", true);
        _showDividers = ClownConfig.flag("ShowDividers", true);
        _timeFormat = ClownConfig.choice("TimeFormat");
        _timeSize = ClownConfig.choice("TimeSize");
        var keys = ClownConfig.slotKeys();
        for (var i = 0; i < keys.size(); i++) { _slots[i] = ClownConfig.choice(keys[i]); }
        _data.invalidate();
        _fontsDirty = true;
    }

    function onLayout(dc as Graphics.Dc) as Void {
        System.println("width=" + dc.getWidth() + " height=" + dc.getHeight());
        _portal = WatchUi.loadResource(Rez.Drawables.GatekeeperPortal) as Graphics.BitmapType;
        _cx = dc.getWidth() / 2;
        _cy = dc.getHeight() / 2;
        var diameter = dc.getWidth() < dc.getHeight() ? dc.getWidth() : dc.getHeight();

        // 【修改】固定安全边距1px，不再使用比例inset
        var hardSafeMargin = 1.0;
        _radius = diameter / 2.0 - hardSafeMargin;

        // The internal artwork fills a 430‑unit diameter, centered on the device.
        _scale = _radius * 2.0 / 430.0;
        _runeRing.layout(_cx, _cy, _radius, _scale);
        System.println("ClownWatch layout: centerX=" + _cx + " centerY=" + _cy
        + " radius=" + _radius + " scale=" + _scale
        + " ringRadius=" + _radius);
        rebuildFonts(dc);
    }

    private function rebuildFonts(dc as Graphics.Dc) as Void {
        _labelFont = makeFont(18, Graphics.FONT_SMALL);
        _valueFont = makeFont(31, Graphics.FONT_SMALL);
        _microFont = makeFont(10, Graphics.FONT_XTINY);
        _compactFont = makeFont(16, Graphics.FONT_XTINY);
        _smallValueFont = makeFont(24, Graphics.FONT_SMALL);
        // Fit the widest clock string once to keep all hours clear of metrics.
        var maximum = _timeSize == 0 ? 108 : (_timeSize == 2 ? 142 : 132);
        for (var size = maximum; size >= 64; size -= 2) {
            _timeFont = makeFont(size, Graphics.FONT_NUMBER_HOT);
            if (dc.getTextWidthInPixels("00:00", _timeFont) <= px(_timeSize == 2 ? 264 : 248)) { break; }
        }
        _fontsDirty = false;
    }


    private function makeFont(size as Number, fallback as Graphics.FontDefinition) as Graphics.FontType {
        var faces = size >= 64 ? ["RobotoCondensedBold", "RobotoCondensedRegular"]
            : ["RobotoCondensedRegular", "RobotoRegular"];
        var font = Graphics.getVectorFont({:face => faces, :size => px(size)});
        return font != null ? font : fallback;
    }

    private function dimColor(color as Number, factor as Float) as Number {
        return ((((color >> 16) & 255) * factor).toNumber() << 16)
            | ((((color >> 8) & 255) * factor).toNumber() << 8)
            | ((color & 255) * factor).toNumber();
    }

    private function px(value as Numeric) as Number {
        return (value * _scale).toNumber();
    }

    private function screenX(value as Numeric) as Number {
        return _cx + px(value - 227);
    }

    private function screenY(value as Numeric) as Number {
        return _cy + px(value - 227);
    }

    private function text(dc as Graphics.Dc, x as Numeric, y as Numeric,
                          font as Graphics.FontType, value as String, color as Number) as Void {
        dc.setColor(color, Graphics.COLOR_TRANSPARENT);
        dc.drawText(screenX(x), screenY(y), font, value,
            Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);
    }

    private function line(dc as Graphics.Dc, x1 as Numeric, y1 as Numeric,
                          x2 as Numeric, y2 as Numeric, color as Number, thickness as Numeric) as Void {
        dc.setColor(color, Graphics.COLOR_TRANSPARENT);
        dc.setPenWidth(px(thickness) > 0 ? px(thickness) : 1);
        dc.drawLine(screenX(x1), screenY(y1), screenX(x2), screenY(y2));
    }

    function onUpdate(dc as Graphics.Dc) as Void {
        if (_fontsDirty) { rebuildFonts(dc); }
        var background = _sleeping ? Graphics.COLOR_BLACK : _background;
        dc.setColor(background, background);
        dc.clear();
        dc.setAntiAlias(true);
        if (_sleeping) {
            // Sparse moving AOD placeholder; full device burn-in validation pending.
            var minute = System.getClockTime().min;
            var offset = (minute % 3 - 1) * 4;
            text(dc, 227 + offset, 227 + offset, _valueFont, clockText(), dimColor(_textColor, 0.45));
            return;
        }
        if (_showPortal && _portal != null) {
            dc.drawBitmap(_cx - _portal.getWidth() / 2, _cy - _portal.getHeight() / 2, _portal);
        }
        var second = System.getClockTime().sec;
        _data.setSecond(second);
        _data.refresh(_slots, _preview);
        if (_showRing) { drawRing(dc, second); }
        if (_showSmile) { drawFace(dc); }
        if (_showDividers) { drawDividers(dc); }
        drawMetric(dc, 0, 115, 129, 153, 80);
        drawMetric(dc, 1, 337, 129, 153, 84);
        drawMetric(dc, 2, 68, 214, 240, 52);
        drawMetric(dc, 3, 386, 214, 240, 52);
        text(dc, 227, 228, _timeFont, clockText(), _textColor);
        var is12 = _timeFormat == 1 || (_timeFormat == 0 && !System.getDeviceSettings().is24Hour);
        if (is12 && !_preview) { text(dc, 227, 274, _microFont, System.getClockTime().hour < 12 ? "AM" : "PM", _textColor); }
        drawMetric(dc, 4, 120, 299, 328, 80);
        if (_showDate) { text(dc, 227, 299, _valueFont, dateText(), _textColor); }
        drawInlineMetric(dc, 5, 227, 331, 84);
        drawMetric(dc, 6, 334, 299, 330, 84);
        drawMetric(dc, 7, 227, 379, 402, 90);
        if (_slots[7] == ClownMetrics.PRESSURE) { drawPressureTrend(dc); }
        if (_preview) { text(dc, 227, 45, _microFont, "DEMO", dimColor(_textColor, 0.4)); }
        // WatchFace.onUpdate runs once per second while the AMOLED display is awake.
        // Always use the real second, including in the sample-data preview mode.
        if (_showSecondHand) {
            dc.setColor(_secondHandColor, Graphics.COLOR_TRANSPARENT);
            dc.fillPolygon(ClownSecondHand.points(_cx, _cy, _radius, second));
        }
        dc.setPenWidth(1);
    }

    private function metricColor(id as Number) as Number {
        return ClownMetrics.color(id, _data.value(id), _textColor, _batteryColor);
    }

    // Small labels and consistent line icons keep the readings dominant.
    private function drawMetricHeader(dc as Graphics.Dc, x as Number, y as Number,
                                     id as Number, label as String, width as Number) as Void {
        var strokes = [] as Array<Array<Number>>;
        if (id == ClownMetrics.HR) {
            strokes = [[0,5,-6,-1],[-6,-1,-6,-4],[-6,-4,-3,-6],[-3,-6,0,-3],
                [0,-3,3,-6],[3,-6,6,-4],[6,-4,6,-1],[6,-1,0,5]];
        } else if (id == ClownMetrics.STEPS) {
            strokes = [[-5,-5,-2,-6],[-2,-6,-1,0],[-1,0,-4,1],[-4,1,-5,-5],
                [1,0,4,-1],[4,-1,5,5],[5,5,2,6],[2,6,1,0]];
        } else if (id == ClownMetrics.CALORIES || id == ClownMetrics.ACTIVE_CALORIES) {
            strokes = [[0,-7,-1,-2],[-1,-2,-4,-4],[-4,-4,-6,1],[-6,1,-4,5],
                [-4,5,0,6],[0,6,4,4],[4,4,5,0],[5,0,0,-7],[0,6,-1,2],[-1,2,1,0]];
        } else if (id == ClownMetrics.SPO2) {
            strokes = [[0,-7,-5,0],[-5,0,-5,3],[-5,3,-2,6],[-2,6,2,6],
                [2,6,5,3],[5,3,5,0],[5,0,0,-7]];
        } else if (id == ClownMetrics.ALTITUDE) {
            strokes = [[-7,5,0,-6],[0,-6,7,5],[7,5,-7,5],[-3,-1,0,1],[0,1,3,-1]];
        } else if (id == ClownMetrics.PRESSURE) {
            strokes = [[-6,4,-6,-2],[-6,-2,-3,-5],[-3,-5,3,-5],[3,-5,6,-2],
                [6,-2,6,4],[-6,4,6,4],[0,1,3,-2],[-3,6,3,6]];
        }
        var font = _compactFont;
        var labelWidth = dc.getTextWidthInPixels(label, font) / _scale;
        if (strokes.size() == 0 || labelWidth + 20 > width) {
            text(dc, x, y, dc.getTextWidthInPixels(label, _labelFont) > px(width) ? font : _labelFont, label, _labelColor);
            return;
        }
        var left = x - (labelWidth + 20) / 2;
        var color = id == ClownMetrics.HR ? metricColor(id) : _accent;
        for (var i = 0; i < strokes.size(); i++) {
            var p = strokes[i];
            line(dc, left + 7 + p[0], y + p[1], left + 7 + p[2], y + p[3], color, 1.6);
        }
        text(dc, left + 20 + labelWidth / 2, y, font, label, _labelColor);
    }

    private function fittedValue(dc as Graphics.Dc, x as Number, y as Number,
                                 id as Number, width as Number) as Void {
        var value = _data.text(id);
        var font = _valueFont;
        if (dc.getTextWidthInPixels(value, font) > px(width)) { font = _smallValueFont; }
        if (dc.getTextWidthInPixels(value, font) > px(width)) { font = _compactFont; }
        text(dc, x, y, font, value, metricColor(id));
    }

    private function drawMetric(dc as Graphics.Dc, slot as Number, x as Number,
                                labelY as Number, valueY as Number, width as Number) as Void {
        var id = _slots[slot];
        if (id == ClownMetrics.NONE) { return; }
        var label = ClownMetrics.label(id, _data.feet, _data.miles);
        drawMetricHeader(dc, x, labelY, id, label, width);
        if (slot == 6 && id == ClownMetrics.BATTERY) {
            drawBattery(dc, x - 28, valueY);
            fittedValue(dc, x + 6, valueY, id, width - 22);
        } else { fittedValue(dc, x, valueY, id, width); }
    }

    private function drawInlineMetric(dc as Graphics.Dc, slot as Number, x as Number, y as Number, width as Number) as Void {
        var id = _slots[slot];
        if (id == ClownMetrics.NONE) { return; }
        if (id == ClownMetrics.WEATHER) {
            if (_data.value(id) != null) { drawWeather(dc, x - 27, y); }
            fittedValue(dc, x + 9, y, id, width - 20);
        } else {
            // Keep the selected metric identifiable even in this single-line slot.
            text(dc, x, y - 6, _microFont, ClownMetrics.label(id, _data.feet, _data.miles), _labelColor);
            var font = dc.getTextWidthInPixels(_data.text(id), _smallValueFont) > px(width) ? _compactFont : _smallValueFont;
            text(dc, x, y + 9, font, _data.text(id), metricColor(id));
        }
    }

    private function clockText() as String {
        if (_preview && !_sleeping) { return "09:30"; }
        var clock = System.getClockTime();
        var hour = clock.hour;
        if (_timeFormat == 1 || (_timeFormat == 0 && !System.getDeviceSettings().is24Hour)) {
            hour = hour % 12;
            if (hour == 0) { hour = 12; }
        }
        return hour.format("%02d") + ":" + clock.min.format("%02d");
    }

    private function dateText() as String {
        if (_preview) { return "WED 12"; }
        var date = Gregorian.info(Time.now(), Time.FORMAT_SHORT);
        var days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
        return days[date.day_of_week - 1] + " " + date.day.format("%02d");
    }

    private function drawRing(dc as Graphics.Dc, second as Number) as Void {
        // Keep the second track at the screen edge; symbols fit inside it.
        _runeRing.draw(dc, second, dimColor(_accent, 0.75), _accentDim);
        var outerTrack = _radius;
        var innerTrack = outerTrack - px(4);
        var innerLitColor = dimColor(_accent, 0.65);
        for (var tick = 0; tick < 120; tick++) {
            var angle = tick * Math.PI / 60.0;
            var lit = ClownSecondHand.isElapsed(tick, 120, second);
            dc.setColor(lit ? _accent : _accentDim, Graphics.COLOR_TRANSPARENT);
            dc.fillCircle(_cx + Math.sin(angle) * outerTrack,
                _cy - Math.cos(angle) * outerTrack, px(1.2));
            if (tick % 10 != 0) {
                dc.setColor(lit ? innerLitColor : _accentDark, Graphics.COLOR_TRANSPARENT);
                dc.fillCircle(_cx + Math.sin(angle) * innerTrack,
                    _cy - Math.cos(angle) * innerTrack, px(1.2));
            }
        }
        for (var hour = 0; hour < 12; hour++) {
            var angle = hour * Math.PI / 6.0;
            var color = ClownSecondHand.isElapsed(hour, 12, second) ? _accent : _accentDim;
            radialLine(dc, angle, outerTrack - px(10), outerTrack + px(1.2), color, 3);
        }
    }

    private function radialLine(dc as Graphics.Dc, angle as Numeric,
                                inner as Numeric, outer as Numeric, color as Number,
                                thickness as Number) as Void {
        dc.setColor(color, Graphics.COLOR_TRANSPARENT);
        dc.setPenWidth(px(thickness) > 0 ? px(thickness) : 1);
        dc.drawLine(_cx + Math.sin(angle) * inner, _cy - Math.cos(angle) * inner,
            _cx + Math.sin(angle) * outer, _cy - Math.cos(angle) * outer);
    }

    private function drawDividers(dc as Graphics.Dc) as Void {
        line(dc, 97, 178, 184, 178, 0x193039, 1);
        line(dc, 270, 178, 357, 178, 0x193039, 1);
        line(dc, 102, 281, 352, 281, 0x1D2E35, 1);
        line(dc, 160, 356, 294, 356, 0x1D2E35, 1);
    }

    private function drawFace(dc as Graphics.Dc) as Void {
        var eyeHalo = dimColor(_eyeColor, 0.12);
        var eyeEdge = dimColor(_eyeColor, 0.55);
        for (var eye = 0; eye < 2; eye++) {
            var x = 192 + eye * 70;
            line(dc, x - 20, 86, x + 20, 86, eyeHalo, 17);
            line(dc, x, 66, x, 106, eyeHalo, 17);
            line(dc, x - 20, 86, x + 20, 86, eyeEdge, 13);
            line(dc, x, 66, x, 106, eyeEdge, 13);
            line(dc, x - 20, 86, x + 20, 86, _eyeColor, 11);
            line(dc, x, 66, x, 106, _eyeColor, 11);
        }
        for (var y = 127; y <= 172; y++) {
            var halfWidth = 27.0;
            if (y > 145) {
                var dy = (y - 145).toFloat();
                halfWidth = Math.sqrt(27.0 * 27.0 - dy * dy);
            }
            var shade = (y - 127) / 45.0;
            line(dc, 227 - halfWidth, y, 227 + halfWidth, y,
                dimColor(_tongueColor, 0.12 + shade * 0.88), 1);
        }
        line(dc, 164, 126, 290, 126, dimColor(_tongueColor, 0.18), 3);
        line(dc, 174, 126, 280, 126, _tongueColor, 1);
        line(dc, 200, 127, 200, 145, dimColor(_tongueColor, 0.45), 4);
        line(dc, 254, 127, 254, 145, dimColor(_tongueColor, 0.45), 4);
        dc.setPenWidth(px(4));
        dc.setColor(dimColor(_tongueColor, 0.45), Graphics.COLOR_TRANSPARENT);
        dc.drawArc(screenX(227), screenY(145), px(27), Graphics.ARC_CLOCKWISE, 0, 180);
        dc.setPenWidth(px(1) > 0 ? px(1) : 1);
        dc.setColor(_tongueColor, Graphics.COLOR_TRANSPARENT);
        dc.drawArc(screenX(227), screenY(145), px(27), Graphics.ARC_CLOCKWISE, 0, 180);
        line(dc, 200, 127, 200, 145, _tongueColor, 1);
        line(dc, 254, 127, 254, 145, _tongueColor, 1);
        line(dc, 227, 127, 227, 150, _tongueColor, 2);
    }

    private function drawWeather(dc as Graphics.Dc, x as Number, y as Number) as Void {
        var condition = _data.weatherCondition;
        if (condition == null) { return; }
        var sunny = condition == Weather.CONDITION_CLEAR || condition == Weather.CONDITION_FAIR
            || condition == Weather.CONDITION_MOSTLY_CLEAR;
        var partly = condition == Weather.CONDITION_PARTLY_CLOUDY || condition == Weather.CONDITION_PARTLY_CLEAR;
        var rain = condition == Weather.CONDITION_RAIN || condition == Weather.CONDITION_SHOWERS
            || condition == Weather.CONDITION_LIGHT_RAIN || condition == Weather.CONDITION_HEAVY_RAIN
            || condition == Weather.CONDITION_DRIZZLE || condition == Weather.CONDITION_CHANCE_OF_SHOWERS;
        var snow = condition == Weather.CONDITION_SNOW || condition == Weather.CONDITION_LIGHT_SNOW
            || condition == Weather.CONDITION_HEAVY_SNOW || condition == Weather.CONDITION_FLURRIES;
        var thunder = condition == Weather.CONDITION_THUNDERSTORMS;
        if (sunny || partly) {
            var sx = partly ? x - 4 : x;
            var sy = partly ? y - 4 : y;
            dc.setColor(0xFFCC33, Graphics.COLOR_TRANSPARENT);
            dc.setPenWidth(1);
            dc.drawCircle(screenX(sx), screenY(sy), px(4));
            for (var i = 0; i < 8; i++) {
                var a = i * Math.PI / 4.0;
                line(dc, sx + Math.sin(a) * 6, sy + Math.cos(a) * 6,
                    sx + Math.sin(a) * 8, sy + Math.cos(a) * 8, 0xFFCC33, 1.5);
            }
        }
        if (!sunny) {
            dc.setColor(0x93BCD1, Graphics.COLOR_TRANSPARENT);
            dc.fillCircle(screenX(x-3), screenY(y), px(4));
            dc.fillCircle(screenX(x+1), screenY(y-2), px(5));
            dc.fillCircle(screenX(x+5), screenY(y), px(3));
            if (rain) {
                line(dc, x-3, y+6, x-5, y+9, 0x55AAFF, 1.5);
                line(dc, x+3, y+6, x+1, y+9, 0x55AAFF, 1.5);
            } else if (snow) {
                line(dc, x-4, y+7, x+4, y+7, 0xC8EFFF, 1);
                line(dc, x, y+4, x, y+10, 0xC8EFFF, 1);
            } else if (thunder) {
                line(dc, x+1, y+3, x-2, y+7, 0xFFCC33, 1.5);
                line(dc, x-2, y+7, x+2, y+7, 0xFFCC33, 1.5);
                line(dc, x+2, y+7, x-1, y+11, 0xFFCC33, 1.5);
            }
        }
    }

    private function drawBattery(dc as Graphics.Dc, x as Number, y as Number) as Void {
        dc.setColor(metricColor(ClownMetrics.BATTERY), Graphics.COLOR_TRANSPARENT);
        dc.setPenWidth(1);
        dc.drawRoundedRectangle(screenX(x-6), screenY(y-8), px(12), px(18), px(2));
        dc.drawRectangle(screenX(x-2), screenY(y-11), px(4), px(3));
        var battery = _data.value(ClownMetrics.BATTERY);
        if (battery != null && battery > 0 && battery <= 100) {
            var fill = Math.round(14 * battery / 100.0).toNumber();
            dc.setColor(metricColor(ClownMetrics.BATTERY), Graphics.COLOR_TRANSPARENT);
            dc.fillRectangle(screenX(x-3), screenY(y+7-fill), px(7), px(fill));
        }
    }

    private function drawPressureTrend(dc as Graphics.Dc) as Void {
        var series = _data.pressureSeries;
        if (series.size() < 2) { return; }
        var low = series[0];
        var high = series[0];
        for (var i = 1; i < series.size(); i++) {
            if (series[i] < low) { low = series[i]; }
            if (series[i] > high) { high = series[i]; }
        }
        var span = high - low;
        if (span < 1.0) { low -= (1.0-span)/2; span = 1.0; }
        for (var i = 1; i < series.size(); i++) {
            line(dc, 136 + (i-1)*48.0/(series.size()-1), 402 - (series[i-1]-low)*20/span,
                136 + i*48.0/(series.size()-1), 402 - (series[i]-low)*20/span, _accent, 1.5);
        }
        text(dc, 306, 402, _compactFont, "hPa", _textColor);
    }

    function onEnterSleep() as Void {
        _sleeping = true;
        WatchUi.requestUpdate();
    }

    function onExitSleep() as Void {
        _sleeping = false;
        WatchUi.requestUpdate();
    }
}
