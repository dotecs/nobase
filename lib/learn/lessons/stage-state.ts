import type {TintColor,CalloutAction} from './annotation-schema';
import type {ChalkMark} from './chalk';
export type StagePoint={id:string;on?:string;x:number;y:number;x_tex?:string;y_tex?:string;c?:'c1'|'c2'|'c3';label?:string;guides?:boolean;label_offset?:{x:number;y:number};label_pos?:'ne'|'nw'|'se'|'sw'|'n'|'s'};
export type StageLabel={text:string;tex?:string;at:{x:number;y:number};anchor?:'start'|'middle'|'end'};
export type StageState={
 tints?:Record<string,TintColor>;
 callouts?:{id:string;action:CalloutAction;elapsed:number;opacity:number}[];
 warnings?:string[];
 chalk?:ChalkMark[];
 params:Record<string,number>;
 drawProgress:Record<string,number>;
 visibleFns:number[];
 points:StagePoint[];
 highlight:string[]|null;
 dimOthers:boolean;
 camera:{x:[number,number];y:[number,number]};
 labels:StageLabel[];
 band:[number,number]|null;
 revealed:{step:number[];node:number[];row:number[];tree?:string[];item?:string[]};
 itemOpacity?:Record<string,number>;
 treeReveal?:Record<string,{line:number;card:number}>;
 pulses:Record<string,number>;
};

export { stageStateAt } from './stage-state-at';
