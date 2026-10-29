# 학습 규칙

규칙 값은 learn_rule_configs에서 읽어 인자로 넘긴다.

## 추천 다양성과 세션 길이 (운영 보수 N)

- `group_diversity`: 처음 보는 문항을 우선하고, 이어서 해당 소주제의 증거 `distinct_groups`와 현재 세션 선택 목록에 모두 없는 그룹을 먼저 고른다. 그룹은 `variant_group ?? id`다. 이후 용도 우선순위·id를 비교하며 같은 그룹의 연속 출제 금지는 유지한다.
- `per_ability_cap:<ability>=<n>`: 연습 문항 상한은 `max(1, independent_correct_needed - independent_correct) + per_ability_buffer`다. 증거가 없으면 현재 정답 수는 0. 복습 문항은 이 상한에서 제외하며 별도 복습 제한을 따른다. 상한 때문에 빈자리가 생겨도 최대 동시 소주제 수를 늘리지 않는다.
- `session` v3(059)는 v2 설정을 복사해 `per_ability_buffer:1`, `stop_when_verified:true`를 추가한다. 스키마 필드는 optional이며 구버전 설정에 없을 때에도 기본값 1·true를 쓴다. 상한 계산은 evidence 설정을 읽으므로 추천 trace에는 recommendation·session·evidence 버전을 함께 기록한다.
- 학습 중 verified로 전환되면 아직 제출하지 않은 같은 소주제 문항을 `{type:'skipped', item, queue_index, reason:'verified'}` 엔트리로 plan에 추가한다. 과거 항목과 현재 재시도 문항은 유지한다. 저장 RPC와 제출 멱등 키는 그대로다.
- `readLearningPlan`은 건너뜀을 제외한 전체 `total`, 현재 화면 위치 `position`, 남은 문항 수 `meta.remaining`을 계산한다. 진행 점과 홈 카드 문항 수도 실제 계획을 기준으로 한다. 세션 summary의 `skipped`는 코치 헤더에 표시한다.
- 세션은 설정된 최대 길이(현재 8문항)보다 짧아질 수 있다. 건너뛴 문항에 시도·채점·학습자 상태 변화는 만들지 않는다.
