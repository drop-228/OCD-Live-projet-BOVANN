'use client'
import {useEffect,useState} from 'react'

export default function Preloader(){
 const [visible,setVisible]=useState(true)
 useEffect(()=>{
  const seen=sessionStorage.getItem('ocd-preloader')
  if(seen){setVisible(false);return}
  sessionStorage.setItem('ocd-preloader','1')
  const timer=setTimeout(()=>setVisible(false),1600)
  return()=>clearTimeout(timer)
 },[])
 if(!visible)return null
 return <div className="preloader" role="status" aria-label="Chargement OCD Live"><div className="preloader-ring"/><img src="/logo.jpg" alt="" width="150" height="150"/></div>
}
