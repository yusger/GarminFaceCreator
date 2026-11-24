import { layer } from "../frontend/src/domain.ts";
// Editable approximation of SkyRing's native Lay constants (454px).
export function skyRingLayers() {
  const out = [];
  let serial = 0;
  function add(
    kind,
    name,
    x,
    y,
    w,
    h,
    color,
    size = 20,
    text = "",
    extra = {},
  ) {
    const l = {
      ...layer(kind),
      id: "skyring-" + ++serial,
      name,
      x,
      y,
      w,
      h,
      color,
      size,
      text,
      threshold: false,
      aod: false,
      ...extra,
    };
    out.push(l);
    return l;
  }
  function text(name, value, cx, cy, w, size = 20, color = "#e8decf") {
    return add(
      "text",
      name,
      cx - w / 2,
      cy - size / 2,
      w,
      size,
      color,
      size,
      value,
    );
  }
  function metric(name, source, cx, cy, w, size = 28, color = "#e8decf") {
    return add(
      "metric",
      name,
      cx - w / 2,
      cy - size / 2,
      w,
      size,
      color,
      size,
      "",
      { source },
    );
  }
  function segment(name, x1, y1, x2, y2, color, width = 2) {
    const dx = x2 - x1,
      dy = y2 - y1,
      len = Math.hypot(dx, dy);
    add(
      "line",
      name,
      (x1 + x2 - len) / 2,
      (y1 + y2 - 1) / 2,
      len,
      1,
      color,
      20,
      "",
      {
        rotation: ((Math.atan2(dy, dx) - Math.atan2(1, len)) * 180) / Math.PI,
        strokeWidth: width,
      },
    );
  }
  add("circle", "纯黑底色", 0, 0, 454, 454, "#000000", 20, "", {
    locked: true,
  });
  const stops = [
    [0, [92, 78, 48]],
    [0.24, [92, 78, 48]],
    [0.36, [75, 36, 52]],
    [0.49, [18, 30, 58]],
    [0.72, [5, 13, 30]],
    [0.9, [42, 40, 58]],
    [1, [92, 78, 48]],
  ];
  function skyColor(t) {
    let i = 0;
    while (i < stops.length - 2 && t > stops[i + 1][0]) i++;
    const a = stops[i],
      b = stops[i + 1],
      v = (t - a[0]) / (b[0] - a[0]);
    return (
      "#" +
      a[1]
        .map((x, j) =>
          Math.round(x + (b[1][j] - x) * v)
            .toString(16)
            .padStart(2, "0"),
        )
        .join("")
    );
  }
  for (let i = 0; i < 72; i++) {
    const a = (i * Math.PI) / 36,
      b = ((i + 1) * Math.PI) / 36;
    segment(
      "天光外圈 " + (i + 1),
      227 + Math.sin(a) * 220,
      227 - Math.cos(a) * 220,
      227 + Math.sin(b) * 220,
      227 - Math.cos(b) * 220,
      skyColor(i / 72),
      12,
    );
  }
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    segment(
      "方位刻度 " + (i + 1),
      227 + Math.sin(a) * 204,
      227 - Math.cos(a) * 204,
      227 + Math.sin(a) * 212,
      227 - Math.cos(a) * 212,
      "#828578",
      2,
    );
  }
  add("circle", "月亮轮廓", 38, 99, 22, 22, "#a8aabb");
  add("circle", "月亮亮面", 40, 101, 18, 18, "#e9eaf4");
  const sunX = 435,
    sunY = 278;
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    segment(
      "太阳光芒 " + (i + 1),
      sunX + Math.cos(a) * 10,
      sunY + Math.sin(a) * 10,
      sunX + Math.cos(a) * 14,
      sunY + Math.sin(a) * 14,
      "#d0b756",
      1,
    );
  }
  add("circle", "太阳标记", 428, 271, 14, 14, "#b49b43");
  text("太阳最高点", "☀ 50°", 227, 39, 120, 18, "#f9c35a");
  add("date", "日期", 142, 56, 170, 27, "#e8decf", 23);
  add("time", "时间", 102, 85, 250, 74, "#e8decf", 66, "", { aod: true });
  text("太阳时", "☀ 18:55", 128, 170, 105, 20, "#f9c35a");
  text("太阳高度", "∠ −11°", 215, 170, 75, 18, "#c8a866");
  text("日出倒计时", "11h 2m to sunrise", 321, 170, 150, 18);
  text("日出标记", "↑", 37, 188, 20, 18, "#e9a456");
  text("日出时间", "8:09", 37, 209, 40, 18);
  text("日落标记", "↓", 417, 188, 20, 18, "#77b7f2");
  text("日落时间", "8:13", 417, 209, 40, 18);
  metric("心率", "heartRate", 127, 215, 100, 34, "#ef8878").threshold = true;
  text("压力图标", "◴", 209, 215, 30, 28, "#f08070");
  metric("压力", "stress", 242, 215, 50, 34);
  text("恢复图标", "◷", 309, 215, 28, 28, "#ef8878");
  metric("恢复时间", "recoveryHours", 350, 215, 68, 32);
  const points = [
    0.85, 0.72, 0.68, 0.77, 0.57, 0.62, 0.47, 0.48, 0.34, 0.4, 0.25, 0.22, 0.12,
  ];
  for (let i = 1; i < points.length; i++)
    segment(
      "心率历史（示例） " + i,
      88 + (i - 1) * 7,
      264 - points[i - 1] * 22,
      88 + i * 7,
      264 - points[i] * 22,
      "#f08a80",
      2,
    );
  for (let i = 0; i < 13; i++)
    add(
      "rect",
      "压力历史（示例） " + (i + 1),
      184 + i * 8,
      246,
      6,
      7,
      i < 3 ? "#f08070" : "#30373b",
    );
  text("恢复说明", "RECOVERY", 330, 254, 96, 17);
  text("步数图标", "♧", 135, 282, 30, 27, "#6cceb6");
  metric("步数", "steps", 180, 283, 110, 28);
  const heights = [8, 11, 14, 10, 17, 20, 15];
  for (let i = 0; i < 7; i++)
    add(
      "rect",
      "七日步数柱（示例） " + (i + 1),
      239 + i * 7,
      295 - heights[i],
      4,
      heights[i],
      "#315f56",
    );
  text("七日均值（示例）", "7d 8642", 337, 286, 90, 20);
  text("强度图标", "»", 93, 321, 30, 30, "#6cceb6");
  metric("强度分钟", "intensityMinutes", 141, 321, 85, 23);
  segment("强度进度底线", 78, 338, 183, 338, "#293534", 2);
  segment("强度进度（示例）", 78, 338, 108, 338, "#6cceb6", 2);
  text("热量图标", "♨", 235, 321, 28, 27, "#6cceb6");
  metric("热量", "calories", 273, 321, 62, 25);
  text("楼层图标", "▤", 326, 321, 26, 27, "#6cceb6");
  metric("楼层", "floorsClimbed", 354, 321, 30, 25);
  text("天气图标", "☁", 114, 361, 35, 29, "#79c0ff");
  metric("温度", "temperature", 159, 362, 68, 28);
  text("最高最低温（示例）", "25/18", 209, 366, 48, 14, "#a7a6a0");
  metric("湿度", "humidity", 273, 362, 68, 26);
  text("紫外线标签", "UV", 326, 362, 30, 18, "#83b7ec");
  metric("紫外线", "uvIndex", 355, 362, 30, 25);
  text("风速标签", "WX", 143, 396, 30, 18, "#83b7ec");
  metric("风速", "windSpeed", 174, 396, 35, 18);
  text("电池图标", "▱", 210, 396, 20, 20, "#c1c4c0");
  metric("电量", "battery", 244, 396, 50, 18);
  text("海拔图标", "△", 286, 396, 20, 18, "#b4b3ac");
  metric("海拔", "altitude", 321, 396, 55, 18);
  return out;
}
