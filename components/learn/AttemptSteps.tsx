import { FormattedMath } from './FormattedMath';
export function AttemptSteps({steps,autoGrade}:{steps?:string[]|null;autoGrade:unknown}) {
  if(!steps?.length)return null;
  const check=autoGrade&&typeof autoGrade==='object'&&'step_check' in autoGrade?autoGrade.step_check:null;
  const lines=check&&typeof check==='object'&&'lines' in check&&Array.isArray(check.lines)?check.lines:[];
  return <section aria-label="입력한 풀이 단계"><h5>풀이 과정</h5><ol>{steps.map((input,index)=>{
    const status=lines[index]?.status,label=status==='ok'?'동치 확인':status==='error'?'동치 오류':'자동 확인 못함';
    return <li key={index}><span aria-label={label}>{status==='ok'?'✓':status==='error'?'✗':'–'}</span> <FormattedMath value={input}/></li>;
  })}</ol></section>;
}
