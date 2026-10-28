import type { StepCheck } from './mathcheck/steps';
export type StepsPhotoConfig={steps_replace_photo?:boolean;steps_min_lines?:number};
export function stepsPhotoMinimum(config:StepsPhotoConfig):number|null {
  return config.steps_replace_photo&&config.steps_min_lines?config.steps_min_lines:null;
}
export function requiresPhoto(base:boolean,config:StepsPhotoConfig,check:StepCheck|null) {
  const min=stepsPhotoMinimum(config);
  return base&&!(min!==null&&check&&check.lines.filter(line=>line.status==='ok').length>=min);
}
/** UI can relax the prompt; the server independently checks actual equivalent lines. */
export function photoPromptRequired(base:boolean,min:number|null|undefined,steps:string[]) {
  return base&&!(min!=null&&steps.filter(line=>line.trim()).length>=min);
}
