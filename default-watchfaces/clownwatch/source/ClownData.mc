import Toybox.Activity;
import Toybox.ActivityMonitor;
import Toybox.Complications;
import Toybox.Lang;
import Toybox.Math;
import Toybox.SensorHistory;
import Toybox.System;
import Toybox.Time;
import Toybox.Time.Gregorian;
import Toybox.UserProfile;
import Toybox.Weather;

// Shared metric IDs are also used by settings and both screen sizes.
module ClownMetrics {
    const NONE = 0;
    const HR = 1;
    const STEPS = 2;
    const CALORIES = 3;
    const SPO2 = 4;
    const ALTITUDE = 5;
    const BATTERY = 6;
    const WEATHER = 7;
    const PRESSURE = 8;
    const BODY_BATTERY = 9;
    const STRESS = 10;
    const RESPIRATION = 11;
    const NOTIFICATIONS = 12;
    const SECONDS = 13;
    const ACTIVE_CALORIES = 14;
    const DAY_DISTANCE = 15;
    const WEEK_DISTANCE = 16;

    // Threshold colors follow the metric, regardless of its configured slot.
    function color(id as Number, value as Numeric?, textColor as Number, batteryColor as Number) as Number {
        if (!valid(id, value)) { return textColor; }
        if (id == HR) {
            return value < 120 ? 0x55FF99 : (value < 150 ? 0xFFEE44 : 0xFF5566);
        }
        if (id == BATTERY) {
            return value < 10 ? 0xFF5566 : (value < 30 ? 0xFFEE44 : batteryColor);
        }
        return textColor;
    }

    function label(id as Number, feet as Boolean, miles as Boolean) as String {
        var names = ["", "HR", "STEPS", "CAL", "SPO2", "ALT m", "BAT", "TEMP",
            "PRESS", "BODY", "STRESS", "RESP", "MSG", "SEC", "ACT kcal", "DAY km", "WK km"];
        if (id == ALTITUDE && feet) { return "ALT ft"; }
        if (id == DAY_DISTANCE && miles) { return "DAY mi"; }
        if (id == WEEK_DISTANCE && miles) { return "WK mi"; }
        return names[id];
    }

    function valid(id as Number, value as Numeric?) as Boolean {
        if (value == null) { return false; }
        if (id == SECONDS) { return value >= 0 && value < 60; }
        if (id == HR) { return value > 0 && value <= 255; }
        if (id == SPO2) { return value > 0 && value <= 100; }
        if (id == BATTERY || id == BODY_BATTERY || id == STRESS) { return value >= 0 && value <= 100; }
        if (id == RESPIRATION) { return value > 0 && value <= 100; }
        if (id == PRESSURE) { return value > 0; }
        if (id == ALTITUDE || id == WEATHER) { return true; }
        return value >= 0;
    }

    function grouped(value as Number) as String {
        if (value >= 1000000) { return (value / 1000000.0).format("%.1f") + "M"; }
        if (value >= 100000) { return (value / 1000).format("%d") + "k"; }
        if (value < 1000) { return value.format("%d"); }
        return (value / 1000).format("%d") + "," + (value % 1000).format("%03d");
    }

    function format(id as Number, value as Numeric?, fahrenheit as Boolean, feet as Boolean) as String {
        if (id == NONE) { return ""; }
        if (!valid(id, value)) { return "--"; }
        var number = value as Numeric;
        if (id == SECONDS) { return number.toNumber().format("%02d"); }
        if (id == ACTIVE_CALORIES) { return "~" + grouped(Math.round(number).toNumber()); }
        if (id == DAY_DISTANCE || id == WEEK_DISTANCE) { return distanceText(number, false); }
        if (id == WEATHER) {
            var temperature = fahrenheit ? number * 1.8 + 32.0 : number;
            return Math.round(temperature).toNumber().format("%d") + (fahrenheit ? "°F" : "°C");
        }
        if (id == PRESSURE) { return Math.round(number / 100.0).toNumber().format("%d"); }
        if (id == ALTITUDE) { number = feet ? number * 3.28084 : number; }
        var rounded = Math.round(number).toNumber();
        if (id == SPO2 || id == BATTERY) { return rounded.format("%d") + "%"; }
        if (id == STEPS || id == CALORIES || id == ALTITUDE) { return grouped(rounded); }
        return rounded.format("%d");
    }

    function distanceText(meters as Numeric?, miles as Boolean) as String {
        if (meters == null || meters < 0) { return "--"; }
        var distance = meters / (miles ? 1609.344 : 1000.0);
        return distance >= 1000 ? grouped(Math.round(distance).toNumber()) : distance.format("%.2f");
    }
}

class ClownData {
    private var _values as Dictionary<Number, Numeric?> = {};
    private var _updated as Number = -1;
    private var _pressureUpdated as Number = -1;
    private var _calendarDay as Number = -1;
    private var _second as Number?;
    private var _weekIncomplete as Boolean = false;
    var pressureSeries as Array<Float> = [];
    var weatherCondition as Number?;
    var fahrenheit as Boolean = false;
    var feet as Boolean = false;
    var miles as Boolean = false;

    function initialize() { }

    function invalidate() as Void { _updated = -1; _pressureUpdated = -1; }

    function refresh(slots as Array<Number>, preview as Boolean) as Void {
        var now = System.getTimer();
        var date = Gregorian.info(Time.now(), Time.FORMAT_SHORT);
        var dayKey = date.year * 10000 + date.month * 100 + date.day;
        if (_updated >= 0 && now >= _updated && now - _updated < 15000 && _calendarDay == dayKey) { return; }
        _updated = now;
        _calendarDay = dayKey;
        _weekIncomplete = false;
        _values = {};
        var settings = System.getDeviceSettings();
        fahrenheit = settings.temperatureUnits != System.UNIT_METRIC;
        feet = settings.elevationUnits != System.UNIT_METRIC;
        miles = settings.distanceUnits != System.UNIT_METRIC;
        for (var i = 0; i < slots.size(); i++) {
            var id = slots[i];
            if (_values.hasKey(id) || id == ClownMetrics.NONE) { continue; }
            try {
                _values[id] = preview ? demo(id) : read(id);
            } catch (error) {
                _values[id] = null;
                System.println("ClownWatch metric " + id + " unavailable: " + error.getErrorMessage());
            }
        }
        if (_values.hasKey(ClownMetrics.PRESSURE)) {
            refreshPressure(now, preview);
        } else { pressureSeries = []; }
    }

    function setSecond(second as Number) as Void { _second = second % 60; }

    function value(id as Number) as Numeric? {
        if (id == ClownMetrics.SECONDS) { return _second != null ? _second : System.getClockTime().sec; }
        return _values.get(id);
    }

    function text(id as Number) as String {
        if (id == ClownMetrics.DAY_DISTANCE || id == ClownMetrics.WEEK_DISTANCE) {
            var distance = ClownMetrics.distanceText(value(id), miles);
            return id == ClownMetrics.WEEK_DISTANCE && _weekIncomplete && !distance.equals("--")
                ? "~" + distance : distance;
        }
        return ClownMetrics.format(id, value(id), fahrenheit, feet);
    }

    private function demo(id as Number) as Numeric? {
        if (id == ClownMetrics.WEATHER) { weatherCondition = Weather.CONDITION_CLEAR; }
        var values = [null, 72, 8642, 426, 98, 1286, 78, 24, 101300, 64, 32, 16, 2,
            30, 426, 6420.0, 42680.0];
        return values[id];
    }

    private function complication(type as Complications.Type) as Numeric? {
        var item = Complications.getComplication(new Complications.Id(type));
        var value = item.value;
        return value instanceof Number || value instanceof Float ? value as Numeric : null;
    }

    private function latest(iterator as SensorHistory.SensorHistoryIterator, maxAge as Number) as Numeric? {
        var sample = iterator.next();
        if (sample == null || sample.data == null) { return null; }
        if (sample.when != null) {
            var age = Time.now().value() - sample.when.value();
            if (age < -300 || age > maxAge) { return null; }
        }
        return sample.data;
    }

    private function read(id as Number) as Numeric? {
        if (id == ClownMetrics.STEPS) { return ActivityMonitor.getInfo().steps; }
        if (id == ClownMetrics.CALORIES) { return ActivityMonitor.getInfo().calories; }
        if (id == ClownMetrics.BATTERY) { return System.getSystemStats().battery; }
        if (id == ClownMetrics.ALTITUDE) { return Activity.getActivityInfo().altitude; }
        if (id == ClownMetrics.NOTIFICATIONS) { return System.getDeviceSettings().notificationCount; }
        if (id == ClownMetrics.SECONDS) { return System.getClockTime().sec; }
        if (id == ClownMetrics.DAY_DISTANCE) {
            var distance = ActivityMonitor.getInfo().distance;
            return distance != null && distance >= 0 ? distance / 100.0 : null;
        }
        if (id == ClownMetrics.WEEK_DISTANCE) { return weeklyDistance(); }
        if (id == ClownMetrics.ACTIVE_CALORIES) {
            var profile = UserProfile.getProfile();
            var date = Gregorian.info(Time.now(), Time.FORMAT_SHORT);
            var resting = ClownActivityStats.restingCalories(profile.weight, profile.height,
                profile.birthYear, profile.gender, date.year);
            return ClownActivityStats.activeCalories(ActivityMonitor.getInfo().calories, resting,
                date.hour * 3600 + date.min * 60 + date.sec);
        }
        if (id == ClownMetrics.WEATHER) {
            weatherCondition = null;
            var weather = Weather.getCurrentConditions();
            if (weather == null) { return null; }
            if (weather.observationTime != null && Time.now().value() - weather.observationTime.value() > 5400) { return null; }
            weatherCondition = weather.condition;
            return weather.temperature;
        }
        var options = {:period => 1, :order => SensorHistory.ORDER_NEWEST_FIRST};
        var value = null as Numeric?;
        if (id == ClownMetrics.HR) {
            value = Activity.getActivityInfo().currentHeartRate;
            if (!ClownMetrics.valid(id, value)) { value = complication(Complications.COMPLICATION_TYPE_HEART_RATE); }
            if (!ClownMetrics.valid(id, value)) { value = latest(SensorHistory.getHeartRateHistory(options), 900); }
        } else if (id == ClownMetrics.SPO2) {
            value = complication(Complications.COMPLICATION_TYPE_PULSE_OX);
            if (!ClownMetrics.valid(id, value)) { value = latest(SensorHistory.getOxygenSaturationHistory(options), 86400); }
        } else if (id == ClownMetrics.PRESSURE) {
            value = complication(Complications.COMPLICATION_TYPE_SEA_LEVEL_PRESSURE);
            if (!ClownMetrics.valid(id, value)) { value = latest(SensorHistory.getPressureHistory(options), 3600); }
        } else if (id == ClownMetrics.BODY_BATTERY) {
            value = complication(Complications.COMPLICATION_TYPE_BODY_BATTERY);
            if (!ClownMetrics.valid(id, value)) { value = latest(SensorHistory.getBodyBatteryHistory(options), 3600); }
        } else if (id == ClownMetrics.STRESS) {
            value = complication(Complications.COMPLICATION_TYPE_STRESS);
            if (!ClownMetrics.valid(id, value)) { value = latest(SensorHistory.getStressHistory(options), 3600); }
        } else if (id == ClownMetrics.RESPIRATION) {
            value = complication(Complications.COMPLICATION_TYPE_RESPIRATION_RATE);
        }
        return value;
    }

    private function weeklyDistance() as Numeric? {
        var date = Gregorian.info(Time.now(), Time.FORMAT_SHORT);
        var today = ClownActivityStats.dayNumber(date.year, date.month, date.day);
        var records = [] as Array<Dictionary>;
        var history = ActivityMonitor.getHistory();
        for (var i = 0; i < history.size(); i++) {
            if (history[i].startOfDay == null) { continue; }
            var day = Gregorian.info(history[i].startOfDay, Time.FORMAT_SHORT);
            records.add({:day => ClownActivityStats.dayNumber(day.year, day.month, day.day),
                :distance => history[i].distance});
        }
        var summary = ClownActivityStats.weeklyDistance(today, date.day_of_week,
            System.getDeviceSettings().firstDayOfWeek, ActivityMonitor.getInfo().distance, records);
        _weekIncomplete = !(summary.get(:complete) as Boolean);
        return summary.get(:meters) as Numeric?;
    }

    private function refreshPressure(now as Number, preview as Boolean) as Void {
        if (_pressureUpdated >= 0 && now >= _pressureUpdated && now - _pressureUpdated < 60000) { return; }
        _pressureUpdated = now;
        pressureSeries = [];
        if (preview) {
            pressureSeries = [1011.0,1011.2,1011.8,1012.0,1012.8,1013.0,1012.5,1012.6,1012.9,1013.0];
            return;
        }
        try {
            var history = SensorHistory.getPressureHistory({:period => 24, :order => SensorHistory.ORDER_NEWEST_FIRST});
            var newest = [] as Array<Float>;
            for (var i = 0; i < 24; i++) {
                var sample = history.next();
                if (sample == null) { break; }
                if (sample.data == null || sample.data <= 0 || sample.when == null) { continue; }
                var age = Time.now().value() - sample.when.value();
                if (age >= 0 && age <= 3600) { newest.add((sample.data / 100.0).toFloat()); }
            }
            for (var i = newest.size() - 1; i >= 0; i--) { pressureSeries.add(newest[i]); }
        } catch (error) { pressureSeries = []; }
    }
}
