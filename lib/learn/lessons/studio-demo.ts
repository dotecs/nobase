import { lessonSchema } from './schema';
/** Local code fixture only: no lesson row, seed, generated audio or event writes. */
export const studioDemo=lessonSchema.parse({id:'studio-demo',kind:'concept',title:'계수 a의 역할',goal:'계수에 따른 그래프 변화 이해하기',pack_id:'root-math',ability_ids:['11-1'],scenes:[
 {id:'opens-up',tag:'explore',title:'이차함수의 그래프',headline:{title:'이차함수의 그래프',subtitle:'계수 a를 움직이며 그래프의 변화를 살펴보세요.\n수식이 어떻게 모양이 되는지, 직접 확인해요.'},stage:{type:'slider',items:[{id:'eq',tex:'y = ax^2 \\quad (a = {{a}})',position:{x:-3,y:6.4},size:'lg',align:'start'}],expr:'a*x^2',param:{name:'a',min:-3,max:3,step:.5,init:1},x:[-3,3],y:[-.5,6.5],verdict:'none'},narration:[
  {id:'studio-up-1',role:'say',text:'a가 양수이면, 그래프는 위로 열린 포물선이 됩니다.',cue:{actions:[{type:'underline',target:'item:eq'},{type:'point',x:0,on:'fn:0',label:'(0, 0)',label_pos:'se'},{type:'point',x:1,on:'fn:0',label:'(1, 1)',guides:true},{type:'point',x:2,on:'fn:0',label:'(2, 4)',guides:true},{type:'handwrite',position:{x:5.6,y:4.5},text:'a가 커질수록\n폭이 좁아져요.',arrow_to:{x:2.35,y:5.5}}]}},
  {id:'studio-up-2',role:'say',text:'a가 2로 커지면 그래프의 폭이 **더 좁아져요**. 같은 x에서 높이가 달라지죠.',cue:{actions:[{type:'param',name:'a',to:2,duration_ms:2200,easing:'ease-in-out'}]}},
  {id:'studio-up-3',role:'say',text:'a를 다시 1로 바꾸면 처음 모양으로 돌아와요. **슬라이더를 직접 움직여** 확인해 보세요.',cue:{actions:[{type:'param',name:'a',to:1,duration_ms:2200,easing:'ease-in-out'}]}},
 ]},
 {id:'opens-down',tag:'explore',title:'아래로 열리는 그래프',headline:{eyebrow:'이차함수',title:'부호가 바뀌면,\n방향도 바뀌어요',accent:'방향',subtitle:'a가 음수가 되면 어떤 모양이 될까요?\n위와 아래가 바뀌는 순간을 살펴보세요.'},stage:{type:'slider',expr:'a*x^2',param:{name:'a',min:-3,max:3,step:.1,init:1},x:[-4,4],y:[-6,6],verdict:'none'},narration:[
  {id:'studio-down-1',role:'say',text:'a를 1에서 -1로 바꿔 볼게요. 그래프가 천천히 **아래로 열리는 모양**으로 변해요.',cue:{actions:[{type:'param',name:'a',to:-1,duration_ms:2600,easing:'ease-in-out'}]}},
  {id:'studio-down-2',role:'say',text:'**a가 음수이면** 그래프는 아래로 열려요. 계수의 부호와 그래프의 방향을 함께 기억해요.',cue:{actions:[{type:'point',x:1,on:'fn:0'},{type:'point',x:2,on:'fn:0'}]}},
 ]},
 {id:'number-tree',tag:'define',title:'실수의 분류',stage:{type:'tree',direction:'right',initial:{hidden:'all'},root:{id:'real',label:'실수',children:[
  {id:'rational',label:'유리수',children:[
   {id:'int',label:'정수',children:[{id:'pos',label:'양의 정수 (= 자연수)'},{id:'zero',label:'0'},{id:'neg',label:'음의 정수'}]},
   {id:'nonint',label:'정수가 아닌 유리수'}]},
  {id:'irrational',label:'무리수'}]}},narration:[
  {id:'tree-1',role:'say',text:'실수는 유리수와 무리수로 나눌 수 있어요.',cue:{actions:[{type:'reveal',target:'tree',id:'rational'},{type:'reveal',target:'tree',id:'irrational',at_ms:600}]}},
  {id:'tree-2',role:'say',text:'유리수는 정수와 정수가 아닌 유리수로 나뉘어요.',cue:{actions:[{type:'reveal',target:'tree',id:'int'},{type:'reveal',target:'tree',id:'nonint',at_ms:600}]}},
  {id:'tree-3',role:'say',text:'정수에는 양의 정수, 영, 음의 정수가 있어요. 양의 정수를 자연수라고도 해요.',cue:{actions:[{type:'reveal',target:'tree',id:'pos'},{type:'reveal',target:'tree',id:'zero',at_ms:600},{type:'reveal',target:'tree',id:'neg',at_ms:1200}]}},
 ]},
 {id:'board-notes',tag:'derive',title:'칠판 위에서 식 연결하기',headline:{eyebrow:'칠판',title:'같은 식을 다른 모양으로'},stage:{type:'board',aspect:'16:9',initial:{hidden_items:['result']},items:[
  {id:'source',tex:'x^2 + 2x + 1',position:{x:.2,y:.25},size:'lg',align:'start'},
  {id:'result',tex:'(x+1)^2',position:{x:.65,y:.25},size:'lg',color:'hand'},
  {id:'note',text:'완전제곱식으로 묶어 보세요.',position:{x:.5,y:.65},size:'md'}
 ]},narration:[
  {id:'board-1',role:'say',text:'이 식을 완전제곱식으로 묶어 볼게요.',cue:{actions:[{type:'underline',target:'item:source'},{type:'circle',target:'item:source',at_ms:500}]}},
  {id:'board-2',role:'say',text:'같은 식이 두 번 곱해진 모양이에요.',cue:{actions:[{type:'reveal',target:'item',id:'result'},{type:'arrow',from:'item:source',to:'item:result',at_ms:300},{type:'flash',target:'item:result',at_ms:600}]}},
 ]},
 {id:'expression-callout',tag:'define',title:'곱셈 기호의 생략',headline:{eyebrow:'2강 · 문자와 식',title:'곱셈 기호의 생략',accent_bar:true},stage:{type:'board',aspect:'16:9',items:[
  {id:'t1',tex:'4x^3',group:'expr',position:{x:.5,y:.3},gap:'0.6em',size:'xl'},
  {id:'t2',tex:'-2x^2y',group:'expr',size:'xl'},
  {id:'t3',tex:'+3y',group:'expr',size:'xl'},
  {id:'t4',tex:'-7',group:'expr',size:'xl'}
 ]},narration:[
  {id:'expr-1',role:'say',text:'첫 번째 항에서 곱셈 기호가 생략된 모습을 살펴볼게요.',cue:{actions:[
   {type:'tint',target:'item:t1',color:'mint'},
   {type:'callout',id:'c1',target:'item:t1',tex:'4\\times x^3 \\;\\to\\; 4x^3',position:{x:.42,y:.58},color:'mint',size:'lg',at_ms:500}
  ]}},
  {id:'expr-2',role:'say',text:'수와 문자 사이의 곱셈 기호를 생략해서 간결하게 표현해요.'}
 ]},
 {id:'inequality-regions',tag:'explore',title:'두 조건을 동시에 만족하는 범위',headline:{eyebrow:'부등식 · 수직선',title:'두 조건을 동시에 만족하는 범위',accent_bar:true},stage:{type:'graph',number_line:true,x:[-3,3],y:[-1,1],fns:[],aria:'두 부등식 조건과 공통 해 영역'},narration:[
  {id:'region-a',role:'say',text:'첫 번째 조건은 마이너스 일 이상, 이 미만입니다.',cue:{actions:[
   {type:'region',id:'a',level:1,ranges:[{from:-1,to:2,open:'to'}],label:'-1 \\le x < 2',color:'accent'}
  ]}},
  {id:'region-b',role:'say',text:'두 번째 조건은 영 이하이거나 일 이상입니다. 겹치는 부분이 두 조건을 모두 만족해요.',cue:{actions:[
   {type:'region',id:'b',level:2,ranges:[{from:'-inf',to:0},{from:1,to:'inf'}],label:'x \\le 0,\\; x \\ge 1',color:'mint',intersect_with:'a'}
  ]}}
 ]},
]});

// Demonstration-only course; never used by the real lesson route.
export const studioDemoCourse={curriculum:{id:'studio-demo',title:'이차함수',chapters:[{no:1,title:'방정식의 기초',items:[]},{no:2,title:'이차방정식',items:[]},{no:3,title:'이차함수',items:[{no:1,title:'그래프의 기본 모양',lesson_id:'demo-shape'},{no:2,title:'계수 a의 역할',lesson_id:'studio-demo'},{no:3,title:'꼭짓점과 축',lesson_id:'demo-vertex'},{no:4,title:'그래프의 평행이동',lesson_id:'demo-shift'}]}]},available:['studio-demo']};
