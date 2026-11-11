/** Vimeo 공유·페이지 URL을 플레이어 embed URL로 바꾼다(그 외 URL은 그대로). */
export function vimeoEmbedUrl(url: string): string {
  if (!url) return '';
  const params = 'title=0&byline=0&portrait=0&badge=0&autopause=0&dnt=1';
  if (url.includes('player.vimeo.com')) return url + (url.includes('?') ? '&' : '?') + params;
  const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return match ? `https://player.vimeo.com/video/${match[1]}?${params}` : url;
}
