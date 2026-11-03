// Short requests leave room for auth, DB reads, upload and the action response.
export const AUDIO_BATCH_LIMIT = 5;
export const AUDIO_BATCH_BUDGET_MS = 30_000;
export const AUDIO_SAVE_RESERVE_MS = 5_000;
// Wait past page.tsx's maxDuration=60 before retrying a lost response.
export const AUDIO_RETRY_SETTLE_MS = 65_000;
