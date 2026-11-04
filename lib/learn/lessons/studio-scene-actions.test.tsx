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

it('scene buttons select the exact index and allow the current scene to close the menu', () => {
  const selected = vi.fn();
  const tree = CourseSidebar({lesson:studioDemo, index:0, onSelectScene:selected});
  const choices = buttons(tree);
  expect(choices).toHaveLength(studioDemo.scenes.length);
  for (const index of [1, 0, 4]) {
    expect(choices[index].props.disabled).toBe(false);
    expect(choices[index].props['aria-label']).toContain((index + 1) + '번 장면');
    choices[index].props.onClick?.({} as React.MouseEvent<HTMLButtonElement>);
    expect(selected).toHaveBeenLastCalledWith(index);
  }
});

it('icon navigation retains accessible labels and invokes the final completion action', () => {
  const move = vi.fn(), complete = vi.fn();
  const tree = SceneNav({scenes:studioDemo.scenes,index:4,ended:true,onMove:move,onComplete:complete});
  const actions = buttons(tree);
  const previous = actions.find(button => button.props['aria-label'] === '이전 장면')!;
  previous.props.onClick?.({} as React.MouseEvent<HTMLButtonElement>);
  expect(move).toHaveBeenCalledWith(3);
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

it('exposes automatic scene advance as an optional off-by-default toggle', () => {
  const toggle = vi.fn();
  const props = {scenes:studioDemo.scenes,index:0,ended:false,onMove:vi.fn(),onComplete:vi.fn(),onToggleAutoAdvance:toggle};
  const off = buttons(SceneNav(props)).find(button => button.props['aria-label'] === '다음 장면 자동 이동')!;
  expect(off.props['aria-pressed']).toBe(false);
  off.props.onClick?.({} as React.MouseEvent<HTMLButtonElement>);
  expect(toggle).toHaveBeenCalledTimes(1);
  const on = buttons(SceneNav({...props,autoAdvance:true})).find(button => button.props['aria-label'] === '다음 장면 자동 이동')!;
  expect(on.props['aria-pressed']).toBe(true);
  expect(on.props.title).toContain('다음 장면을 재생');
});
