import Toybox.Lang;
import Toybox.Time.Gregorian;
import Toybox.UserProfile;

module ClownActivityStats {
    // Map local calendar fields to a day number, without DST-sensitive subtraction.
    function dayNumber(year as Number, month as Number, day as Number) as Number {
        var noon = Gregorian.moment({:year => year, :month => month, :day => day,
            :hour => 12, :minute => 0, :second => 0});
        return noon.value() / 86400;
    }

    // History distances are centimeters. Today is supplied separately and never
    // counted twice; incomplete history is reported instead of silently assumed zero.
    function weeklyDistance(today as Number, dayOfWeek as Number, firstDay as Number,
                            todayCm as Numeric?, history as Array<Dictionary>) as Dictionary {
        if (todayCm == null || todayCm < 0) { return {:meters => null, :complete => false}; }
        var daysElapsed = (dayOfWeek - firstDay + 7) % 7;
        var start = today - daysElapsed;
        var total = todayCm.toFloat();
        var seen = {} as Dictionary<Number, Boolean>;
        for (var i = 0; i < history.size(); i++) {
            var date = history[i].get(:day) as Number;
            var distance = history[i].get(:distance) as Numeric?;
            if (date < start || date >= today || seen.hasKey(date) || distance == null || distance < 0) { continue; }
            total += distance;
            seen[date] = true;
        }
        return {:meters => total / 100.0, :complete => seen.size() == daysElapsed};
    }

    // Mifflin-St Jeor adult resting-energy estimate, kcal/day. Weight from the
    // Garmin profile is grams; height is cm and only birth year is available.
    function restingCalories(weightGrams as Number?, heightCm as Number?, birthYear as Number?,
                             gender as UserProfile.Gender?, year as Number) as Float? {
        if (weightGrams == null || heightCm == null || birthYear == null || gender == null) { return null; }
        var age = year - birthYear;
        if (weightGrams <= 0 || heightCm <= 0 || age < 18 || age > 120) { return null; }
        var sexOffset = 0;
        if (gender == UserProfile.GENDER_MALE) { sexOffset = 5; }
        else if (gender == UserProfile.GENDER_FEMALE) { sexOffset = -161; }
        else { return null; }
        var resting = 10.0 * weightGrams / 1000.0 + 6.25 * heightCm - 5.0 * age + sexOffset;
        return resting > 0 ? resting : null;
    }

    function activeCalories(total as Numeric?, restingPerDay as Float?, elapsedSeconds as Number) as Float? {
        if (total == null || total < 0 || restingPerDay == null || restingPerDay <= 0
            || elapsedSeconds < 0 || elapsedSeconds > 86400) { return null; }
        var estimate = total - restingPerDay * elapsedSeconds / 86400.0;
        return estimate > 0 ? estimate.toFloat() : 0.0;
    }
}
