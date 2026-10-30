import type {ChalkMark} from './chalk';
export type StagePoint={id:string;on?:string;x:number;y:number;c?:'c1'|'c2'|'c3';label?:string};
export type StageLabel={text:string;tex?:string;at:{x:number;y:number};anchor?:'start'|'middle'|'end'};
export type StageState={
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
 revealed:{step:number[];node:number[];row:number[]};
 pulses:Record<string,number>;
};

export { stageStateAt } from './stage-state-at';
