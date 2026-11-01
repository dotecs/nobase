export function formatNum(value:number){return Number(value.toFixed(2)).toString().replace('-','−');}
/** `{{p}}`를 현재 값으로 치환한다. `+ {{p}}`·`- {{p}}` 앞의 부호는 값의 부호와 합쳐 `x + −3`이 아니라 `x − 3`으로 적는다. */
export function formulaValues(formula:string,params:Record<string,number>){
 return formula
  .replace(/([+\-−])(\s*)\{\{([a-zA-Z]+)\}\}/g,(_,sign:string,space:string,name:string)=>{const v=params[name];if(!Number.isFinite(v))return sign+space+'{{'+name+'}}';const negative=v<0,flip=sign!=='+';return (negative!==flip?'-':'+')+space+formatNum(Math.abs(v));})
  .replace(/\{\{([a-zA-Z]+)\}\}/g,(_,name:string)=>formatNum(params[name]));
}
