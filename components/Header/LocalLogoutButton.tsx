'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOutLocal } from '@/lib/logout';
export function LocalLogoutButton({label='로그아웃',destination='/login',className}:{label?:string;destination?:string;className?:string}) {
  const router=useRouter(),[pending,setPending]=useState(false),[error,setError]=useState('');
  return <><button type="button" className={className} disabled={pending} onClick={async()=>{
    setPending(true);setError('');
    try{await signOutLocal();router.replace(destination);router.refresh();}
    catch{setError('로그아웃하지 못했습니다. 다시 시도해 주세요.');}
    finally{setPending(false);}
  }}>{pending?'로그아웃 중…':label}</button>{error&&<p role="alert">{error}</p>}</>;
}
