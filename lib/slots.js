export const SLOTS=['08:00','09:30','11:00','14:00','15:30','17:00']
export const SLOT_MIN=90
export const FIRST_DAY='2026-12-01'
export const toMin=t=>{
 const value=String(t||'').trim()
 const match=/^(\d{1,2}):(\d{2})/.exec(value)
 if(!match)return 0
 const hours=Math.min(23,+match[1]),minutes=Math.min(59,+match[2])
 return hours*60+minutes
}
export const fromMin=n=>String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0')
export const addMin=(t,d)=>fromMin(toMin(t)+d)
export const overlap=(a1,a2,b1,b2)=>{
 if(!hhmm(a1)||!hhmm(a2)||!hhmm(b1)||!hhmm(b2))return false
 return toMin(a1)<toMin(b2)&&toMin(b1)<toMin(a2)
}
export const hhmm=t=>{
 if(t==null)return ''
 const value=String(t).trim()
 const match=/^(\d{1,2}):(\d{2})/.exec(value)
 return match?`${match[1].padStart(2,'0')}:${match[2]}`:''
}
