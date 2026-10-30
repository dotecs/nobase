import { lessonSchema } from './schema';
/** Local code fixture only: no lesson row, seed, generated audio or event writes. */
export const studioDemo=lessonSchema.parse({id:'studio-demo',kind:'concept',title:'이차함수, 눈으로 이해하다',pack_id:'root-math',ability_ids:['11-1'],scenes:[
 {id:'opens-up',tag:'explore',title:'이차함수의 모양',headline:{eyebrow:'이차함수',title:'이차함수,\n눈으로 이해하다',accent:'눈으로',subtitle:'계수 a를 움직이며 그래프의 변화를 살펴보세요.\n수식이 어떻게 모양이 되는지, 직접 확인해요.'},stage:{type:'slider',expr:'a*x^2',param:{name:'a',min:-3,max:3,step:.1,init:1},x:[-7,5],y:[-2,7],verdict:'none'},narration:[
  {id:'studio-up-1',role:'say',text:'**a가 양수이면** 그래프는 위로 열려요. 두 점의 위치도 함께 살펴볼까요?',cue:{actions:[{type:'point',x:1,on:'fn:0'},{type:'point',x:2,on:'fn:0'}]}},
  {id:'studio-up-2',role:'say',text:'a가 2로 커지면 그래프의 폭이 **더 좁아져요**. 같은 x에서 높이가 달라지죠.',cue:{actions:[{type:'param',name:'a',to:2,duration_ms:2200,easing:'ease-in-out'}]}},
  {id:'studio-up-3',role:'say',text:'a를 다시 1로 바꾸면 처음 모양으로 돌아와요. **슬라이더를 직접 움직여** 확인해 보세요.',cue:{actions:[{type:'param',name:'a',to:1,duration_ms:2200,easing:'ease-in-out'}]}},
 ]},
 {id:'opens-down',tag:'explore',title:'아래로 열리는 그래프',headline:{eyebrow:'이차함수',title:'부호가 바뀌면,\n방향도 바뀌어요',accent:'방향',subtitle:'a가 음수가 되면 어떤 모양이 될까요?\n위와 아래가 바뀌는 순간을 살펴보세요.'},stage:{type:'slider',expr:'a*x^2',param:{name:'a',min:-3,max:3,step:.1,init:1},x:[-4,4],y:[-6,6],verdict:'none'},narration:[
  {id:'studio-down-1',role:'say',text:'a를 1에서 -1로 바꿔 볼게요. 그래프가 천천히 **아래로 열리는 모양**으로 변해요.',cue:{actions:[{type:'param',name:'a',to:-1,duration_ms:2600,easing:'ease-in-out'}]}},
  {id:'studio-down-2',role:'say',text:'**a가 음수이면** 그래프는 아래로 열려요. 계수의 부호와 그래프의 방향을 함께 기억해요.',cue:{actions:[{type:'point',x:1,on:'fn:0'},{type:'point',x:2,on:'fn:0'}]}},
 ]},
]});
