/** Allow only local paths, including after WHATWG URL normalization. */
export function safeReturnTo(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.includes(':')
    || /[\\\u0000-\u0020\u007f]/.test(raw)) {
    return '/dashboard';
  }
  return raw;
}
