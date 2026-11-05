import {instructionColor,targetOpacity} from '@/lib/learn/lessons/instruction-style';
import { StudioMath } from '../StudioMath';
import { LessonText } from '@/components/learn/lesson/LessonText';
import { layoutTree, type TreeStage as TreeStageData } from '@/lib/learn/lessons/tree';
import type { StageState } from '@/lib/learn/lessons/stage-state';
import styles from './tree.module.css';

export function TreeStage({ stage, state }: { stage: TreeStageData; state: StageState }) {
  const layout = layoutTree(stage.root, stage.direction);
  const visible = new Set(state.revealed.tree ?? layout.nodes.map(({ node }) => node.id));
  const opacity = (id: string) => targetOpacity(state,'tree:'+id);
  return <div className={styles.tree} role="group" aria-label="수형도" style={{ width: layout.width, height: layout.height }}>
    <svg className={styles.connections} width={layout.width} height={layout.height} aria-hidden="true">
      {layout.edges.filter(edge => visible.has(edge.id) && visible.has(edge.parent)).map(edge => <path
        key={edge.id} data-tree-edge={edge.id} d={edge.path} pathLength={1}
        strokeDasharray={1} strokeDashoffset={1 - (state.treeReveal?.[edge.id]?.line ?? 1)}
        style={{ opacity: opacity(edge.id) }}
      />)}
    </svg>
    {layout.nodes.filter(({ node }) => visible.has(node.id)).map(({ node, x, y, width, height }) => <div
      key={node.id} className={styles.node} data-stage-target={'tree:' + node.id} data-studio-tint={state.tints?.['tree:'+node.id]}
      style={{ color:instructionColor(state,'tree:'+node.id),left: x, top: y, width, height, opacity: opacity(node.id) * (state.treeReveal?.[node.id]?.card ?? 1) }}
    >
      {node.tex && <StudioMath state={state} tex={node.tex} target={'tree:'+node.id} display={false} />}
      <LessonText authored text={node.label} />
    </div>)}
  </div>;
}
