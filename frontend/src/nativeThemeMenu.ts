import type { Project, CodeFile } from "./domain.ts";
import { activeTheme } from "./themes.ts";
export const settingKey = (id: string) => "Gfc_" + id.replaceAll("-", "_");
export const colorPalette = [
  "#FFFFFF",
  "#DCE9F0",
  "#4FD1C5",
  "#F2A65F",
  "#FF6B6B",
  "#55AAFF",
  "#B77CFF",
  "#FF77BB",
  "#E9FF5C",
];
export function nativeThemeMenu(p: Project): CodeFile[] {
  if (!p.themes) return [];
  const q = JSON.stringify,
    controls = p.controls || [],
    themes = p.themes.presets,
    current = themes.find((t) => t.id === p.themes!.defaultId)!;
  const item = (label: string, id: string, sub = "null") =>
    `addItem(new WatchUi.MenuItem(${q(label)},${sub},${id},{}));`;
  const defaultValue = (c: (typeof controls)[number]) =>
    c.type === "color"
      ? "0x" + String(c.default).slice(1)
      : c.type === "dataSource"
        ? String(c.options!.indexOf(String(c.default)))
        : String(c.default);
  const common = controls.filter(
    (c) => !themes.some((t) => t.controlIds.includes(c.id)),
  );
  const root = themes
    .map(
      (t) =>
        `if(theme.equals(${q(t.id)})){${[...common, ...controls.filter((c) => t.controlIds.includes(c.id))].map((c) => item(c.label, `{:action=>"control",:id=>${q(c.id)}}`)).join("")}}`,
    )
    .join("");
  const colorEntries = (c: (typeof controls)[number]) => [
    ...new Set([
      String(p.controlValues?.[c.id] ?? c.default),
      String(c.default),
      ...colorPalette,
    ]),
  ];
  const values = controls
    .map((c) => {
      const entries =
        c.type === "boolean"
          ? [true, false]
          : c.type === "color"
            ? colorEntries(c)
            : c.options!;
      return `if(control.equals(${q(c.id)})){${entries.map((value, i) => item(c.type === "boolean" ? (value ? "On" : "Off") : String(value), `{:action=>"set",:key=>${q(settingKey(c.id))},:value=>${c.type === "boolean" ? value : c.type === "color" ? "0x" + String(value).slice(1) : i}}`)).join("")}}`;
    })
    .join("");
  const resets = themes
    .map(
      (t) =>
        `if(theme.equals(${q(t.id)})){${controls
          .filter((c) => t.controlIds.includes(c.id))
          .map(
            (c) =>
              `Application.Properties.setValue(${q(settingKey(c.id))},${defaultValue(c)});`,
          )
          .join("")}}`,
    )
    .join("");
  return [
    {
      path: "source/GfcThemeSettings.mc",
      content: `import Toybox.Application;import Toybox.WatchUi;import Toybox.Lang;
 function gfcThemeId(){var theme=${q(current.id)};try{var value=Application.Properties.getValue("Gfc_Theme");if(value instanceof Lang.String){${themes.map((t) => `if(value.equals(${q(t.id)})){theme=value;}`).join("")}}}catch(e){}return theme;}
 class GfcSettingsMenu extends WatchUi.Menu2{
 function initialize(mode,control){Menu2.initialize({:title=>${q(p.name + " Settings")}});menuMode=mode;menuControl=control;rebuild();}
 var menuMode=null;var menuControl=null;
 function onShow(){Menu2.onShow();rebuild();}
 function rebuild(){while(deleteItem(0)==true){}var mode=menuMode;var control=menuControl;var theme=gfcThemeId();
 if(mode.equals("root")){${item("Theme", '{:action=>"themes"}', "theme")}${root}${item("Reset current theme", '{:action=>"reset"}')}}
 else if(mode.equals("themes")){${themes.map((t) => item(t.name, `{:action=>"set",:key=>"Gfc_Theme",:value=>${q(t.id)}}`)).join("")}}
 else if(mode.equals("values")){${values}}
 }
 }
 class GfcSettingsDelegate extends WatchUi.Menu2InputDelegate{
 function initialize(){Menu2InputDelegate.initialize();}
 function onSelect(item){var id=item.getId() as Lang.Dictionary;var action=id[:action];
 if(action.equals("themes")){WatchUi.pushView(new GfcSettingsMenu("themes",null),new GfcSettingsDelegate(),WatchUi.SLIDE_IMMEDIATE);}
 else if(action.equals("control")){WatchUi.pushView(new GfcSettingsMenu("values",id[:id]),new GfcSettingsDelegate(),WatchUi.SLIDE_IMMEDIATE);}
 else if(action.equals("set")){Application.Properties.setValue(id[:key],id[:value]);Application.getApp().onSettingsChanged();WatchUi.popView(WatchUi.SLIDE_IMMEDIATE);}
 else if(action.equals("reset")){var theme=gfcThemeId();${resets}Application.getApp().onSettingsChanged();WatchUi.requestUpdate();}
 }
 }
`,
    },
  ];
}
