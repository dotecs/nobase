import { lessonSchema } from './schema';
/** Local code fixture only: no lesson row, seed, generated audio or event writes. */
export const studioDemo=lessonSchema.parse({id:'studio-demo',kind:'concept',title:'계수 a의 역할',goal:'계수에 따른 그래프 변화 이해하기',pack_id:'root-math',ability_ids:['11-1'],scenes:[
 {id:'opens-up',tag:'explore',title:'이차함수의 그래프',headline:{formula:'y = ax^2 \\quad (a = {{a}})',title:'이차함수의 그래프',subtitle:'계수 a를 움직이며 그래프의 변화를 살펴보세요.\n수식이 어떻게 모양이 되는지, 직접 확인해요.'},stage:{type:'slider',expr:'a*x^2',param:{name:'a',min:-3,max:3,step:.5,init:1},x:[-3,3],y:[-.5,6.5],verdict:'none'},narration:[
  {id:'studio-up-1',role:'say',text:'a가 양수이면, 그래프는 위로 열린 포물선이 됩니다.',cue:{actions:[{type:'point',x:0,on:'fn:0',label:'(0, 0)',label_pos:'se'},{type:'point',x:1,on:'fn:0',label:'(1, 1)',guides:true},{type:'point',x:2,on:'fn:0',label:'(2, 4)',guides:true},{type:'handwrite',position:{x:3.4,y:5.6},text:'a가 커질수록\n폭이 좁아져요.',arrow_to:{x:2.35,y:5.5}}]}},
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
]});

// Demonstration-only course; never used by the real lesson route.
export const studioDemoCourse={curriculum:{id:'studio-demo',title:'이차함수',chapters:[{no:1,title:'방정식의 기초',items:[]},{no:2,title:'이차방정식',items:[]},{no:3,title:'이차함수',items:[{no:1,title:'그래프의 기본 모양',lesson_id:'demo-shape'},{no:2,title:'계수 a의 역할',lesson_id:'studio-demo'},{no:3,title:'꼭짓점과 축',lesson_id:'demo-vertex'},{no:4,title:'그래프의 평행이동',lesson_id:'demo-shift'}]}]},available:['studio-demo']};
