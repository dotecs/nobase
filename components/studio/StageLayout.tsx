'use client';
import {createContext,useContext} from 'react';
export const StageLayoutContext=createContext(false);
export const usePortrait=()=>useContext(StageLayoutContext);
