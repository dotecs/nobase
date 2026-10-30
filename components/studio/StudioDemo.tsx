'use client';
import { studioDemo } from '@/lib/learn/lessons/studio-demo';import { StudioViewer } from './StudioViewer';
export default function StudioDemo({frame=false,chrome=true}:{frame?:boolean;chrome?:boolean}){return <StudioViewer lesson={studioDemo} frame={frame} chrome={chrome}/>;}
