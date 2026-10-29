import { describe,it,expect,vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { isValidElement,type ReactElement } from 'react';
vi.mock('@/app/(main)/learn/actions',()=>({signedSessionPhotoUrl:vi.fn()}));
import { CoachPhotoViewer,PhotoViewerContent } from '@/components/learn/CoachPhotoViewer';
function findButton(node:unknown,label:string):ReactElement<{onClick:()=>void}>|undefined {
 if(Array.isArray(node)){for(const child of node){const found=findButton(child,label);if(found)return found;}}
 if(isValidElement<{children?:unknown}>(node)){if(node.type==='button'&&node.props.children===label)return node as ReactElement<{onClick:()=>void}>;return findButton(node.props.children,label);}
}
describe('coach photo viewer',()=>{
 it('renders native dialog and 200px clickable thumbnails',()=>{const html=renderToStaticMarkup(<CoachPhotoViewer photos={[{id:'p',session_id:'s',user_id:'u',path:'p',position:0,url:'/photo.jpg'}]}/>);expect(html).toContain('<dialog');expect(html).toContain('aria-label="풀이 사진 보기"');expect(html).toContain('width="200"');expect(html).not.toContain('target="_blank"');});
 it('rotate button updates the image transform and zoom expands its scrollable stage',()=>{let rotation=0;const props={url:'/photo.jpg',index:0,count:2,rotation,zoom:1,error:'',onRotate:()=>{rotation=(rotation+90)%360;},onZoom:()=>{},onMove:()=>{},onClose:()=>{}};findButton(PhotoViewerContent(props),'회전(90°)')!.props.onClick();const html=renderToStaticMarkup(<PhotoViewerContent {...props} rotation={rotation} zoom={2}/>);expect(html).toContain('rotate(90deg)');expect(html).toContain('60vh) * 2');expect(html).toContain('이전');expect(html).toContain('다음');});
});
