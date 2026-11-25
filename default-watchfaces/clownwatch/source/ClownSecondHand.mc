import Toybox.Lang;
import Toybox.Math;

module ClownSecondHand {
    // Light from twelve o'clock through the hand position; reset at each minute.
    function isElapsed(mark as Number, count as Number, second as Number) as Boolean {
        var sec = second % 60;
        return sec > 0 && mark * 60 <= sec * count;
    }

    // Outward-pointing dart, with a shallow notch toward the tip.
    // Proportions follow Wildward's second-hand silhouette; size follows the screen.
    function points(cx as Number, cy as Number, radius as Float, second as Number) as Array<[Numeric, Numeric]> {
        var angle = (second % 60) * Math.PI / 30.0;
        var outwardX = Math.sin(angle);
        var outwardY = -Math.cos(angle);
        var tangentX = Math.cos(angle);
        var tangentY = Math.sin(angle);
        var tip = radius * 0.94;
        var base = radius * 0.88;
        var notch = radius * 0.895;
        var halfWidth = radius * 0.024;
        return [
            [Math.round(cx + outwardX * tip).toNumber(), Math.round(cy + outwardY * tip).toNumber()],
            [Math.round(cx + outwardX * base + tangentX * halfWidth).toNumber(),
                Math.round(cy + outwardY * base + tangentY * halfWidth).toNumber()],
            [Math.round(cx + outwardX * notch).toNumber(), Math.round(cy + outwardY * notch).toNumber()],
            [Math.round(cx + outwardX * base - tangentX * halfWidth).toNumber(),
                Math.round(cy + outwardY * base - tangentY * halfWidth).toNumber()]
        ];
    }
}
