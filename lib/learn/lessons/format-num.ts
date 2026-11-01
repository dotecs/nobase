export function formatNum(value:number){return Number(value.toFixed(2)).toString().replace('-','−');}
export function formulaValues(formula:string,params:Record<string,number>){return formula.replace(/\{\{([a-zA-Z]+)\}\}/g,(_,name)=>formatNum(params[name]));}
