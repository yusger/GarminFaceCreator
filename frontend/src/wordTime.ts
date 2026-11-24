// Locale phrases: Copyright (c) 2019 Samuel Rinnetmäki, MIT.
// https://github.com/samuelmr/garmin-abouttime @ 4fdf09bcf784ecf385b9dce546af3f277e13caa5
// Complete original MIT notice and locale XML are retained under public/reference-notices/AboutTime-*.
// Creator adapter code retains the repository GPL-3.0-or-later license.
import type { Project, CodeFile } from "./domain";
export const WORD_TIME_VERSION = "words-1";
export const wordLocales: Record<
  "en" | "zh",
  { hours: string[]; minutes: string[][] }
> = {
  en: {
    hours: [
      "twelve",
      "one",
      "two",
      "three",
      "four",
      "five",
      "six",
      "seven",
      "eight",
      "nine",
      "ten",
      "eleven",
      "twelve",
      "one",
      "two",
      "three",
      "four",
      "five",
      "six",
      "seven",
      "eight",
      "nine",
      "ten",
      "eleven",
    ],
    minutes: [
      ["", "$1$", "o'clock"],
      ["little", "past", "$1$"],
      ["ten", "past", "$1$"],
      ["quarter", "past", "$1$"],
      ["twenty", "past", "$1$"],
      ["almost", "$1$", "thirty"],
      ["half", "past", "$1$"],
      ["a bit past", "$1$", "thirty"],
      ["twenty", "to", "$2$"],
      ["quarter", "to", "$2$"],
      ["ten", "to", "$2$"],
      ["almost", "$2$", "o'clock"],
    ],
  },
  zh: {
    hours: [
      "午夜",
      "一点",
      "两点",
      "三点",
      "四点",
      "五点",
      "六点",
      "七点",
      "八点",
      "九点",
      "十点",
      "十一点",
      "中午",
      "一点",
      "两点",
      "三点",
      "四点",
      "五点",
      "六点",
      "七点",
      "八点",
      "九点",
      "十点",
      "十一点",
    ],
    minutes: [
      ["", "$1$", ""],
      ["$1$", "刚过了", "不久"],
      ["$1$", "过了", "十分"],
      ["$1$", "过了", "十五分"],
      ["$1$", "过了", "二十分"],
      ["快要", "$1$", "三十分了"],
      ["", "$1$", "三十分"],
      ["$1$", "三十分", "刚过了 不久"],
      ["再二十分", "就", "$2$了"],
      ["再十五分", "就", "$2$了"],
      ["再十分", "就", "$2$了"],
      ["", "快要", "$2$了"],
    ],
  },
};
export function wordTimeLines(
  hour: number,
  minute: number,
  second: number,
  language: "en" | "zh" = "en",
) {
  let bucket = Math.floor((minute * 60 + second + 150) / 300);
  if (bucket === 12) {
    hour = (hour + 1) % 24;
    bucket = 0;
  }
  const data = wordLocales[language],
    values = [data.hours[hour % 24], data.hours[(hour + 1) % 24]];
  return data.minutes[bucket].map((s) =>
    s.replaceAll("$1$", values[0]).replaceAll("$2$", values[1]),
  );
}
export function wordTimeGlyphs(language: "en" | "zh" = "en") {
  const locale = wordLocales[language];
  return [...locale.hours, ...locale.minutes.flat()]
    .join("")
    .replaceAll("$1$", "")
    .replaceAll("$2$", "");
}
export function nativeWordTimeBindings(p: Project) {
  return p.layers
    .filter((l) => l.kind === "wordTime" && l.exportIncluded !== false)
    .map((l) => ({
      layerId: l.id,
      call: `GfcWordTime.lines(clock.hour,clock.min,sleeping?0:clock.sec,${JSON.stringify(l.wordLanguage || "en")})`,
      lines: 3,
      row: l.wordRow || "all",
    }));
}
export function nativeWordTimeFiles(p: Project): CodeFile[] {
  if (!nativeWordTimeBindings(p).length) return [];
  const en = wordLocales.en,
    zh = wordLocales.zh;
  return [
    {
      path: "source/GfcWordTime.mc",
      content: `// GarminFaceCreator fixed word-time adapter ${WORD_TIME_VERSION}. Locale phrases copyright (c) 2019 Samuel Rinnetmäki, MIT; see AboutTime notices.
// Creator adapter code GPL-3.0-or-later; original locale MIT terms retained.
import Toybox.Lang;
class GfcWordTime {
 static function lines(hour,minute,second,language){
  var bucket=((minute*60+second+150)/300).toNumber();if(bucket==12){hour=(hour+1)%24;bucket=0;}
  var hours=language.equals("zh")?${JSON.stringify(zh.hours)}:${JSON.stringify(en.hours)};
  var frames=language.equals("zh")?${JSON.stringify(zh.minutes)}:${JSON.stringify(en.minutes)};
  var values=[hours[hour%24],hours[(hour+1)%24]];var row=frames[bucket];
  return [Lang.format(row[0],values),Lang.format(row[1],values),Lang.format(row[2],values)];
 }
}`,
    },
  ];
}
export function mergeNativeWordTime(p: Project, files: CodeFile[]) {
  const map = new Map(files.map((f) => [f.path, f]));
  for (const f of nativeWordTimeFiles(p)) map.set(f.path, f);
  return [...map.values()];
}
