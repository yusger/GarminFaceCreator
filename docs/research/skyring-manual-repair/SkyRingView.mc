import Toybox.WatchUi;
import Toybox.Graphics;
import Toybox.System;
import Toybox.Time;
import Toybox.Time.Gregorian;
import Toybox.ActivityMonitor;
import Toybox.SensorHistory;
import Toybox.Complications;
import Toybox.Weather;
import Toybox.Lang;
import Toybox.Math;

class SkyRingView extends WatchUi.WatchFace {
    var _fonts = {};
    var _icons;
    var _smallIcons;
    var _isAod as Boolean = false;
    var _w as Number = 454;
    var _h as Number = 454;
    var _sx as Float = 1.0f;
    var _sy as Float = 1.0f;

    var _hr as Float = -1.0f;
    var _stress as Float = -1.0f;
    var _recovery as Float = -1.0f;
    var _steps as Float = -1.0f;
    var _intensity as Float = -1.0f;
    var _calories as Float = -1.0f;
    var _floors as Float = -1.0f;
    var _battery as Float = -1.0f;
    var _altitude as Float or Null = null;
    var _weather as Weather.CurrentConditions or Null = null;

    function initialize() {
        WatchFace.initialize();
    }

    function onLayout(dc as Dc) as Void {
        _w = dc.getWidth();
        _h = dc.getHeight();
        _sx = _w / 454.0f;
        _sy = _h / 454.0f;
        _fonts = {};
        _icons = WatchUi.loadResource(Rez.Fonts.F_icons22);
        _smallIcons = WatchUi.loadResource(Rez.Fonts.F_icons16);
    }

    function onShow() as Void {
    }

    function onUpdate(dc as Dc) as Void {
        _collectData(_isAod);
        _draw(dc);
    }

    function onEnterSleep() as Void {
        _isAod = true;
        _collectData(true);
        WatchUi.requestUpdate();
    }

    function onExitSleep() as Void {
        _isAod = false;
        WatchUi.requestUpdate();
    }

    function _collectData(lowPower as Boolean) as Void {
        if (!lowPower) {
            try {
                var hrIter = SensorHistory.getHeartRateHistory({:period => 1, :order => SensorHistory.ORDER_NEWEST_FIRST});
                var hrSample = hrIter.next();
                if (hrSample != null && hrSample.data != null && hrSample.data > 0) {
                    _hr = hrSample.data.toFloat();
                } else {
                    _hr = -1.0f;
                }
            } catch (e) {
                _hr = -1.0f;
            }

            try {
                var am = ActivityMonitor.getInfo();
                if (am != null) {
                    _steps = (am.steps != null) ? am.steps.toFloat() : -1.0f;
                    _calories = (am.calories != null) ? am.calories.toFloat() : -1.0f;
                    _floors = (am.floorsClimbed != null) ? am.floorsClimbed.toFloat() : -1.0f;
                    if (am.activeMinutesDay != null && am.activeMinutesDay.total != null) {
                        _intensity = am.activeMinutesDay.total.toFloat();
                    } else {
                        _intensity = -1.0f;
                    }
                }
            } catch (e) {
            }

            try {
                var stats = System.getSystemStats();
                if (stats != null && stats.battery != null && stats.battery <= 100) {
                    _battery = stats.battery.toFloat();
                } else {
                    _battery = -1.0f;
                }
            } catch (e) {
                _battery = -1.0f;
            }

            try {
                var elevIter = SensorHistory.getElevationHistory({:period => 1, :order => SensorHistory.ORDER_NEWEST_FIRST});
                var elevSample = elevIter.next();
                if (elevSample != null && elevSample.data != null) {
                    _altitude = elevSample.data.toFloat() * 3.280839895f;
                } else {
                    _altitude = null;
                }
            } catch (e) {
                _altitude = null;
            }

            try {
                var stressComp = Complications.getComplication(new Complications.Id(Complications.COMPLICATION_TYPE_STRESS));
                if (stressComp != null && stressComp.value != null) {
                    _stress = stressComp.value.toFloat();
                } else {
                    _stress = -1.0f;
                }
            } catch (e) {
                _stress = -1.0f;
            }

            try {
                var recComp = Complications.getComplication(new Complications.Id(Complications.COMPLICATION_TYPE_RECOVERY_TIME));
                if (recComp != null && recComp.value != null) {
                    _recovery = recComp.value.toFloat() / 60.0f;
                } else {
                    _recovery = -1.0f;
                }
            } catch (e) {
                _recovery = -1.0f;
            }
        }

        if (!lowPower) {
            try { _weather = Weather.getCurrentConditions(); }
            catch (e) { _weather = null; }
        }
    }

    function _draw(dc as Dc) as Void {
        dc.setColor(0xFF000000, 0xFF000000);
        dc.clear();
        dc.setBlendMode(Graphics.BLEND_MODE_SOURCE_OVER);

        var now = Time.now();
        var info = Gregorian.info(now, Time.FORMAT_SHORT);
        var hour = info.hour;
        var minute = info.min;
        var second = _isAod ? 0 : info.sec;

        if (_isAod) {
            _drawTime(dc, hour, minute);
            _label(dc, 177, 350, 100, 24, 23, _battery >= 0 ? _battery.format("%.0f") + "%" : "--", 0x777777);
            return;
        }
        _drawBackground(dc);
        _drawSkyRing(dc);
        _drawTicks(dc);
        _drawMoon(dc);
        _drawSun(dc);
        _drawSunTexts(dc);
        _drawDate(dc, info);
        _drawTime(dc, hour, minute);
        _drawSampleDecorations(dc);
        _drawMetrics(dc);
        _drawWeather(dc);
    }

    function _drawBackground(dc as Dc) as Void {
        dc.setFill(Graphics.createColor(255, 0, 0, 0));
        dc.fillCircle(_w / 2, _h / 2, _w / 2);
    }

    function _drawSkyRing(dc as Dc) as Void {
        dc.setColor(0x5c4e30, Graphics.COLOR_TRANSPARENT); dc.setPenWidth(12); dc.drawLine(226.9912*_sx, 7.4994*_sy, 246.1831*_sx, 7.3378*_sy);
        dc.setColor(0x5c4e30, Graphics.COLOR_TRANSPARENT); dc.setPenWidth(12); dc.drawLine(246.122*_sx, 8.3339*_sy, 265.2549*_sx, 9.8455*_sy);
        dc.setColor(0x5c4e30, Graphics.COLOR_TRANSPARENT); dc.setPenWidth(12); dc.drawLine(265.1072*_sx, 10.8326*_sy, 284.0356*_sx, 14.006*_sy);
        dc.setColor(0x5c4e30, Graphics.COLOR_TRANSPARENT); dc.setPenWidth(12); dc.drawLine(283.8024*_sx, 14.9764*_sy, 302.3822*_sx, 19.7875*_sy);
        dc.setColor(0x5c4e30, Graphics.COLOR_TRANSPARENT); dc.setPenWidth(12); dc.drawLine(302.0654*_sx, 20.7339*_sy, 320.1551*_sx, 27.146*_sy);
        dc.setColor(0x5c4e30, Graphics.COLOR_TRANSPARENT); dc.setPenWidth(12); dc.drawLine(319.757*_sx, 28.0612*_sy, 337.219*_sx, 36.0255*_sy);
        dc.setColor(0x5c4e30, Graphics.COLOR_TRANSPARENT); dc.setPenWidth(12); dc.drawLine(336.7427*_sx, 36.9025*_sy, 353.4441*_sx, 46.3584*_sy);
        dc.setColor(0x5c4e30, Graphics.COLOR_TRANSPARENT); dc.setPenWidth(12); dc.drawLine(352.8932*_sx, 47.1906*_sy, 368.7069*_sx, 58.0662*_sy);
        dc.setColor(0x5c4e30, Graphics.COLOR_TRANSPARENT); dc.setPenWidth(12); dc.drawLine(368.0855*_sx, 58.8471*_sy, 382.8912*_sx, 71.0596*_sy);
        dc.setColor(0x5c4e30, Graphics.COLOR_TRANSPARENT); dc.setPenWidth(12); dc.drawLine(382.2041*_sx, 71.7834*_sy, 395.8891*_sx, 85.2398*_sy);
        dc.setColor(0x5c4e30, Graphics.COLOR_TRANSPARENT); dc.setPenWidth(12); dc.drawLine(395.1416*_sx, 85.901*_sy, 407.6017*_sx, 100.4989*_sy);
        dc.setColor(0x5c4e30, Graphics.COLOR_TRANSPARENT); dc.setPenWidth(12); dc.drawLine(406.7993*_sx, 101.0924*_sy, 417.9397*_sx, 116.7208*_sy);
        dc.setColor(0x5c4e30, Graphics.COLOR_TRANSPARENT); dc.setPenWidth(12); dc.drawLine(417.0887*_sx, 117.2421*_sy, 426.8246*_sx, 133.7819*_sy);
        dc.setColor(0x5c4e30, Graphics.COLOR_TRANSPARENT); dc.setPenWidth(12); dc.drawLine(425.9314*_sx, 134.2271*_sy, 434.1887*_sx, 151.5525*_sy);
        dc.setColor(0x5c4e30, Graphics.COLOR_TRANSPARENT); dc.setPenWidth(12); dc.drawLine(433.2601*_sx, 151.9181*_sy, 439.976*_sx, 169.8973*_sy);
        dc.setColor(0x5c4e30, Graphics.COLOR_TRANSPARENT); dc.setPenWidth(12); dc.drawLine(439.019*_sx, 170.1806*_sy, 444.1424*_sx, 188.6766*_sy);
        dc.setColor(0x5c4e30, Graphics.COLOR_TRANSPARENT); dc.setPenWidth(12); dc.drawLine(443.1644*_sx, 188.8755*_sy, 446.6562*_sx, 207.7477*_sy);
        dc.setColor(0x5c4e30, Graphics.COLOR_TRANSPARENT); dc.setPenWidth(12); dc.drawLine(445.6646*_sx, 207.8605*_sy, 447.4983*_sx, 226.9652*_sy);
        dc.setColor(0x5b4b30, Graphics.COLOR_TRANSPARENT); dc.setPenWidth(12); dc.drawLine(446.5006*_sx, 226.9912*_sy, 446.6622*_sx, 246.1831*_sy);
        dc.setColor(0x594631, Graphics.COLOR_TRANSPARENT); dc.setPenWidth(12); dc.drawLine(445.6661*_sx, 246.122*_sy, 444.1545*_sx, 265.2549*_sy);
        dc.setColor(0x574131, Graphics.COLOR_TRANSPARENT); dc.setPenWidth(12); dc.drawLine(443.1674*_sx, 265.1072*_sy, 439.994*_sx, 284.0356*_sy);
        dc.setColor(0x553c32, Graphics.COLOR_TRANSPARENT); dc.setPenWidth(12); dc.drawLine(439.0236*_sx, 283.8024*_sy, 434.2125*_sx, 302.3822*_sy);
        dc.setColor(0x533732, Graphics.COLOR_TRANSPARENT); dc.setPenWidth(12); dc.drawLine(433.2661*_sx, 302.0654*_sy, 426.854*_sx, 320.1551*_sy);
        dc.setColor(0x513233, Graphics.COLOR_TRANSPARENT); dc.setPenWidth(12); dc.drawLine(425.9388*_sx, 319.757*_sy, 417.9745*_sx, 337.219*_sy);
        dc.setColor(0x4f2d33, Graphics.COLOR_TRANSPARENT); dc.setPenWidth(12); dc.drawLine(417.0975*_sx, 336.7427*_sy, 407.6416*_sx, 353.4441*_sy);
        dc.setColor(0x4d2834, Graphics.COLOR_TRANSPARENT); dc.setPenWidth(12); dc.drawLine(406.8094*_sx, 352.8932*_sy, 395.9338*_sx, 368.7069*_sy);
        dc.setColor(0x4b2434, Graphics.COLOR_TRANSPARENT); dc.setPenWidth(12); dc.drawLine(395.1529*_sx, 368.0855*_sy, 382.9404*_sx, 382.8912*_sy);
        dc.setColor(0x442335, Graphics.COLOR_TRANSPARENT); dc.setPenWidth(12); dc.drawLine(382.2166*_sx, 382.2041*_sy, 368.7602*_sx, 395.8891*_sy);
        dc.setColor(0x3e2335, Graphics.COLOR_TRANSPARENT); dc.setPenWidth(12); dc.drawLine(368.099*_sx, 395.1416*_sy, 353.5011*_sx, 407.6017*_sy);
        dc.setColor(0x382236, Graphics.COLOR_TRANSPARENT); dc.setPenWidth(12); dc.drawLine(352.9076*_sx, 406.7993*_sy, 337.2792*_sx, 417.9397*_sy);
        dc.setColor(0x322137, Graphics.COLOR_TRANSPARENT); dc.setPenWidth(12); dc.drawLine(336.7579*_sx, 417.0887*_sy, 320.2181*_sx, 426.8246*_sy);
        dc.setColor(0x2c2137, Graphics.COLOR_TRANSPARENT); dc.setPenWidth(12); dc.drawLine(319.7729*_sx, 425.9314*_sy, 302.4475*_sx, 434.1887*_sy);
        dc.setColor(0x262038, Graphics.COLOR_TRANSPARENT); dc.setPenWidth(12); dc.drawLine(302.0819*_sx, 433.2601*_sy, 284.1027*_sx, 439.976*_sy);
        dc.setColor(0x201f39, Graphics.COLOR_TRANSPARENT); dc.setPenWidth(12); dc.drawLine(283.8194*_sx, 439.019*_sy, 265.3234*_sx, 444.1424*_sy);
        dc.setColor(0x1a1f39, Graphics.COLOR_TRANSPARENT); dc.setPenWidth(12); dc.drawLine(265.1245*_sx, 443.1644*_sy, 246.2523*_sx, 446.6562*_sy);
        dc.setColor(0x141e3a, Graphics.COLOR_TRANSPARENT); dc.setPenWidth(12); dc.drawLine(246.1395*_sx, 445.6646*_sy, 227.0348*_sx, 447.4983*_sy);
        dc.setColor(0x111d39, Graphics.COLOR_TRANSPARENT); dc.setPenWidth(12); dc.drawLine(227.0088*_sx, 446.5006*_sy, 207.8169*_sx, 446.6622*_sy);
        dc.setColor(0x111c37, Graphics.COLOR_TRANSPARENT); dc.setPenWidth(12); dc.drawLine(207.878*_sx, 445.6661*_sy, 188.7451*_sx, 444.1545*_sy);
        dc.setColor(0x101b35, Graphics.COLOR_TRANSPARENT); dc.setPenWidth(12); dc.drawLine(188.8928*_sx, 443.1674*_sy, 169.9644*_sx, 439.994*_sy);
        dc.setColor(0x0f1a34, Graphics.COLOR_TRANSPARENT); dc.setPenWidth(12); dc.drawLine(170.1976*_sx, 439.0236*_sy, 151.6178*_sx, 434.2125*_sy);
        dc.setColor(0x0e1932, Graphics.COLOR_TRANSPARENT); dc.setPenWidth(12); dc.drawLine(151.9346*_sx, 433.2661*_sy, 133.8449*_sx, 426.854*_sy);
        dc.setColor(0x0e1830, Graphics.COLOR_TRANSPARENT); dc.setPenWidth(12); dc.drawLine(134.243*_sx, 425.9388*_sy, 116.781*_sx, 417.9745*_sy);
        dc.setColor(0x0d172f, Graphics.COLOR_TRANSPARENT); dc.setPenWidth(12); dc.drawLine(117.2573*_sx, 417.0975*_sy, 100.5559*_sx, 407.6416*_sy);
        dc.setColor(0x0c162d, Graphics.COLOR_TRANSPARENT); dc.setPenWidth(12); dc.drawLine(101.1068*_sx, 406.8094*_sy, 85.2931*_sx, 395.9338*_sy);
        dc.setColor(0x0b152b, Graphics.COLOR_TRANSPARENT); dc.setPenWidth(12); dc.drawLine(85.9145*_sx, 395.1529*_sy, 71.1088*_sx, 382.9404*_sy);
        dc.setColor(0x0a142a, Graphics.COLOR_TRANSPARENT); dc.setPenWidth(12); dc.drawLine(71.7959*_sx, 382.2166*_sy, 58.1109*_sx, 368.7602*_sy);
        dc.setColor(0x0a1328, Graphics.COLOR_TRANSPARENT); dc.setPenWidth(12); dc.drawLine(58.8584*_sx, 368.099*_sy, 46.3983*_sx, 353.5011*_sy);
        dc.setColor(0x091226, Graphics.COLOR_TRANSPARENT); dc.setPenWidth(12); dc.drawLine(47.2007*_sx, 352.9076*_sy, 36.0603*_sx, 337.2792*_sy);
        dc.setColor(0x081124, Graphics.COLOR_TRANSPARENT); dc.setPenWidth(12); dc.drawLine(36.9113*_sx, 336.7579*_sy, 27.1754*_sx, 320.2181*_sy);
        dc.setColor(0x071023, Graphics.COLOR_TRANSPARENT); dc.setPenWidth(12); dc.drawLine(28.0686*_sx, 319.7729*_sy, 19.8113*_sx, 302.4475*_sy);
        dc.setColor(0x060f21, Graphics.COLOR_TRANSPARENT); dc.setPenWidth(12); dc.drawLine(20.7399*_sx, 302.0819*_sy, 14.024*_sx, 284.1027*_sy);
        dc.setColor(0x060e1f, Graphics.COLOR_TRANSPARENT); dc.setPenWidth(12); dc.drawLine(14.981*_sx, 283.8194*_sy, 9.8576*_sx, 265.3234*_sy);
        dc.setColor(0x050d1e, Graphics.COLOR_TRANSPARENT); dc.setPenWidth(12); dc.drawLine(10.8356*_sx, 265.1245*_sy, 7.3438*_sx, 246.2523*_sy);
        dc.setColor(0x080f21, Graphics.COLOR_TRANSPARENT); dc.setPenWidth(12); dc.drawLine(8.3354*_sx, 246.1395*_sy, 6.5017*_sx, 227.0348*_sy);
        dc.setColor(0x0b1223, Graphics.COLOR_TRANSPARENT); dc.setPenWidth(12); dc.drawLine(7.4994*_sx, 227.0088*_sy, 7.3378*_sx, 207.8169*_sy);
        dc.setColor(0x0e1425, Graphics.COLOR_TRANSPARENT); dc.setPenWidth(12); dc.drawLine(8.3339*_sx, 207.878*_sy, 9.8455*_sx, 188.7451*_sy);
        dc.setColor(0x111627, Graphics.COLOR_TRANSPARENT); dc.setPenWidth(12); dc.drawLine(10.8326*_sx, 188.8928*_sy, 14.006*_sx, 169.9644*_sy);
        dc.setColor(0x141829, Graphics.COLOR_TRANSPARENT); dc.setPenWidth(12); dc.drawLine(14.9764*_sx, 170.1976*_sy, 19.7875*_sx, 151.6178*_sy);
        dc.setColor(0x171a2b, Graphics.COLOR_TRANSPARENT); dc.setPenWidth(12); dc.drawLine(20.7339*_sx, 151.9346*_sy, 27.146*_sx, 133.8449*_sy);
        dc.setColor(0x191c2d, Graphics.COLOR_TRANSPARENT); dc.setPenWidth(12); dc.drawLine(28.0612*_sx, 134.243*_sy, 36.0255*_sx, 116.781*_sy);
        dc.setColor(0x1c1e30, Graphics.COLOR_TRANSPARENT); dc.setPenWidth(12); dc.drawLine(36.9025*_sx, 117.2573*_sy, 46.3584*_sx, 100.5559*_sy);
        dc.setColor(0x1f2032, Graphics.COLOR_TRANSPARENT); dc.setPenWidth(12); dc.drawLine(47.1906*_sx, 101.1068*_sy, 58.0662*_sx, 85.2931*_sy);
        dc.setColor(0x222234, Graphics.COLOR_TRANSPARENT); dc.setPenWidth(12); dc.drawLine(58.8471*_sx, 85.9145*_sy, 71.0596*_sx, 71.1088*_sy);
        dc.setColor(0x252436, Graphics.COLOR_TRANSPARENT); dc.setPenWidth(12); dc.drawLine(71.7834*_sx, 71.7959*_sy, 85.2398*_sx, 58.1109*_sy);
        dc.setColor(0x282638, Graphics.COLOR_TRANSPARENT); dc.setPenWidth(12); dc.drawLine(85.901*_sx, 58.8584*_sy, 100.4989*_sx, 46.3983*_sy);
        dc.setColor(0x2b293a, Graphics.COLOR_TRANSPARENT); dc.setPenWidth(12); dc.drawLine(101.0924*_sx, 47.2007*_sy, 116.7208*_sx, 36.0603*_sy);
        dc.setColor(0x322e38, Graphics.COLOR_TRANSPARENT); dc.setPenWidth(12); dc.drawLine(117.2421*_sx, 36.9113*_sy, 133.7819*_sx, 27.1754*_sy);
        dc.setColor(0x393437, Graphics.COLOR_TRANSPARENT); dc.setPenWidth(12); dc.drawLine(134.2271*_sx, 28.0686*_sy, 151.5525*_sx, 19.8113*_sy);
        dc.setColor(0x403936, Graphics.COLOR_TRANSPARENT); dc.setPenWidth(12); dc.drawLine(151.9181*_sx, 20.7399*_sy, 169.8973*_sx, 14.024*_sy);
        dc.setColor(0x473e34, Graphics.COLOR_TRANSPARENT); dc.setPenWidth(12); dc.drawLine(170.1806*_sx, 14.981*_sy, 188.6766*_sx, 9.8576*_sy);
        dc.setColor(0x4e4333, Graphics.COLOR_TRANSPARENT); dc.setPenWidth(12); dc.drawLine(188.8755*_sx, 10.8356*_sy, 207.7477*_sx, 7.3438*_sy);
        dc.setColor(0x554931, Graphics.COLOR_TRANSPARENT); dc.setPenWidth(12); dc.drawLine(207.8605*_sx, 8.3354*_sy, 226.9652*_sx, 6.5017*_sy);
    }


    function _drawTicks(dc as Dc) as Void {
        var cx = _w / 2.0f;
        var cy = _h / 2.0f;
        var r1 = (_w / 2.0f) - (18.0f * _sx);
        var r2 = (_w / 2.0f) - (26.0f * _sx);
        dc.setStroke(Graphics.createColor(255, 130, 133, 120));
        dc.setPenWidth((2.0f * _sx).toNumber());
        for (var i = 0; i < 4; i++) {
            var angle = (i * 90.0f) - 90.0f;
            var rad = angle * Math.PI / 180.0f;
            dc.drawLine(cx + Math.cos(rad) * r1, cy + Math.sin(rad) * r1, cx + Math.cos(rad) * r2, cy + Math.sin(rad) * r2);
        }
    }

    function _drawMoon(dc as Dc) as Void {
        var mx = 49.0f * _sx;
        var my = 110.0f * _sy;
        dc.setFill(Graphics.createColor(255, 168, 170, 187));
        dc.fillCircle(mx, my, 11.0f * _sx);
        dc.setFill(Graphics.createColor(255, 233, 234, 244));
        dc.fillCircle(mx + 2.0f * _sx, my + 2.0f * _sy, 9.0f * _sx);
    }

    function _drawSun(dc as Dc) as Void {
        var sx = 435.0f * _sx;
        var sy = 278.0f * _sy;
        dc.setStroke(Graphics.createColor(255, 208, 183, 86));
        dc.setPenWidth((1.0f * _sx).toNumber());
        for (var i = 0; i < 8; i++) {
            var angle = (i * 45.0f) * Math.PI / 180.0f;
            dc.drawLine(sx + Math.cos(angle) * 8.0f * _sx, sy + Math.sin(angle) * 8.0f * _sy, sx + Math.cos(angle) * 12.0f * _sx, sy + Math.sin(angle) * 12.0f * _sy);
        }
        dc.setFill(Graphics.createColor(255, 180, 155, 67));
        dc.fillCircle(sx, sy, 7.0f * _sx);
    }

    function _drawSunTexts(dc as Dc) as Void {
        // Literal solar labels are retained design samples, not live astronomy.
        _icon(dc, 211, 39, "c", 0xF9C35A, false);
        _label(dc, 219, 30, 53, 18, 18, "50°", 0xF9C35A);
        _icon(dc, 101, 170, "c", 0xF9C35A, false);
        _label(dc, 113, 160, 65, 20, 20, "18:55", 0xF9C35A);
        _icon(dc, 188, 170, "L", 0xC8A866, true);
        _label(dc, 197, 161, 55, 18, 18, "-11°", 0xC8A866);
        _label(dc, 253, 161, 143, 18, 18, "11h 2m to sunrise", 0xE8DECF);
        _arrow(dc, 37, 188, true, 0xE9A456);
        _arrow(dc, 417, 188, false, 0x77B7F2);
        _label(dc, 17, 200, 40, 18, 18, "8:09", 0xE8DECF);
        _label(dc, 397, 200, 40, 18, 18, "8:13", 0xE8DECF);
    }


    function _drawDate(dc as Dc, info as Gregorian.Info) as Void {
        var days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
        _label(dc, 142, 56, 170, 27, 23, days[info.day_of_week - 1] + " " + info.day.toString(), 0xE8DECF);
    }


    function _drawTime(dc as Dc, hour as Number, minute as Number) as Void {
        _label(dc, 102, 85, 250, 74, 66, hour.format("%02d") + ":" + minute.format("%02d"), _isAod ? 0x777777 : 0xE8DECF);
    }


    function _drawMetrics(dc as Dc) as Void {
        var heartColor = _hr < 0 ? 0x777777 : (_hr < 120 ? 0x55FF99 : (_hr < 150 ? 0xFFEE44 : 0xFF5566));
        _icon(dc, 103, 215, "H", heartColor, false);
        _label(dc, 120, 198, 57, 34, 34, _hr > 0 ? _hr.format("%.0f") : "--", heartColor);
        _icon(dc, 209, 215, "V", 0xF08070, false);
        _label(dc, 223, 198, 44, 34, 34, _stress >= 0 ? _stress.format("%.0f") : "--", 0xE8DECF);
        _icon(dc, 309, 215, "R", 0xEF8878, false);
        _label(dc, 325, 199, 59, 32, 32, _recovery >= 0 ? _recovery.format("%.0f") + "h" : "--", 0xE8DECF);
        _label(dc, 282, 245.5, 96, 17, 17, "RECOVERY", 0xE8DECF);
        _icon(dc, 135, 282, "S", 0x6CCEB6, false);
        _label(dc, 151, 269, 84, 28, 28, _steps >= 0 ? _steps.format("%.0f") : "--", 0xE8DECF);
        _label(dc, 292, 276, 90, 20, 20, "7d 8642", 0xE8DECF);
        _icon(dc, 93, 321, "I", 0x6CCEB6, false);
        _label(dc, 109, 309.5, 75, 23, 23, _intensity >= 0 ? _intensity.format("%.0f") + "min" : "--", 0xE8DECF);
        _icon(dc, 235, 321, "K", 0x6CCEB6, false);
        _label(dc, 252, 308.5, 52, 25, 25, _calories >= 0 ? _calories.format("%.0f") : "--", 0xE8DECF);
        _icon(dc, 326, 321, "F", 0x6CCEB6, false);
        _label(dc, 342, 308.5, 34, 25, 25, _floors >= 0 ? _floors.format("%.0f") : "--", 0xE8DECF);
    }


    function _drawWeather(dc as Dc) as Void {
        var temp = "--"; var hum = "--"; var wind = "--"; var uv = "--";
        if (_weather != null) {
            if (_weather.temperature != null) { temp = _weather.temperature.format("%.0f") + "°C"; }
            if (_weather.relativeHumidity != null) { hum = _weather.relativeHumidity.format("%.0f") + "%"; }
            if (_weather.windSpeed != null) { wind = _weather.windSpeed.format("%.1f"); }
            if ((_weather has :uvIndex) && _weather.uvIndex != null) { uv = _weather.uvIndex.format("%.0f"); }
        }
        _icon(dc, 111, 361, "C", 0x79C0FF, false);
        _label(dc, 129, 348, 64, 28, 28, temp, 0xE8DECF);
        _label(dc, 185, 359, 48, 14, 14, "25/18", 0xA7A6A0);
        _label(dc, 239, 349, 68, 26, 26, hum, 0xE8DECF);
        _label(dc, 311, 353, 30, 18, 18, "UV", 0x83B7EC);
        _label(dc, 340, 349.5, 30, 25, 25, uv, 0xE8DECF);
        _label(dc, 123, 387, 27, 18, 18, "WX", 0x83B7EC);
        _label(dc, 151, 387, 42, 18, 18, wind + (wind.equals("--") ? "" : "m/s"), 0xE8DECF);
        dc.setColor(0xC1C4C0, Graphics.COLOR_TRANSPARENT); dc.setPenWidth(1);
        dc.drawRectangle(202*_sx, 390*_sy, 15*_sx, 10*_sy); dc.drawLine(219*_sx, 393*_sy, 219*_sx, 397*_sy);
        _label(dc, 221, 387, 48, 18, 18, _battery >= 0 ? _battery.format("%.0f") + "%" : "--", 0xE8DECF);
        _icon(dc, 285, 396, "L", 0xB4B3AC, true);
        _label(dc, 297, 387, 54, 18, 18, _altitude != null ? _altitude.format("%.0f") + "ft" : "--", 0xE8DECF);
    }


    function _hexR(hex as String) as Number {
        return _hexVal(hex, 1);
    }
    function _hexG(hex as String) as Number {
        return _hexVal(hex, 3);
    }
    function _hexB(hex as String) as Number {
        return _hexVal(hex, 5);
    }
    function _hexVal(hex as String, start as Number) as Number {
        var c1 = _hexChar(hex.substring(start, start + 1));
        var c2 = _hexChar(hex.substring(start + 1, start + 2));
        return c1 * 16 + c2;
    }
    function _hexChar(c as String) as Number {
        var code = c.toCharArray()[0].toNumber();
        if (code >= 48 && code <= 57) { return code - 48; }
        if (code >= 65 && code <= 70) { return code - 55; }
        if (code >= 97 && code <= 102) { return code - 87; }
        return 0;
    }
    function _font(size as Number) {
        if (!_fonts.hasKey(size)) {
            var faces = size >= 60 ? ["RobotoCondensedBold", "RobotoCondensedRegular"] : ["RobotoCondensedRegular", "RobotoRegular"];
            var f = Graphics.getVectorFont({:face => faces, :size => size});
            if (f == null) { f = Graphics.FONT_XTINY; }
            _fonts[size] = f;
        }
        return _fonts[size];
    }
    function _label(dc as Dc, x as Numeric, y as Numeric, w as Numeric, h as Numeric, size as Number, value as String, color as Number) as Void {
        var pixels = Math.max(10, Math.floor(size * _sy / 2.0f) * 2).toNumber(); var font = _font(pixels);
        // Width-fit only within this field; never move neighbouring fields.
        while (dc.getTextWidthInPixels(value, font) > w * _sx && pixels > 10) {
            pixels -= 2; font = _font(pixels);
        }
        dc.setColor(color, Graphics.COLOR_TRANSPARENT);
        dc.drawText(((x+w/2.0f)*_sx).toNumber(), ((y+h/2.0f)*_sy).toNumber(), font, value, Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);
    }
    function _icon(dc as Dc, x as Numeric, y as Numeric, glyph as String, color as Number, small as Boolean) as Void {
        dc.setColor(color, Graphics.COLOR_TRANSPARENT);
        dc.drawText((x*_sx).toNumber(), (y*_sy).toNumber(), small ? _smallIcons : _icons, glyph, Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);
    }
    function _arrow(dc as Dc, x as Numeric, y as Numeric, up as Boolean, color as Number) as Void {
        var tip = up ? y-6 : y+6; var tail = up ? y-2 : y+2;
        dc.setColor(color, Graphics.COLOR_TRANSPARENT); dc.setPenWidth(1);
        dc.drawLine(x*_sx, (y-6)*_sy, x*_sx, (y+6)*_sy);
        dc.drawLine((x-3)*_sx, tail*_sy, x*_sx, tip*_sy);
        dc.drawLine((x+3)*_sx, tail*_sy, x*_sx, tip*_sy);
    }

    function _drawSampleDecorations(dc as Dc) as Void {
        // Original design examples only: these are NOT sensor history or real progress.
        dc.setColor(0xf08a80, Graphics.COLOR_TRANSPARENT);
        dc.setPenWidth(2); dc.drawLine(87.8427*_sx, 245.7712*_sy, 95.1573*_sx, 247.6888*_sy);
        dc.setColor(0xf08a80, Graphics.COLOR_TRANSPARENT);
        dc.setPenWidth(2); dc.drawLine(94.9729*_sx, 248.6555*_sy, 102.0271*_sx, 248.5445*_sy);
        dc.setColor(0xf08a80, Graphics.COLOR_TRANSPARENT);
        dc.setPenWidth(2); dc.drawLine(102.1674*_sx, 249.5074*_sy, 108.8326*_sx, 246.5926*_sy);
        dc.setColor(0xf08a80, Graphics.COLOR_TRANSPARENT);
        dc.setPenWidth(2); dc.drawLine(108.7612*_sx, 247.4962*_sy, 116.2388*_sx, 251.0238*_sy);
        dc.setColor(0xf08a80, Graphics.COLOR_TRANSPARENT);
        dc.setPenWidth(2); dc.drawLine(116.1112*_sx, 251.9437*_sy, 122.8888*_sx, 249.8763*_sy);
        dc.setColor(0xf08a80, Graphics.COLOR_TRANSPARENT);
        dc.setPenWidth(2); dc.drawLine(122.8174*_sx, 250.8221*_sy, 130.1826*_sx, 253.1979*_sy);
        dc.setColor(0xf08a80, Graphics.COLOR_TRANSPARENT);
        dc.setPenWidth(2); dc.drawLine(130.0507*_sx, 254.1536*_sy, 136.9493*_sx, 252.9464*_sy);
        dc.setColor(0xf08a80, Graphics.COLOR_TRANSPARENT);
        dc.setPenWidth(2); dc.drawLine(136.8299*_sx, 253.9068*_sy, 144.1701*_sx, 256.0532*_sy);
        dc.setColor(0xf08a80, Graphics.COLOR_TRANSPARENT);
        dc.setPenWidth(2); dc.drawLine(144.1257*_sx, 257.0002*_sy, 150.8743*_sx, 254.7198*_sy);
        dc.setColor(0xf08a80, Graphics.COLOR_TRANSPARENT);
        dc.setPenWidth(2); dc.drawLine(150.8174*_sx, 255.6621*_sy, 158.1826*_sx, 258.0379*_sy);
        dc.setColor(0xf08a80, Graphics.COLOR_TRANSPARENT);
        dc.setPenWidth(2); dc.drawLine(157.9884*_sx, 258.9961*_sy, 165.0116*_sx, 258.6639*_sy);
        dc.setColor(0xf08a80, Graphics.COLOR_TRANSPARENT);
        dc.setPenWidth(2); dc.drawLine(164.8835*_sx, 259.6427*_sy, 172.1165*_sx, 260.8773*_sy);
        dc.setColor(0xf08070, Graphics.COLOR_TRANSPARENT);
        dc.fillRectangle(184*_sx, 246*_sy, 6*_sx, 7*_sy);
        dc.setColor(0xf08070, Graphics.COLOR_TRANSPARENT);
        dc.fillRectangle(192*_sx, 246*_sy, 6*_sx, 7*_sy);
        dc.setColor(0xf08070, Graphics.COLOR_TRANSPARENT);
        dc.fillRectangle(200*_sx, 246*_sy, 6*_sx, 7*_sy);
        dc.setColor(0x30373b, Graphics.COLOR_TRANSPARENT);
        dc.fillRectangle(208*_sx, 246*_sy, 6*_sx, 7*_sy);
        dc.setColor(0x30373b, Graphics.COLOR_TRANSPARENT);
        dc.fillRectangle(216*_sx, 246*_sy, 6*_sx, 7*_sy);
        dc.setColor(0x30373b, Graphics.COLOR_TRANSPARENT);
        dc.fillRectangle(224*_sx, 246*_sy, 6*_sx, 7*_sy);
        dc.setColor(0x30373b, Graphics.COLOR_TRANSPARENT);
        dc.fillRectangle(232*_sx, 246*_sy, 6*_sx, 7*_sy);
        dc.setColor(0x30373b, Graphics.COLOR_TRANSPARENT);
        dc.fillRectangle(240*_sx, 246*_sy, 6*_sx, 7*_sy);
        dc.setColor(0x30373b, Graphics.COLOR_TRANSPARENT);
        dc.fillRectangle(248*_sx, 246*_sy, 6*_sx, 7*_sy);
        dc.setColor(0x30373b, Graphics.COLOR_TRANSPARENT);
        dc.fillRectangle(256*_sx, 246*_sy, 6*_sx, 7*_sy);
        dc.setColor(0x30373b, Graphics.COLOR_TRANSPARENT);
        dc.fillRectangle(264*_sx, 246*_sy, 6*_sx, 7*_sy);
        dc.setColor(0x30373b, Graphics.COLOR_TRANSPARENT);
        dc.fillRectangle(272*_sx, 246*_sy, 6*_sx, 7*_sy);
        dc.setColor(0x30373b, Graphics.COLOR_TRANSPARENT);
        dc.fillRectangle(280*_sx, 246*_sy, 6*_sx, 7*_sy);
        dc.setColor(0x315f56, Graphics.COLOR_TRANSPARENT);
        dc.fillRectangle(239*_sx, 287*_sy, 4*_sx, 8*_sy);
        dc.setColor(0x315f56, Graphics.COLOR_TRANSPARENT);
        dc.fillRectangle(246*_sx, 284*_sy, 4*_sx, 11*_sy);
        dc.setColor(0x315f56, Graphics.COLOR_TRANSPARENT);
        dc.fillRectangle(253*_sx, 281*_sy, 4*_sx, 14*_sy);
        dc.setColor(0x315f56, Graphics.COLOR_TRANSPARENT);
        dc.fillRectangle(260*_sx, 285*_sy, 4*_sx, 10*_sy);
        dc.setColor(0x315f56, Graphics.COLOR_TRANSPARENT);
        dc.fillRectangle(267*_sx, 278*_sy, 4*_sx, 17*_sy);
        dc.setColor(0x315f56, Graphics.COLOR_TRANSPARENT);
        dc.fillRectangle(274*_sx, 275*_sy, 4*_sx, 20*_sy);
        dc.setColor(0x315f56, Graphics.COLOR_TRANSPARENT);
        dc.fillRectangle(281*_sx, 280*_sy, 4*_sx, 15*_sy);
        dc.setColor(0x293534, Graphics.COLOR_TRANSPARENT);
        dc.setPenWidth(2); dc.drawLine(78.0024*_sx, 338.5*_sy, 182.9976*_sx, 337.5*_sy);
        dc.setColor(0x6cceb6, Graphics.COLOR_TRANSPARENT);
        dc.setPenWidth(2); dc.drawLine(78.0083*_sx, 338.4997*_sy, 107.9917*_sx, 337.5003*_sy);
    }
}
