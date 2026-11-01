'use client';
import { studioDemo,studioDemoCourse } from '@/lib/learn/lessons/studio-demo';import { StudioViewer } from './StudioViewer';
export default function StudioDemo({frame=false,chrome=true,admin=false}:{frame?:boolean;chrome?:boolean;admin?:boolean}){return <StudioViewer admin={admin} referenceLessonId="demo" lesson={studioDemo} course={studioDemoCourse} frame={frame} chrome={chrome}/>;}
