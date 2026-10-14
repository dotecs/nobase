# 레거시: iframe 방식 면접 워크북 (2026-10-12 교체됨)

`/workbook/interview` 는 이제 React 네이티브 페이지(`app/(main)/workbook/interview/InterviewWorkbook.tsx`)로
동작하며, 콘텐츠는 `lib/interview-workbook-content.ts`, 답변은 `interview_workbook_answers` 테이블에 저장됩니다.

이 폴더는 교체 전 파일 보관용입니다 (빌드에 포함되지 않음).
- `interview-2025.html` — Vercel passmj-workbook 에서 받은 원본 단일 HTML
- `WorkbookFrame.tsx.txt` — iframe 높이 자동 맞춤 클라이언트 컴포넌트
- `route.ts.txt` — 권한 확인 후 HTML을 내려주던 `/api/workbook/interview` 라우트
