import {renderToStaticMarkup} from 'react-dom/server';
import {LessonNavigation} from '@/components/studio/LessonNavigation';
import { Children, isValidElement, type ReactNode, type ReactElement, type ButtonHTMLAttributes } from 'react';
import { expect, it, vi } from 'vitest';
import { CourseSidebar } from '@/components/studio/CourseSidebar';
import { SceneNav } from '@/components/studio/SceneNav';
import { studioDemo } from './studio-demo';

type Button = ReactElement<ButtonHTMLAttributes<HTMLButtonElement>>;
function buttons(node: ReactNode): Button[] {
  return Children.toArray(node).flatMap(child => {
    if (!isValidElement<{children?: ReactNode}>(child)) return [];
    return child.type === 'button' ? [child as Button] : buttons(child.props.children);
  });
}

it('keeps scene navigation out of the curriculum sidebar', () => {
 const html=renderToStaticMarkup(<CourseSidebar lesson={studioDemo} time={10} total={100}/>);
 expect(html).not.toContain('강의 장면 구성');expect(html).not.toContain('번 장면:');expect(html).toContain('10%');
});

it('icon navigation retains accessible labels and invokes the final completion action', () => {
  const move = vi.fn(), complete = vi.fn();
  const tree = SceneNav({scenes:studioDemo.scenes,index:studioDemo.scenes.length-1,ended:true,onMove:move,onComplete:complete});
  const actions = buttons(tree);
  const previous = actions.find(button => button.props['aria-label'] === '이전 장면')!;
  previous.props.onClick?.({} as React.MouseEvent<HTMLButtonElement>);
  expect(move).toHaveBeenCalledWith(studioDemo.scenes.length-2);
  const finish = actions.find(button => button.props['aria-label'] === '학습 홈으로')!;
  expect(finish.props.title).toBe('학습 홈으로');
  finish.props.onClick?.({} as React.MouseEvent<HTMLButtonElement>);
  expect(complete).toHaveBeenCalledTimes(1);
  expect(actions).toHaveLength(2);
  expect(actions.some(button => button.props['aria-label'] === '다음 장면')).toBe(false);
});

it('renders exactly one previous/next pair on ordinary scenes and disables previous at the start', () => {
  const move = vi.fn();
  const actions = buttons(SceneNav({scenes:studioDemo.scenes,index:0,ended:false,onMove:move,onComplete:vi.fn()}));
  expect(actions).toHaveLength(2);
  expect(actions[0].props['aria-label']).toBe('이전 장면');
  expect(actions[0].props.disabled).toBe(true);
  expect(actions[1].props['aria-label']).toBe('다음 장면');
  actions[1].props.onClick?.({} as React.MouseEvent<HTMLButtonElement>);
  expect(move).toHaveBeenCalledWith(1);
});

it('exposes next-lesson autoplay separately from mandatory within-lesson playback', () => {
 const toggle=vi.fn(),props={admin:false,sceneBar:false,onScope:vi.fn(),player:null,scenes:studioDemo.scenes,index:0,ended:false,waiting:false,onContinue:vi.fn(),onMove:vi.fn(),onComplete:vi.fn(),autoAdvance:false,onToggleAutoAdvance:toggle,completionLabel:'다음 강의'};
 const off=buttons(LessonNavigation(props)).find(button=>button.props['aria-label']==='다음 강 자동 재생')!;
 expect(off.props['aria-pressed']).toBe(false);off.props.onClick?.({} as React.MouseEvent<HTMLButtonElement>);expect(toggle).toHaveBeenCalledTimes(1);
 const on=buttons(LessonNavigation({...props,autoAdvance:true})).find(button=>button.props['aria-label']==='다음 강 자동 재생')!;expect(on.props['aria-pressed']).toBe(true);
});
