export type AbilityId = string;
export type UnitId = string;

export type AttemptResult =
  | 'correct_independent'
  | 'correct_assisted'
  | 'incorrect'
  | 'no_response'
  | 'input_issue'
  | 'pending_review';

export type AbilityState =
  | 'unknown'
  | 'needs_repair'
  | 'learning'
  | 'verified'
  | 'retained'
  | 'recheck';

export type AnswerType = 'number' | 'fraction' | 'choice' | 'photo' | 'text';
export type ItemUsage = 'diagnostic' | 'practice' | 'assessment' | 'review';
