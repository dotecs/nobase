import { describe, expect, it } from 'vitest';
import { checkSteps } from './steps';

describe('checkSteps', () => {
  it('방정식 3줄 정상', () => expect(checkSteps('2x+10=4','number',['2x=-6','x=-3','-3']).lines.map(x=>x.status)).toEqual(['ok','ok','ok']));
  it('2번째 줄 부호 오류', () => expect(checkSteps('2x+10=4','number',['2x=-6','x=3']).first_error_index).toBe(1));
  it('음수 나눗셈 부등호 반전 검사', () => {
    expect(checkSteps('-3x>12','number',['x<-4']).lines[0].status).toBe('ok');
    expect(checkSteps('-3x>12','number',['x>-4']).lines[0].status).toBe('error');
  });
  it('분수 덧셈 통분 단계', () => expect(checkSteps('1/2+1/3','fraction',['3/6+2/6','5/6']).checked).toBe(2));
  it('식 정리 중간 줄', () => expect(checkSteps('2(x+3)+x','expression',['2x+6+x','3x+6']).lines.every(x=>x.status==='ok')).toBe(true));
  it('unparsed 건너뜀', () => expect(checkSteps('2x+10=4','number',['2x=-6','???','x=-3']).lines.map(x=>x.status)).toEqual(['ok','unparsed','ok']));
  it('대입형 문항의 대입 후 식 비교', () => expect(checkSteps('$x=-2$일 때 $3x+5$','number',['3(-2)+5','-6+5','-1']).lines.map(x=>x.status)).toEqual(['ok','ok','ok']));
  it('공통인수로 묶은 식 동치', () => expect(checkSteps('6x+9','expression',['3(2x+3)']).lines[0].status).toBe('ok'));
  it('빈 배열은 checked 0', () => expect(checkSteps('1+1','number',[])).toEqual({checked:0,first_error_index:null,lines:[]}));
  it('13줄은 12줄까지만 검사', () => expect(checkSteps('1+1','number',Array(13).fill('2')).checked).toBe(12));
});
