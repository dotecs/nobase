'use client';
import { studioDemo,studioDemoCourse } from '@/lib/learn/lessons/studio-demo';import { StudioViewer } from './StudioViewer';
export default function StudioDemo({frame=false,chrome=true}:{frame?:boolean;chrome?:boolean}){return <StudioViewer lesson={studioDemo} course={studioDemoCourse} frame={frame} chrome={chrome}/>;}
