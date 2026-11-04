import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {itemParts,itemTargetIds,itemErrors} from './items';
import {StudioMath} from '@/components/studio/StudioMath';

describe('item parts (\\p{name}{…})',()=>{
  const item={id:'t1',tex:'\\p{coef}{4}x^{\\p{exp}{3}}',position:{x:.3,y:.3}} as const;
  it('lists part names and item targets',()=>{
    expect(itemParts(item)).toEqual(['coef','exp']);
    expect([...itemTargetIds({type:'board',items:[item]})]).toEqual(['t1','t1/coef','t1/exp']);
  });
  it('renders parts as data-stage-target spans',()=>{
    const html=renderToStaticMarkup(<StudioMath tex={item.tex} itemId="t1"/>);
    expect(html).toContain('data-stage-target="item:t1/coef"');
    expect(html).toContain('data-stage-target="item:t1/exp"');
    expect(html).not.toContain('htmlData');
  });
  it('rejects duplicate part names',()=>{
    expect(itemErrors({type:'board',items:[{...item,tex:'\\p{a}{1}+\\p{a}{2}'}]})).toContain('item 부분 이름 중복: t1');
  });
});
