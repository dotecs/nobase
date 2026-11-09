import type {Scene} from './schema';
/** LS4-15 code fixture only. Authored lessons and audio are unchanged. */
export const moveFixture:Scene={id:'move-factors',title:'고른 수가 두 인수가 되는 과정',tag:'derive',stage:{type:'board',initial:{hidden_items:['fac']},items:[
 {id:'eq',tex:'4x^2+11x+6',position:{x:.5,y:.1},size:'lg'},
 {id:'fa',tex:String.raw`\begin{matrix}\p{a1}{1}&\p{a2}{2}\\\p{c1}{4}&\p{c2}{2}\end{matrix}`,position:{x:.28,y:.36},size:'xl'},
 {id:'fb',tex:String.raw`\begin{matrix}\p{b1}{1}&\p{b2}{2}\\\p{d1}{6}&\p{d2}{3}\end{matrix}`,position:{x:.52,y:.36},size:'xl'},
 {id:'fbr',tex:String.raw`\begin{matrix}\p{b3}{3}&\p{b4}{6}\\\p{d3}{2}&\p{d4}{1}\end{matrix}`,position:{x:.76,y:.36},size:'xl'},
 {id:'fac',tex:String.raw`(\p{a}{1}x+\p{b}{2})(\p{c}{4}x+\p{d}{3})`,position:{x:.5,y:.66},size:'xl'},
]},narration:[{id:'move-1',role:'say',text:'고른 수를 그대로 가져오면, 윗줄은 일엑스 더하기 이, 아랫줄은 사엑스 더하기 삼.',cue:{actions:[
 {type:'reveal',target:'item',id:'fac'},
 {type:'move',pairs:[['item:fa/a1','item:fac/a'],['item:fb/b2','item:fac/b']],color:'mint',at_ms:1000},
 {type:'move',pairs:[['item:fa/c1','item:fac/c'],['item:fb/d2','item:fac/d']],color:'mint',at_ms:2200},
]}},{id:'move-2',role:'say',text:'고른 수가 각각 두 인수의 계수와 상수가 됩니다.'}]};
