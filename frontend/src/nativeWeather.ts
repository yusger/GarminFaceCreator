import {cachedWeatherSources} from "./nativeExtraMetrics.ts";
import type {Project,CodeFile} from "./domain.ts";
export const nativeWeatherFile:CodeFile={path:"source/GfcWeather.mc",content:`// GarminFaceCreator managed shared cached weather weather-2; no networking or active sensor sampling.
import Toybox.Weather;import Toybox.Time;
class GfcWeather {
 static var cached=null;static var stamp=-1;
 static function read(low){if(low){return cached;}var now=Time.now();var elapsed=now.value()-stamp;if(stamp>=0 && elapsed>=0 && elapsed<60){return cached;}stamp=now.value();cached=null;
  try{if((Toybox has :Weather)&&(Weather has :getCurrentConditions)){var c=Weather.getCurrentConditions();if(c!=null && (c has :observationTime)&&c.observationTime!=null){var age=now.value()-c.observationTime.value();if(age>=0 && age<=21600){cached=c;}}}}catch(e){}return cached;
 }
}`};
export function needsNativeWeather(p:Project){return p.layers.some(l=>l.exportIncluded!==false&&(l.weatherIcon||l.kind==="metric"&&cachedWeatherSources.includes(l.source)||l.visibility&&cachedWeatherSources.includes(l.visibility.source)))||(p.controls||[]).some(c=>c.type==="dataSource"&&c.options?.some(s=>cachedWeatherSources.includes(s)));}
