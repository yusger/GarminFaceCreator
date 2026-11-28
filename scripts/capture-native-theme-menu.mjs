import { build } from "vite";
import { chromium } from "@playwright/test";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import crypto from "node:crypto";
import path from "node:path";
const scenario = process.argv[2];
if (!["themes", "persistence", "overrides", "matrix45", "matrix41", "inspect41", "lifecycle41", "persistence41", "lifecycle45", "upgrade41", "paid45"].includes(scenario))
  throw Error("Choose explicit themes, persistence or overrides scenario");
const matrix=scenario.startsWith("matrix");
const dir = "Temp/native-theme-ui-" + scenario + "-" + Date.now();
if (
  process.env.GFC_NATIVE_FIXTURE_TEST !== "1" ||
  !process.env.GFC_TEST_URL ||
  !process.env.GFC_SSH_HOST ||
  !process.env.GFC_SSH_USER ||
  !process.env.GFC_SSH_PASSWORD
)
  throw Error(
    "Explicit native fixture and authorized staging SSH environment required",
  );
const endpoint = new URL(process.env.GFC_TEST_URL);
if (
  !["http:", "https:"].includes(endpoint.protocol) ||
  endpoint.username ||
  endpoint.password
)
  throw Error("Invalid staging URL");
const require = createRequire(import.meta.url),
  { Client } = require(process.env.GFC_SSH_MODULE || "ssh2");
await mkdir(dir, { recursive: true });
const conn = new Client();
await new Promise((r, j) => {
  conn.once("ready", r).once("error", j).connect({
    host: process.env.GFC_SSH_HOST,
    username: process.env.GFC_SSH_USER,
    password: process.env.GFC_SSH_PASSWORD,
  });
});
const exec = (cmd) =>
  new Promise((r, j) =>
    conn.exec(cmd, (e, s) => {
      if (e) return j(e);
      let b = [],
        err = [];
      s.on("data", (d) => b.push(d));
      s.stderr.on("data", (d) => err.push(d));
      s.on("close", (code) =>
        code
          ? j(Error(Buffer.concat(err).toString() || "remote " + code))
          : r(Buffer.concat(b)),
      );
    }),
  );
let upgradeSeed, upgradeIdentity;
if(scenario==="upgrade41"){
 const from=path.resolve(process.env.GFC_NATIVE_UPGRADE_FROM||"");
 if(!from.startsWith(path.resolve("Temp")+path.sep))throw Error("Upgrade evidence must be inside ignored Temp");
 const session=JSON.parse(await readFile(path.join(from,"session.json"),"utf8"));
 const prior=JSON.parse(await readFile(path.join(from,"native.json"),"utf8"));
 if(prior.status!=="succeeded"||prior.target!=="venu441mm"||prior.report?.cleanupStatus!=="completed"||!/^[a-f0-9]{32}$/.test(session.nonce))throw Error("Require successful same-target source identity");
 upgradeSeed=await readFile(path.join(from,"settings.set"));
 if(!upgradeSeed.length||upgradeSeed.length>65536)throw Error("SDK SET size is out of bounds");
 upgradeIdentity=session.nonce;
 await writeFile(dir+"/upgrade-source.json",JSON.stringify({appId:upgradeIdentity,target:prior.target,priorPrgSha256:prior.prgSha256,seedSha256:crypto.createHash("sha256").update(upgradeSeed).digest("hex"),seedBytes:upgradeSeed.length},null,2));
}
const nonce = upgradeIdentity||crypto.randomBytes(16).toString("hex"),
  url = endpoint.href.replace(/\/$/, "");
if (process.env.GFC_NATIVE_FIXTURE_TEST !== "1" || !url)
  throw Error("Explicit native test URL required");
let browser;
try {
  const b = await build({
      configFile: false,
      logLevel: "silent",
      define: { "process.env.NODE_ENV": JSON.stringify("production") },
      build: {
        write: false,
        minify: false,
        lib: {
          entry: matrix?"frontend/tests/fixtures/trailMatrixHarness.ts":"frontend/tests/fixtures/themeUiHarness.ts",
          name: "GfcThemeFixture",
          formats: ["iife"],
        },
      },
    }),
    entry = (Array.isArray(b) ? b[0] : b).output.find(
      (f) => f.type === "chunk" && f.isEntry,
    );
  if (!entry) throw Error("Missing fixture harness");
  browser = await chromium.launch({
    channel: process.env.PLAYWRIGHT_CHANNEL || "msedge",
    headless: true,
  });
  const page = await browser.newPage();
  await page.goto(url);
  await page.addScriptTag({ content: entry.code });
  const sourceFile=scenario==="paid45"?path.resolve(process.env.GFC_PAID_PROJECT_FILE||""):"resources/default-watchfaces/trail/design.json";
  if(scenario==="paid45"&&!sourceFile.startsWith(path.resolve("Temp")+path.sep))throw Error("Private paid project must be in Temp");
  const p = JSON.parse(await readFile(sourceFile,"utf8"));
  const result = await page.evaluate(
    async ({ p, nonce,scenario,matrix }) => {
      if(scenario==="upgrade41"){
        p.name="trail upgrade v2";
        p.themes.presets[0].backgroundColor="#14202B";
      }
      const h = matrix?window.gfcTrailMatrix:window.gfcThemeUiFixture;
      const f = scenario==="paid45"?h.observedAiFixture(p,nonce):matrix?h.fixture(p,nonce,scenario==="matrix41"?"venu441mm":"venu445mm"):h.fixture(p, nonce,["inspect41","lifecycle41","persistence41","upgrade41"].includes(scenario)?"venu441mm":"venu445mm"),
        form = new FormData();
      form.append(
        "project",
        JSON.stringify({
          projectId: f.id,
          projectName: f.name,
          target: f.target,
          appId: f.appId,
          revision: f.revision,
        }),
      );
      const shots=matrix?await h.captures(f):[];
      for (const file of await h.preparedCodeFiles(f))
        form.append("files", new Blob([file.content]), file.path);
      for (const a of await h.preparedAssets(f))
        form.append("files", await (await fetch(a.data)).blob(), a.path);
      const r = await fetch("/api/builds", { method: "POST", body: form });
      return { status: r.status, job: await r.json(), files: f.files,shots };
    },
    { p, nonce,scenario,matrix },
  );
  if (result.status !== 202) throw Error(JSON.stringify({status:result.status,error:result.job?.error}));
  await writeFile(dir+"/private-job.json",JSON.stringify(result.job));
  await writeFile(dir + "/source.json", JSON.stringify(result.files, null, 2));
  if(matrix){for(const record of result.shots){await writeFile(dir+"/browser-"+record.index+".png",Buffer.from(record.shot.data.split(",")[1],"base64"));delete record.shot.data;}await writeFile(dir+"/browser-matrix.json",JSON.stringify(result.shots,null,2));}
  const root = url + "/api/builds/" + result.job.buildId,
    headers = { Authorization: "Bearer " + result.job.accessToken };
  const get = async (s) => {
    const r = await fetch(root + s, { headers });
    if (!r.ok) throw Error(s + " " + r.status);
    return r;
  };
  const poll = async (s) => {
    for (let i = 0; i < 110; i++) {
      const st = await (await get(s)).json();
      if (["failed", "succeeded", "cancelled"].includes(st.status)) return st;
      await new Promise((r) => setTimeout(r, 1000));
    }
    throw Error("timeout");
  };
  const compiled = await poll("");
  await writeFile(
    dir + "/compile.json",
    JSON.stringify(
      { compiled, logs: await (await get("/logs")).json() },
      null,
      2,
    ),
  );
  if (compiled.status !== "succeeded")
    throw Error("SDK failed; see compile.json");
  const r = await fetch(root + "/native-verification", {
    method: "POST",
    headers,
  });
  if (r.status !== 202) throw Error(await r.text());
  let container;
  for (let i = 0; i < 50; i++) {
    const names = (
      await exec(
        "docker ps --filter label=gfc.native-worker --format '{{.Names}}'",
      )
    )
      .toString()
      .trim()
      .split("\n")
      .filter(Boolean);
    for (const n of names) {
      if (!/^gfc-native-[a-f0-9]{32}$/.test(n)) continue;
      const logs = (
        await exec(
          `docker exec ${n} cat /output/monkeydo.log 2>/dev/null || true`,
        )
      ).toString();
      if (logs.includes("GFC_THEME_UI_RUN=" + nonce)) {
        container = n;
        break;
      }
    }
    if (
      container &&
      (
        await exec(
          `docker exec ${container} test -f /output/theme-ui-boot.ready && echo yes || true`,
        )
      )
        .toString()
        .includes("yes")
    )
      break;
    await new Promise((r) => setTimeout(r, 500));
  }
  if (!container) {const native=await(await get("/native-verification")).json();await writeFile(dir+"/native-original.json",JSON.stringify(native,null,2));throw Error("Native UI session was not reached: "+native.status+" / "+native.error);}
  const digest = (
    await exec(`docker exec ${container} sha256sum /input/watchface.prg`)
  )
    .toString()
    .split(" ")[0];
  await writeFile(
    dir + "/session.json",
    JSON.stringify({ container, digest, nonce }),
  );
  await writeFile(
    dir + "/boot.png",
    await exec(
      `docker exec ${container} cat /output/theme-ui-boot-desktop.png`,
    ),
  );
  const expected = (await (await get("/native-verification")).json()).prgSha256;
  if (digest !== expected)
    throw Error("Immutable PRG hash does not match the authorized API job");
  console.log("BOOT_READY " + container + " " + digest);
  const common = `set -eu
# Measured SDK 9.3 desktop coordinates for Venu 4 45mm only.
open_settings(){ xdotool mousemove 65 12 click 1 mousemove 174 994; sleep 1.6; xdotool mousemove 147 940 click 1; sleep 1.2; }
close_settings(){ xdotool mousemove 65 12 click 1 mousemove 174 994; sleep 1.6; xdotool mousemove 147 965 click 1; sleep 1.2; }
`;
  let script =
    common +
    (scenario==="upgrade41"?`sha256sum /input/watchface.prg | cut -d' ' -f1 > /output/theme-ui-restart.request
for i in $(seq 1 30); do test -f /output/theme-ui-restart.ready && break; sleep 1; done
test -f /output/theme-ui-restart.ready
sleep 2
import -window root /output/ui-upgraded.png
`:scenario.startsWith("lifecycle")?`xdotool mousemove 65 12 click 1 mousemove 174 994
sleep 1.6
xdotool mousemove 170 815
sleep 1.2
import -window root /output/ui-display-modes.png
xdotool mousemove 375 840 click 1
sleep 5
import -window root /output/ui-always-on.png
xdotool mousemove 65 12 click 1 mousemove 174 994
sleep 1.6
xdotool mousemove 170 815
sleep 1.2
xdotool mousemove 375 815 click 1
sleep 3
import -window root /output/ui-high-power.png
sha256sum /input/watchface.prg | cut -d' ' -f1 > /output/theme-ui-restart.request
for i in $(seq 1 30); do test -f /output/theme-ui-restart.ready && break; sleep 1; done
test -f /output/theme-ui-restart.ready
find "$HOME" /tmp /output -type f -iname '*.set' -print > /output/ui-settings-paths.txt
settings=/tmp/com.garmin.connectiq/GARMIN/APPS/SETTINGS/WATCHFACE.SET
test -f "$settings" && test ! -L "$settings" && test "$(wc -c < "$settings")" -le 65536
cp "$settings" /output/ui-settings.set
sleep 2
`:scenario==="inspect41"?`open_settings
import -window root /output/ui-root41.png
xdotool mousemove 287 406 click 1
sleep 1.2
import -window root /output/ui-themes41.png
xdotool mousemove 287 527 click 1
sleep 1.2
close_settings
import -window root /output/ui-trail41.png
open_settings
xdotool mousemove 287 406 click 1
sleep 1.2
xdotool mousemove 287 620 click 1
sleep 1.2
close_settings
import -window root /output/ui-vital41.png
xdotool mousemove 143 12 click 1
sleep 1
import -window root /output/ui-simulation41.png
xdotool key Escape
xdotool mousemove 65 12 click 1 mousemove 174 994
sleep 1.6
import -window root /output/ui-settings41.png
xdotool key Escape
`: matrix ? `set -x
for index in $(seq 0 11); do
 for attempt in $(seq 1 450); do
  grep -Fq "GFC_MATRIX_FRAME=$index vm=" /output/monkeydo.log && break
  sleep 0.1
 done
 grep -Fq "GFC_MATRIX_FRAME=$index vm=" /output/monkeydo.log
 import -window root /output/ui-matrix-$index.png
 xdotool mousemove 16 12 click 1 mousemove 104 37 click 1
 sleep 1
 dialog=$(xdotool search --onlyvisible --class simulator | tail -1)
 test -n "$dialog"
 xdotool windowfocus "$dialog"
 xdotool mousemove --window "$dialog" 230 27 click 1
 xdotool key ctrl+a
 xdotool type --delay 1 --clearmodifiers "ui-sdk-$index.png"
 width=$(xdotool getwindowgeometry --shell "$dialog" | grep '^WIDTH=' | cut -d= -f2)
 height=$(xdotool getwindowgeometry --shell "$dialog" | grep '^HEIGHT=' | cut -d= -f2)
 xdotool key Return
 sleep 1
 if ! test -s "/output/ui-sdk-$index.png"; then
 xdotool mousemove --window "$dialog" "$((width-50))" "$((height-24))" click 1
 fi
 for attempt in $(seq 1 30); do test -s "/output/ui-sdk-$index.png" && break; sleep 0.05; done
 test -s "/output/ui-sdk-$index.png"
 done
` : scenario === "overrides" ? `back(){ xdotool mousemove 591 624 click 1; sleep 1.2; }
scroll_one(){ xdotool mousemove 325 600 mousedown 1; sleep 0.05; xdotool mousemove 325 320; sleep 0.05; xdotool mouseup 1; sleep 1.3; }
open_settings
scroll_one
xdotool mousemove 325 572 click 1
sleep 1.2
xdotool mousemove 325 431 click 1
sleep 1.2
xdotool mousemove 325 572 click 1
sleep 1.2
back
back
import -window root /output/ui-custom-source.png
open_settings
scroll_one
xdotool mousemove 325 680 click 1
sleep 1.2
import -window root /output/ui-custom-color-group.png
xdotool mousemove 325 431 click 1
sleep 1.2
xdotool mousemove 325 572 click 1
sleep 1.2
back
back
import -window root /output/ui-custom-color.png
open_settings
xdotool mousemove 325 680 click 1
sleep 1.2
xdotool mousemove 325 680 click 1
sleep 1.2
xdotool mousemove 325 572 click 1
sleep 1.2
back
back
import -window root /output/ui-custom-before-restart.png
sha256sum /input/watchface.prg | cut -d' ' -f1 > /output/theme-ui-restart.request
for i in $(seq 1 30); do test -f /output/theme-ui-restart.ready && break; sleep 1; done
test -f /output/theme-ui-restart.ready
import -window root /output/ui-custom-after-restart.png
` : ["persistence","persistence41"].includes(scenario)
      ? `open_settings
xdotool mousemove 325 431 click 1
sleep 1.2
xdotool mousemove 325 572 click 1
sleep 1.2
import -window root /output/ui-trail-root.png
xdotool mousemove 325 572 click 1
sleep 1.2
import -window root /output/ui-background-list.png
xdotool mousemove 325 572 click 1
sleep 1.2
close_settings
import -window root /output/ui-trail-black.png
sha256sum /input/watchface.prg | cut -d' ' -f1 > /output/theme-ui-restart.request
for i in $(seq 1 30); do test -f /output/theme-ui-restart.ready && break; sleep 1; done
test -f /output/theme-ui-restart.ready
import -window root /output/ui-after-restart.png
settings=/tmp/com.garmin.connectiq/GARMIN/APPS/SETTINGS/WATCHFACE.SET
test -f "$settings" && test ! -L "$settings" && test "$(wc -c < "$settings")" -le 65536
cp "$settings" /output/ui-settings.set
sleep 2
`
      : `open_settings
import -window root /output/ui-root.png
xdotool mousemove 325 431 click 1
sleep 1.2
import -window root /output/ui-themes.png
xdotool mousemove 325 572 click 1
sleep 1.2
close_settings
import -window root /output/ui-trail.png
open_settings
xdotool mousemove 325 431 click 1
sleep 1.2
xdotool mousemove 325 680 click 1
sleep 1.2
close_settings
import -window root /output/ui-vital.png
`);
  if(scenario==="paid45"&&process.env.GFC_AI_THEME_AUTO_EXIT==="1")script=script.replaceAll("\nclose_settings\n","\n");
  if(scenario==="paid45")script+=`xdotool mousemove 65 12 click 1 mousemove 174 994
sleep 1.6
xdotool mousemove 170 815
sleep 1.2
xdotool mousemove 375 840 click 1
sleep 4
import -window root /output/ui-vital-aod.png
xdotool mousemove 65 12 click 1 mousemove 174 994
sleep 1.6
xdotool mousemove 170 815
sleep 1.2
xdotool mousemove 375 815 click 1
sleep 2
import -window root /output/ui-vital-active.png
`;
  if(scenario==="persistence41")script=script.replaceAll("325 431","287 406").replaceAll("325 572","287 527");
  if(scenario==="upgrade41"){
    const digest=crypto.createHash("sha256").update(upgradeSeed).digest("hex");
    await exec(`docker exec ${container} sh -c 'printf %s ${upgradeSeed.toString("base64")} | base64 -d > /output/theme-ui-settings.seed; printf %s ${digest} > /output/theme-ui-settings.seed.sha256'`);
  }
  const quoted = "'" + script.replaceAll("'", "'\\''") + "'";
  console.log(
    (await exec(`docker exec ${container} bash -c ${quoted}`)).toString(),
  );
  const names = (
    await exec(
      `docker exec ${container} find /output -maxdepth 1 -name 'ui-*.png' -printf '%f\\n'`,
    )
  )
    .toString()
    .trim()
    .split("\n")
    .filter(Boolean);
  for (const n of names) {
    if (/^ui-[a-z0-9-]+\.png$/.test(n))
      await writeFile(
        dir + "/" + n,
        await exec(`docker exec ${container} cat /output/${n}`),
      );
  }
  if(scenario==="persistence41")await writeFile(dir+"/settings.set",await exec(`docker exec ${container} cat /output/ui-settings.set`));
  if(scenario.startsWith("lifecycle")){await writeFile(dir+"/settings-paths.txt",await exec(`docker exec ${container} cat /output/ui-settings-paths.txt`));await writeFile(dir+"/settings.set",await exec(`docker exec ${container} cat /output/ui-settings.set`));}
  await writeFile(
    dir + "/observations.log",
    await exec(`docker exec ${container} cat /output/monkeydo.log`),
  );
  await writeFile(
    dir + "/session-result.txt",
    await exec(`docker exec ${container} cat /output/theme-ui-session.txt`),
  );
  await exec(
    `docker exec ${container} bash -c 'sha256sum /input/watchface.prg | cut -d " " -f1 > /output/theme-ui.done'`,
  );
  const native = await poll("/native-verification");
  await writeFile(dir + "/native.json", JSON.stringify(native, null, 2));
  console.log("NATIVE_FINAL", native.status, native.error || "");
  if (
    native.status !== "succeeded" ||
    native.report?.cleanupStatus !== "completed"
  )
    throw Error("Native run or cleanup failed");
  const observations = (
    await readFile(dir + "/observations.log", "utf8")
  ).replaceAll("\r\n", "\n");
  const states = [...observations.matchAll(/GFC_THEME_UI_STATE ([a-z]+)/g)].map(
    (m) => m[1],
  );
  if (
    scenario === "themes" &&
    (!states.includes("trail") || !states.includes("vital"))
  )
    throw Error("Actual three-theme transition not observed");
  if (["persistence","persistence41"].includes(scenario)) {
    const sections = observations.split("GFC_THEME_UI_STATE ");
    const last = sections.at(-1);
    if (
      !last?.startsWith("trail\n") ||
      !last.includes("Gfc_Background_2078923795=0") ||
      states.filter((s) => s === "trail").length !== 2
    )
      throw Error("Theme/background persistence was not observed");
    if (
      !(await readFile(dir + "/session-result.txt", "utf8")).includes(
        "samePrgRestartReady=true",
      )
    )
      throw Error("Same-PRG restart was not completed");
  }
  if(scenario==="overrides"){
    const last=observations.split("GFC_THEME_UI_STATE ").at(-1);
    for(const expected of ["Gfc_Source_apex_value_apex_tl=588927973","Gfc_apex_value_apex_tl_color=16777215","Gfc_apex_show_seconds=false"]){if(!last?.startsWith("apex\n")||!last.includes(expected))throw Error("Independent override not persisted: "+expected);}
    if(!(await readFile(dir+"/session-result.txt","utf8")).includes("samePrgRestartReady=true"))throw Error("Same PRG restart not observed");
  }
  if(scenario==="upgrade41"){
    const last=observations.split("GFC_THEME_UI_STATE ").at(-1);
    if(!last?.startsWith("trail\n")||!last.includes("Gfc_Background_2078923795=0"))throw Error("Old SET theme/background not preserved across PRGs");
    const audit=JSON.parse(await readFile(dir+"/upgrade-source.json","utf8"));
    if(audit.priorPrgSha256===digest)throw Error("Upgrade must actually use a different PRG");
    const session=await readFile(dir+"/session-result.txt","utf8");
    if(!session.includes("samePrgRestartReady=true")||!session.includes("settingsSeedSha256="+audit.seedSha256))throw Error("SET seed restore or immutable new PRG restart not confirmed");
  }
  if(scenario==="paid45"){
    for(const code of [2009808953,2078923795,1156566441])if(!observations.includes("GFC_AI_THEME="+code))throw Error("Actual AI theme not observed: "+code);
    if(!observations.includes("GFC_LIFECYCLE enterSleep")||!observations.includes("GFC_LIFECYCLE exitSleep"))throw Error("Actual AI lifecycle not observed");
  }
  if(scenario.startsWith("lifecycle")&&(!observations.includes("GFC_LIFECYCLE enterSleep")||!observations.includes("GFC_LIFECYCLE exitSleep")))throw Error("Actual enterSleep/exitSleep callbacks not observed; screenshots alone do not pass");
  if(matrix){for(let i=0;i<12;i++)if(!observations.includes("GFC_MATRIX_FRAME="+i+" vm="))throw Error("Missing controlled matrix frame "+i);}
  await writeFile(
    dir + "/validation.json",
    JSON.stringify(
      {
        scenario,
        states,
        ...(scenario==="paid45"?{aiThemes:[...observations.matchAll(/GFC_AI_THEME=(\d+)/g)].map(m=>Number(m[1])),themeAutoExit:process.env.GFC_AI_THEME_AUTO_EXIT==="1"}:{}),
        prgSha256: digest,
        sourceSha256: native.sourceSha256,
        cleanupStatus: native.report.cleanupStatus,
        applicationDataMode: matrix?"controlled-fixed-data":native.report.dataMode,
        aodMode:matrix?"forced rendering; not lifecycle":(scenario.startsWith("lifecycle")||scenario==="paid45")?"actual SDK Display Mode Always-On":"unverified",
        hardware: "unverified",
        sleepTransition: (scenario.startsWith("lifecycle")||scenario==="paid45")?"observed SDK enterSleep and exitSleep; not hardware":"unverified",
      },
      null,
      2,
    ),
  );
  console.log("Validated fixture " + dir);
  if (native.status === "succeeded")
    await writeFile(
      dir + "/native.png",
      Buffer.from(
        await (
          await get("/native-verification/artifacts/screen.png")
        ).arrayBuffer(),
      ),
    );
} finally {
  await browser?.close();
  conn.end();
}
