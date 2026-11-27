// Local change identities, not cryptographic evidence or authorization tokens.
// Native verification independently binds actual source/PRG with server SHA256.
function canonical(v:unknown):unknown {
  if(Array.isArray(v))return v.map(canonical);
  if(v && typeof v === "object")return Object.fromEntries(Object.entries(v).filter(([k,x])=>x!==undefined && k!=="readoutSample").sort(([a],[b])=>a.localeCompare(b)).map(([k,x])=>[k,canonical(x)]));
  return v;
}
export function contextIdentity(v:unknown) {
  const text=JSON.stringify(canonical(v));let a=2166136261,b=0x9e3779b9;
  for(let i=0;i<text.length;i++){const c=text.charCodeAt(i);a=Math.imul(a^c,16777619);b=Math.imul(b^c,2246822519);}
  return "local-v1:"+(a>>>0).toString(16).padStart(8,"0")+(b>>>0).toString(16).padStart(8,"0")+":"+text.length;
}
