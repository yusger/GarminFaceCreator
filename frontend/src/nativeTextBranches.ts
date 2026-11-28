// Factor only a terminal bitmap text call whose non-text arguments are byte-identical.
// Branch-local formatting and paint stay in their original scopes and order.
export function factorNativeTextBranches(branches: string[]) {
  const name="GfcBitmapText.drawDetailed(";
  const parsed=branches.map(code=>{
    const start=code.lastIndexOf(name);if(start<0)return null;
    let depth=0,quoted=false,escaped=false,argStart=start+name.length;
    const args:string[]=[];let end=-1;
    for(let i=argStart;i<code.length;i++){
      const ch=code[i];
      if(quoted){if(escaped)escaped=false;else if(ch==="\\")escaped=true;else if(ch==='"')quoted=false;continue;}
      if(ch==='"'){quoted=true;continue;}
      if(ch==='('||ch==='['||ch==='{')depth++;
      else if(ch===')'&&depth===0){args.push(code.slice(argStart,i));end=i+1;break;}
      else if(ch===')'||ch===']'||ch==='}')depth--;
      else if(ch===','&&depth===0){args.push(code.slice(argStart,i));argStart=i+1;}
    }
    if(end<0||args.length!==13||!/^;[}]*$/.test(code.slice(end)))return null;
    const shared=[...args];shared[7]="gfcSlotText";
    return {code:code.slice(0,start)+"gfcSlotText="+args[7]+code.slice(end),call:name+shared.join(",")+");"};
  });
  if(parsed.length<2||parsed.some(p=>!p)||parsed.some(p=>p!.call!==parsed[0]!.call))return null;
  return {branches:parsed.map(p=>p!.code),call:parsed[0]!.call};
}
