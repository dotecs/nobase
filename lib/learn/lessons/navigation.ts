import type { Scene } from './schema';
export function sceneIndexFromHash(scenes:Pick<Scene,'id'>[],hash:string){try{const id=decodeURIComponent(hash.replace(/^#/,''));return scenes.findIndex(scene=>scene.id===id);}catch{return -1;}}
export function sceneHash(id:string){return '#'+encodeURIComponent(id);}
