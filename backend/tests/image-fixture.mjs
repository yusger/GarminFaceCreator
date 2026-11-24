import { deflateSync } from "node:zlib";
import { files as base } from "./fixture.mjs";
function crc(bytes) {
  let n = 0xffffffff;
  for (const b of bytes) {
    n ^= b;
    for (let i = 0; i < 8; i++) n = (n >>> 1) ^ (n & 1 ? 0xedb88320 : 0);
  }
  return (n ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const payload = Buffer.concat([Buffer.from(type), data]);
  const len = Buffer.alloc(4),
    sum = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  sum.writeUInt32BE(crc(payload));
  return Buffer.concat([len, payload, sum]);
}
export function png(r, g, b) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(32, 0);
  header.writeUInt32BE(32, 4);
  header[8] = 8;
  header[9] = 6;
  const rows = Buffer.alloc(32 * (1 + 32 * 4));
  for (let y = 0; y < 32; y++)
    for (let x = 0; x < 32; x++) {
      const at = y * 129 + 1 + x * 4;
      rows.set([r, g, b, 255], at);
    }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(rows)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
export function imageFiles(
  appId,
  paths = ["assets/red.png", "assets/blue.png"],
) {
  return {
    ...base,
    "manifest.xml": base["manifest.xml"].replace(
      "4c3f31fda59c4f9bb25c4f7774eca711",
      appId,
    ),
    "resources/drawables/images.xml": `<drawables><bitmap id="Red" filename="../../${paths[0]}"/><bitmap id="Blue" filename="../../${paths[1]}"/></drawables>`,
    "resources/fonts/fonts.xml":
      '<fonts><font id="TestFont" filename="test.fnt"/></fonts>',
    "resources/fonts/test.fnt":
      'info face="Fixture" size=32 bold=0 italic=0 charset="" unicode=1 stretchH=100 smooth=0 aa=1 padding=0,0,0,0 spacing=0,0\ncommon lineHeight=32 base=32 scaleW=32 scaleH=32 pages=1 packed=0\npage id=0 file="font.png"\nchars count=1\nchar id=65 x=0 y=0 width=32 height=32 xoffset=0 yoffset=0 xadvance=32 page=0 chnl=15\n',
    "source/App.mc":
      'import Toybox.Application; import Toybox.WatchUi; import Toybox.Graphics; class SampleApp extends Application.AppBase {function initialize(){AppBase.initialize();} function getInitialView(){return [new SampleView()];}} class SampleView extends WatchUi.WatchFace {function initialize(){WatchFace.initialize();} function onUpdate(dc as Graphics.Dc) as Void {dc.setColor(Graphics.COLOR_BLACK,Graphics.COLOR_BLACK);dc.clear();var red=WatchUi.loadResource(Rez.Drawables.Red);var blue=WatchUi.loadResource(Rez.Drawables.Blue);dc.drawBitmap(170,160,red);dc.drawBitmap(250,160,blue);dc.setColor(Graphics.COLOR_WHITE,Graphics.COLOR_TRANSPARENT);dc.drawText(227,250,WatchUi.loadResource(Rez.Fonts.TestFont),"A",Graphics.TEXT_JUSTIFY_CENTER);}}',
  };
}
export function imageAssets(paths = ["assets/red.png", "assets/blue.png"]) {
  return {
    [paths[0]]: png(255, 0, 0),
    [paths[1]]: png(0, 100, 255),
    "resources/fonts/font.png": png(255, 255, 255),
  };
}
