import Toybox.Graphics;
import Toybox.Lang;
import Toybox.Math;

// Original angular symbols, inspired by the reference's magic-circle lettering.
// Cache screen-space strokes at layout time; no fonts or bitmap assets needed.
class ClownRuneRing {
    private var _glyphs as Array<Array<Array<Number>>> = [];
    private var _innerRadius as Number = 0;
    private var _outerRadius as Number = 0;
    private var _cx as Number = 0;
    private var _cy as Number = 0;

    function initialize() { }

    function layout(cx as Number, cy as Number, radius as Float, scale as Float) as Void {
        _cx = cx;
        _cy = cy;
        _innerRadius = Math.round(radius - 22 * scale).toNumber();
        _outerRadius = Math.round(radius - 6 * scale).toNumber();
        _glyphs = [];
        // Each stroke is tangent-x / outward-y, in normalized design units.
        var symbols = [
            [[-3,-5,-3,5],[-3,5,3,1],[3,1,-3,-1],[-3,-1,3,-5]],
            [[0,-5,0,5],[-4,1,0,5],[0,5,4,1],[-3,-2,3,-2]],
            [[-4,-5,0,5],[0,5,4,-5],[-2,-1,3,1]],
            [[-3,-5,-3,5],[-3,5,3,5],[3,5,0,0],[0,0,3,-5]],
            [[-4,0,0,5],[0,5,4,0],[4,0,0,-5],[0,-5,-4,0],[0,-5,0,2]],
            [[-4,5,4,5],[0,5,0,-5],[-4,-2,0,1],[0,1,4,-2]],
            [[-3,-5,-3,5],[-3,5,3,2],[3,2,-3,-1],[-3,-1,3,-4]],
            [[-4,5,0,1],[0,1,4,5],[0,1,0,-5],[-3,-3,3,-3]],
            [[-3,-5,3,5],[3,-5,-3,5],[-4,0,4,0]],
            [[-3,-5,-3,5],[-3,5,3,5],[-3,0,2,0],[2,0,2,-5]],
            [[-4,2,0,5],[0,5,4,2],[4,2,0,-1],[0,-1,0,-5]],
            [[-4,-5,0,5],[0,5,4,-5],[-2,0,2,0],[0,-5,0,-2]]
        ] as Array<Array<Array<Number>>>;
        var track = radius - 13 * scale;
        for (var index = 0; index < 12; index++) {
            // Fifteen-degree offset centers each symbol between adjacent hour ticks.
            var angle = (index * 30 + 15) * Math.PI / 180.0;
            var sine = Math.sin(angle);
            var cosine = Math.cos(angle);
            var strokes = [] as Array<Array<Number>>;
            var symbol = symbols[index % symbols.size()];
            for (var i = 0; i < symbol.size(); i++) {
                var s = symbol[i];
                strokes.add([
                    Math.round(cx + sine * (track + s[1] * scale) + cosine * s[0] * scale).toNumber(),
                    Math.round(cy - cosine * (track + s[1] * scale) + sine * s[0] * scale).toNumber(),
                    Math.round(cx + sine * (track + s[3] * scale) + cosine * s[2] * scale).toNumber(),
                    Math.round(cy - cosine * (track + s[3] * scale) + sine * s[2] * scale).toNumber()
                ]);
            }
            _glyphs.add(strokes);
        }
    }

    function draw(dc as Graphics.Dc, second as Number, litColor as Number, dimColor as Number) as Void {
        dc.setPenWidth(1);
        dc.setColor(dimColor, Graphics.COLOR_TRANSPARENT);
        dc.drawCircle(_cx, _cy, _innerRadius);
        dc.drawCircle(_cx, _cy, _outerRadius);
        // Symbols are centered at 15, 45, ... degrees. At second zero all are dim.
        var degrees = (second % 60) * 6;
        for (var index = 0; index < _glyphs.size(); index++) {
            var lit = degrees > 0 && index * 30 + 15 <= degrees;
            dc.setColor(lit ? litColor : dimColor, Graphics.COLOR_TRANSPARENT);
            var strokes = _glyphs[index];
            for (var i = 0; i < strokes.size(); i++) {
                var s = strokes[i];
                dc.drawLine(s[0], s[1], s[2], s[3]);
            }
        }
    }
}
