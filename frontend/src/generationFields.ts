import type {Layer} from "./domain";
export const GENERATION_FIELD_CONTRACT_VERSION="fields-9-component-style-metadata";
type Omitted =
  | "componentStyle"
  | "chart"
  | "polygonPoints"
  | "readoutSample"
  | "image"
  | "assetId"
  | "hidden"
  | "locked"
  | "anchor"
  | "guide"
  | "groupId"
  | "groupName"
  | "exportIncluded"
  | "libraryIcon"
  | "weatherIcon"
  | "thresholdRules"
  | "visibility"
  | "customFont"
  | "handShape"
  | "handBitmap"
  | "widgetOrigin"
  | "compound"
  | "compoundOverrides";
// Adding a Layer field requires an explicit protocol decision here (compile-time complete key coverage).
export const generationScalarFields: Record<Exclude<keyof Layer, Omitted>, true> = {
  bitmapFontId:true,
  bitmapTracking:true,bitmapTabular:true,bitmapBaselineShift:true,bitmapLineHeight:true,
  moonHemisphere:true,
  effectPrompt: true,
  id: true,
  name: true,
  kind: true,
  x: true,
  y: true,
  w: true,
  h: true,
  color: true,
  size: true,
  rotation: true,
  arcRadius:true,
  arcStartAngle:true,
  arcDirection:true,
  arcSpacing:true,
  text: true,
  source: true,
  aod: true,
  threshold: true,
  strokeWidth: true,
  metricDecoration: true,
  sourceLocked: true,
  fixedSource: true,
  activeVisible: true,
  imageFullColor: true,
  iconMask:true,
  sourceLabelFor: true,
  preserveSourceLabelDefault:true,
  sourceLabelStyle:true,
  autoPrecision: true,
  autoSourceFormat: true,
  groupThousands: true,
  meterContinuous: true,
  meterDimColor: true,
  dateFormat: true,
  handCap: true,
  wordLanguage: true,
  wordRow: true,
  handType: true,
  handPivotX: true,
  handPivotY: true,
  handReach: true,
  handTail: true,
  solarPart: true,
  solarNightColor: true,
  solarMissingColor: true,
  calendarStart: true,
  calendarTodayColor: true,
  calendarTodayText: true,
  calendarMutedColor: true,
  calendarHeaderColor: true,
  meterShape: true,
  meterCount: true,
  meterGap: true,
  meterGoal: true,
  meterDim: true,
  timePart: true,
  timeUtcOffset: true,
  dateLocale: true,
  textAlign: true,
  fontWeight: true,
  garminFont: true,
  label: true,
  unit: true,
  precision: true,
  missingValue: true,
  allowClip: true,
  thresholdFallback: true,
  ringStyle:true,
  ringCap:true,
  ringTicks: true,
  ringStart: true,
  ringEnd: true,
  ringWidth: true,
  ringSource: true,
  ringGoal: true,
  ringDim: true,
  aodColor: true,
  aodSize: true,
  aodSeconds: true,
  fillEnabled: true,
  strokeEnabled: true,
  strokeColor: true,
  opacity: true,
  cornerRadius: true,
};
export const generationSpecialFields: Record<Omitted,string> = {
  componentStyle:"editor master/instance link; baked child appearance is authoritative; never direct private geometry patches",
  chart:"validated daily time-series configuration; scalar whitelist only",
  "polygonPoints": "validated normalized simple outline point pairs; concave allowed, no holes/crossings/contacts; copied as numeric arrays",
  "readoutSample": "editor preview only; omitted",
  "image": "replaced by a declared asset path; pixel bytes are not prompt fields",
  "assetId": "local storage identity; omitted",
  "hidden": "editor visibility; generation uses exportIncluded and emits hidden=false",
  "locked": "editor interaction only; omitted",
  "anchor": "editor layout only; omitted",
  "guide": "editor guide only; omitted",
  "groupId": "editor group only; omitted",
  "groupName": "editor group label only; omitted",
  "exportIncluded": "filters the included layer set before serialization",
  "libraryIcon": "nested whitelist id/recolor/strokeWidth",
  "weatherIcon": "nested whitelist period",
  "thresholdRules": "nested whitelist min/max/color per rule",
  "visibility": "validated nested source/ranges/missing/AOD whitelist",
  "customFont": "nested whitelist registered id/family/file",
  "handShape": "nested whitelist id/version and numeric normalized points",
  "handBitmap": "nested whitelist packId/setId/role/version",
  "widgetOrigin": "private provenance; omitted",
  "compound": "parent expanded by the platform; private content cannot be AI patches",
  "compoundOverrides": "resolved with parent instance before expansion"
};
