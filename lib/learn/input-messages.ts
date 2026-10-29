export function inputIssueMessage(reason:unknown) {
 if(reason==='relation_required')return '부등호를 포함해 x ≤ … 형태로 적어 주세요';
 if(reason==='invalid_math')return '아직 지원하지 않는 기호가 있어요. 입력 도움말을 확인해 주세요';
 return '답 입력 형식을 확인해 주세요.';
}
