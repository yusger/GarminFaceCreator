import catalog from "../../resources/capabilities/source-adapters-v1.json" with { type: "json" };
export type SourceAdapter = {api:string;read:string;permission?:string;unit?:string;defaultDisplayUnit:string;decoration:string};
export const sourceContractVersion = catalog.version;
export const sourceAdapters: Readonly<Record<string, Readonly<SourceAdapter>>> = catalog.adapters;
export const sourceDisplayUnits: Record<string,string> = Object.fromEntries(Object.entries(sourceAdapters).filter(([,a])=>a.defaultDisplayUnit).map(([s,a])=>[s,a.defaultDisplayUnit]));
export const sourceDecorations: Record<string,string> = Object.fromEntries(Object.entries(sourceAdapters).filter(([,a])=>a.decoration).map(([s,a])=>[s,a.decoration]));
