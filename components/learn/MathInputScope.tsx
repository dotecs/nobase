'use client';
import { createContext,useContext,useMemo,useRef,useState,type ReactNode } from 'react';
import type { AnswerType } from '@/lib/learn/types';
import { Keypad } from './Keypad';
type Target={step?:boolean;element:HTMLInputElement;insert:(key:string)=>void};
type InputScope={activate:(target:Target)=>void;registerDefault:(target:Target)=>void;focusDefault:()=>void};
const Context=createContext<InputScope|null>(null);
export const useMathInputScope=()=>useContext(Context);
export function MathInputScope({children,type,variable,relationRequired,disabled=false,alwaysExpanded=false}:{children:ReactNode;type:AnswerType;variable?:string|null;relationRequired?:boolean;disabled?:boolean;alwaysExpanded?:boolean}) {
 const [activeStep,setActiveStep]=useState(false);
 const active=useRef<Target|null>(null),fallback=useRef<Target|null>(null);
 const scope=useMemo<InputScope>(()=>({activate:target=>{active.current=target;setActiveStep(!!target.step);},registerDefault:target=>{fallback.current=target;},focusDefault:()=>{active.current=fallback.current;setActiveStep(false);fallback.current?.element.focus();}}),[]);
 if(!['number','fraction','expression'].includes(type))return <>{children}</>;
 return <Context.Provider value={scope}>{children}<Keypad type={activeStep?'expression':type} variable={variable??'x'} relationRequired={activeStep||relationRequired} disabled={disabled} alwaysExpanded={alwaysExpanded} onKey={key=>{const target=active.current?.element.isConnected?active.current:fallback.current;if(target&&!target.element.disabled)target.insert(key);}}/></Context.Provider>;
}
