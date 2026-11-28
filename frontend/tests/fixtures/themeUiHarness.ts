import {projectForDevice,deviceKey} from "../../src/multiDevice";
import type { Project } from "../../src/domain";
import { localGenerate } from "../../src/localGenerator";
import { preparedCodeFiles } from "../../src/chalkFonts";
import { preparedAssets } from "../../src/iconLibrary";
import { controlSettingKey } from "../../src/nativeSettingIds";
import { themeBackgroundKey } from "../../src/themes";
function fixture(input: Project, nonce: string,target="venu445mm") {
  if (!/^[a-f0-9]{32}$/.test(nonce))
    throw Error("Unique fixture identity required");
  if (!["venu445mm","venu441mm"].includes(target))throw Error("Venu4 fixture target required");
  const p = projectForDevice(input,deviceKey({target,deviceSize:target==="venu445mm"?"45mm":"41mm"}));
  p.id = nonce;
  p.appId = nonce;
  p.name = "trail";
  p.files = localGenerate(p);
  const keys = [
    "Gfc_Theme",
    ...p.themes!.presets.map((t) => themeBackgroundKey(t.id)),
    ...p
      .controls!.filter((c) => c.id.startsWith("apex-"))
      .filter((c, i) => i < 4 || c.type === "boolean")
      .map(controlSettingKey),
  ];
  p.files = p.files.map((f) =>
    f.path === "source/App.mc"
      ? {
          ...f,
          content: f.content
            .replace("function onEnterSleep(){","function onEnterSleep(){gfcUiCount=0;System.println(\"GFC_LIFECYCLE enterSleep\");")
            .replace("function onExitSleep(){","function onExitSleep(){gfcUiCount=0;System.println(\"GFC_LIFECYCLE exitSleep\");")
            .replace(/(local generator basic-[a-z0-9-]+)/, "$1-fixture")
            .replace(
              "if(!gfcFrameReported){System.println(",
              `if(!gfcFrameReported){System.println("GFC_THEME_UI_VALIDATION=1");System.println("GFC_THEME_UI_RUN=${nonce}");System.println(`,
            )
            .replace(
              " function onUpdate(dc as Graphics.Dc) as Void {",
              ` function onUpdate(dc as Graphics.Dc) as Void {if(gfcUiCount<1){var mem=System.getSystemStats();System.println("GFC_VM_MEMORY used="+mem.usedMemory+" total="+mem.totalMemory+" free="+mem.freeMemory);System.println("GFC_THEME_UI_STATE "+gfcThemeId());${keys.map((k) => `System.println(${JSON.stringify(k + "=")}+Application.Properties.getValue(${JSON.stringify(k)}));`).join("")}gfcUiCount+=1;}`,
            )
            .replace(
              "function getSettingsView(){",
              'function getSettingsView(){System.println("GFC_THEME_UI_GET_SETTINGS");',
            )
            .replace(
              "var gfcFrameReported=false;",
              "var gfcFrameReported=false;var gfcUiCount=0;",
            )
            .replace(
              "function onSettingsChanged(){",
              "function onSettingsChanged(){mainView.gfcUiCount=0;",
            ),
        }
      : f.path === "source/GfcThemeSettings.mc"
        ? {
            ...f,
            content: f.content
              .replace(
                "import Toybox.Application;",
                "import Toybox.System;import Toybox.Application;",
              )
              .replace(
                "var action=id[:action];",
                'var action=id[:action];System.println("GFC_THEME_UI_ACTION "+action+" mode="+id[:mode]+" id="+id[:id]);',
              )
              .replace(
                "Application.Properties.setValue(id[:key],id[:value]);",
                'Application.Properties.setValue(id[:key],id[:value]);System.println("GFC_THEME_UI_SET "+id[:key]+"="+Application.Properties.getValue(id[:key]));',
              ),
          }
        : f,
  );
  if (
    !p.files
      .find((f) => f.path === "source/App.mc")
      ?.content.includes("var gfcUiCount=0")
  )
    throw Error("Observer hook changed");
  return p;
}
function observedAiFixture(input:Project,nonce:string){
 if(!/^[a-f0-9]{32}$/.test(nonce)||input.target!=="venu445mm"||input.codeProvenance?.primary!=="ai")throw Error("Require an actual AI Venu4 project");
 const p=structuredClone(input),old=p.appId;p.id=nonce;p.appId=nonce;
 let observed=false;
 p.files=p.files.map(f=>{
  if(f.path==="manifest.xml")return {...f,content:f.content.replaceAll(old,nonce)};
  if(f.path!=="source/GfcFrameReporter.mc")return f;
  let content=f.content.replace("import Toybox.WatchUi;","import Toybox.Application;import Toybox.WatchUi;")
   .replace("var inner=null;var low=false;var reported=false;","var inner=null;var low=false;var reported=false;var observedTheme=-1;")
   .replace("function onEnterSleep(){","function onEnterSleep(){System.println(\"GFC_LIFECYCLE enterSleep\");")
   .replace("function onExitSleep(){","function onExitSleep(){System.println(\"GFC_LIFECYCLE exitSleep\");")
   .replace("inner.onUpdate(dc);if(!reported){",`inner.onUpdate(dc);var current=Application.Properties.getValue("Gfc_Theme");if(current!=observedTheme){observedTheme=current;System.println("GFC_AI_THEME="+current);}if(!reported){System.println("GFC_THEME_UI_VALIDATION=1");System.println("GFC_THEME_UI_RUN=${nonce}");`);
  observed=content.includes("var observedTheme=-1")&&content.includes("GFC_AI_THEME=");
  return {...f,content};
 });
 if(!observed||p.files.some(f=>f.path.endsWith(".mc")&&f.path!=="source/GfcFrameReporter.mc"&&f.content!==input.files.find(x=>x.path===f.path)?.content))throw Error("Observation must leave all AI drawing source exact");
 return p;
}
Object.assign(window, {
  gfcThemeUiFixture: { fixture, observedAiFixture, preparedCodeFiles, preparedAssets },
});
