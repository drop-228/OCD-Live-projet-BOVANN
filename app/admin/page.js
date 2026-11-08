'use client'
import {useEffect,useState,useCallback} from 'react'
import {sb} from '@/lib/supabaseBrowser'
import {SLOTS,hhmm} from '@/lib/slots'
import {normPhone} from '@/lib/phone'
const BADGE={pending:['En attente','#B7791F'],accepted:['Accepté','#2F855A'],refused:['Refusé','#C53030'],cancelled:['Annulé','#718096']}
const fmt=n=>n==null?'Devis':new Intl.NumberFormat('fr-FR').format(n)+' F'
const PAYBADGE={unpaid:['Non payé','#718096'],processing:['En cours','#D69E2E'],paid:['Payé','#2F855A'],failed:['Échoué','#C53030'],refunded:['Remboursé','#805AD5']}
const CAL_DATES=Array.from({length:12},(_,monthOffset)=>{
 const base=new Date()
 base.setDate(1)
 base.setMonth(base.getMonth()+monthOffset)
 const year=base.getFullYear(),month=base.getMonth()
 const count=new Date(year,month+1,0).getDate()
 return Array.from({length:count},(_,i)=>`${year}-${String(month+1).padStart(2,'0')}-${String(i+1).padStart(2,'0')}`)
}).flat().filter(date=>date>= '2026-12-01')
function Count({value}){const [n,setN]=useState(0);useEffect(()=>{const start=performance.now(),duration=350;let frame;const tick=t=>{const p=Math.min((t-start)/duration,1);setN(Math.round(value*p));if(p<1)frame=requestAnimationFrame(tick)};frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame)},[value]);return n}
export default function Admin(){
 const [ses,setSes]=useState(null);const [ok,setOk]=useState(null);const [tab,setTab]=useState('res')
 const [R,setR]=useState([]);const [P,setP]=useState([]);const [B,setB]=useState([]);const [Pay,setPay]=useState([])
 const [Partners,setPartners]=useState([])
 const [q,setQ]=useState('');const [fl,setFl]=useState({status:'',date:'',mode:'',pkg:'',payment:''})
 const [cred,setCred]=useState({email:'',password:''});const [msg,setMsg]=useState('');const [refuse,setRefuse]=useState(null);const [reason,setReason]=useState('')
 const [nb,setNb]=useState({date:'',time:'',reason:''});const [settings,setSettings]=useState({require_deposit:false,deposit_percent:30,eur_xof_rate:655.957,usd_xof_rate:600})
 const [bookingSettings,setBookingSettings]=useState({opening_date:'2026-12-01',horizon_months:12,slots:['08:00','09:30','11:00','14:00','15:30','17:00']})
 const demoMode=process.env.NODE_ENV==='development'&&(
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL.includes('abcdefghij')
 )
 useEffect(()=>{
  if(demoMode&&sessionStorage.getItem('ocd-demo-admin')==='true'){
   setSes({access_token:'demo-local-admin',user:{email:'ocd.admin@ocd.com'}})
   setOk(true)
   return
  }
  sb.auth.getSession().then(({data})=>setSes(data.session))
  const {data:l}=sb.auth.onAuthStateChange((_,s)=>setSes(s))
  return()=>l.subscription.unsubscribe()
 },[demoMode])
 const load=useCallback(async()=>{
  if(demoMode){setOk(true);return}
  const {data:a}=await sb.from('admins').select('user_id');if(!a?.length){setOk(false);return}setOk(true)
  const [r,p,b,pay,partners]=await Promise.all([sb.from('reservations').select('*').order('created_at',{ascending:false}),sb.from('packages').select('*').order('sort'),sb.from('blocked_slots').select('*').order('live_date'),sb.from('payments').select('*').order('created_at',{ascending:false}),sb.from('partners').select('*').order('sort')])
  setR(r.data||[]);setP(p.data||[]);setB(b.data||[]);setPay(pay.data||[]);setPartners(partners.data||[])
  const [{data:cfg},{data:bookingCfg}]=await Promise.all([
   sb.from('site_settings').select('*').eq('key','payment').maybeSingle(),
   sb.from('site_settings').select('*').eq('key','booking').maybeSingle()
  ])
  if(cfg?.value)setSettings(v=>({...v,...cfg.value}))
  if(bookingCfg?.value)setBookingSettings(v=>({...v,...bookingCfg.value}))},[])
 useEffect(()=>{if(ses)load();else setOk(null)},[ses,load])
 async function login(e){
  e.preventDefault()
  const demoPassword='@'+'Azerty1234'
  if(demoMode&&cred.email.toLowerCase()==='ocd.admin@ocd.com'&&cred.password===demoPassword){
   setSes({access_token:'demo-local-admin',user:{email:cred.email}})
   setOk(true)
   sessionStorage.setItem('ocd-demo-admin','true')
   setMsg('')
   return
  }
  const {error}=await sb.auth.signInWithPassword(cred)
  setMsg(error?'Identifiants incorrects':'')
 }
 async function logout(){
  sessionStorage.removeItem('ocd-demo-admin')
  setSes(null)
  setOk(null)
  await sb.auth.signOut()
 }
 async function act(id,action,extra={}){
  const r=await fetch('/api/admin/reservation',{method:'PATCH',headers:{'Content-Type':'application/json',Authorization:'Bearer '+ses.access_token},body:JSON.stringify({id,action,...extra})})
  const j=await r.json();setMsg(r.ok?(['accept','refuse'].includes(action)?(j.notified?`Client prévenu par ${j.notified}`:'Statut mis à jour (client non notifié : vérifie WhatsApp/e-mail)'):''):j.error);load()}
 if(!ses)return <main className="max-w-sm mx-auto p-6"><h1 className="text-2xl font-bold mb-4">Admin OCD Live</h1><form onSubmit={login} className="grid gap-3">
  <input className="input" type="email" required placeholder="E-mail" value={cred.email} onChange={e=>setCred({...cred,email:e.target.value})}/>
  <input className="input" type="password" required placeholder="Mot de passe" value={cred.password} onChange={e=>setCred({...cred,password:e.target.value})}/>
  <button className="btn btn-primary">Me connecter</button>{msg&&<p role="alert" className="text-live">{msg}</p>}</form></main>
 if(ok===false)return <main className="p-6"><p>Accès refusé : ce compte n'est pas administrateur.</p><button className="btn mt-3" onClick={logout}>Me déconnecter</button></main>
 const now=new Date();const mon=new Date(now);mon.setDate(now.getDate()-((now.getDay()+6)%7));const ws=mon.toISOString().slice(0,10);const we=new Date(mon.getTime()+6*864e5).toISOString().slice(0,10)
 const cnt={p:R.filter(r=>r.status==='pending').length,a:R.filter(r=>r.status==='accepted'&&r.live_date>=ws&&r.live_date<=we).length,r:R.filter(r=>r.status==='refused').length}
 const L=R.filter(r=>(!fl.status||r.status===fl.status)&&(!fl.date||r.live_date===fl.date)&&(!fl.mode||r.mode===fl.mode)&&(!fl.pkg||r.package_id===fl.pkg)&&(!fl.payment||r.payment_status===fl.payment)&&(!q||[r.name,r.business,r.phone].join(' ').toLowerCase().includes(q.toLowerCase())))
 const csv=()=>{const cols=['created_at','status','payment_status','name','phone','email','business','mode','city','country','address','live_date','start_time','end_time','package_name','price','payment_method','refusal_reason','internal_note']
  const t=[cols.join(','),...R.map(r=>cols.map(c=>'"'+String(r[c]??'').replace(/"/g,'""')+'"').join(','))].join('\n')
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\ufeff'+t],{type:'text/csv'}));a.download='reservations.csv';a.click()}
 const Tab=({k,l})=><button onClick={()=>setTab(k)} className={'btn '+(tab===k?'!border-brand':'')}>{l}</button>
 return <main className="admin-shell">
  <aside className="admin-sidebar">
   <a href="/" className="admin-brand"><img src="/logo.jpg" alt="OCD Live"/><div><b>OCD LIVE</b><span>CONTROL ROOM</span></div></a>
   <nav aria-label="Administration">
    <button className={tab==='res'?'active':''} onClick={()=>setTab('res')}><span>01</span>Réservations</button>
    <button className={tab==='cal'?'active':''} onClick={()=>setTab('cal')}><span>02</span>Calendrier</button>
    <button className={tab==='pk'?'active':''} onClick={()=>setTab('pk')}><span>03</span>Packages & paiements</button>
    <button className={tab==='bl'?'active':''} onClick={()=>setTab('bl')}><span>04</span>Disponibilités</button>
    <button className={tab==='partners'?'active':''} onClick={()=>setTab('partners')}><span>05</span>Partenaires</button>
   </nav>
   <div className="admin-live"><i className="live-dot"/>Système opérationnel</div>
  </aside>
  <section className="admin-content">
  <div className="flex justify-between items-center mb-3"><h1 className="text-2xl font-bold">Admin OCD Live</h1><button className="btn" onClick={logout}>Me déconnecter</button></div>
  <section className="admin-onair" aria-label="Vue contrôle du studio">
   <div className="admin-onair-copy">
    <div className="admin-onair-brand"><span className="admin-brand-mark"><span>O</span><span>C</span></span><b>Live</b></div>
    <p className="admin-onair-kicker">STUDIO DE LIVES · LOMÉ, TOGO</p>
    <h2>Ton studio.<br/><span>Ta direction en direct.</span></h2>
    <div className="admin-onair-modes" aria-label="Modes de live disponibles">
     <div><span className="mode-icon">⌂</span><b>Au studio</b><small>Présentiel à Lomé</small></div>
     <div><span className="mode-icon">⌁</span><b>À distance</b><small>Depuis n'importe où</small></div>
    </div>
   </div>
   <div className="admin-onair-visual" aria-hidden="true">
    <div className="admin-live-status"><i/>ON AIR<span>Système actif</span></div>
     <svg className="admin-africa-map" viewBox="0 0 420 330" role="img">
      <path className="admin-africa-shape" d="M176 18l38 5 26 15 31 3 22 20 38 18 25 31-13 24-19 12-5 28-20 19-20 34-17 11-10 30-18 14-20-13-13-30-22-18-10-29-27-24-11-38-27-28-3-30 22-24 26-12 20-17z"/>
      <path className="admin-africa-route" d="M88 145l78 38 45-15 62 22 63-2 28 35M211 168l-8 67 36 45M166 183l-22 49 29 20"/>
      <g className="admin-africa-points"><circle cx="166" cy="183" r="5"/><circle cx="211" cy="168" r="5"/><circle cx="273" cy="190" r="5"/><circle cx="316" cy="188" r="5"/><circle cx="239" cy="280" r="5"/><circle cx="173" cy="252" r="5"/></g>
     </svg>
     <div className="onair-orbit orbit-one"/>
    <div className="onair-orbit orbit-two"/>
    <div className="onair-pulse"/>
    <div className="admin-onair-monogram"><span>O</span><b>C</b><em>D</em></div>
    <div className="onair-location"><i/>LOMÉ · STUDIO</div>
   </div>
  </section>
  <div className="grid grid-cols-3 gap-2 mb-3">{[['En attente',cnt.p,'#B7791F'],['Acceptées cette semaine',cnt.a,'#2F855A'],['Refusées',cnt.r,'#C53030']].map(([l,n,c])=><div key={l} className="card"><div className="text-3xl font-bold" style={{color:c}}><Count value={n}/></div><div className="text-sm text-mute">{l}</div></div>)}</div>
  <div className="flex flex-wrap gap-2 mb-3"><Tab k="res" l="Réservations"/><Tab k="cal" l="Calendrier"/><Tab k="pk" l="Packages"/><Tab k="bl" l="Blocages"/></div>
  {msg&&<p role="status" className="card mb-3">{msg}</p>}
  {tab==='res'&&<><div className="grid sm:grid-cols-6 gap-2 mb-3">
   <input className="input" placeholder="Rechercher nom, business, tél." value={q} onChange={e=>setQ(e.target.value)}/>
   <select className="input" value={fl.status} onChange={e=>setFl({...fl,status:e.target.value})}><option value="">Tous statuts</option>{Object.entries(BADGE).map(([k,v])=><option key={k} value={k}>{v[0]}</option>)}</select>
   <input className="input" type="date" value={fl.date} onChange={e=>setFl({...fl,date:e.target.value})}/>
   <select className="input" value={fl.mode} onChange={e=>setFl({...fl,mode:e.target.value})}><option value="">Tous lieux</option><option value="presentiel">Présentiel</option><option value="distance">À distance</option></select>
   <select className="input" value={fl.pkg} onChange={e=>setFl({...fl,pkg:e.target.value})}><option value="">Tous packages</option>{P.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>
   <select className="input" value={fl.payment} onChange={e=>setFl({...fl,payment:e.target.value})}><option value="">Tous paiements</option>{[['unpaid','Non payé'],['processing','En cours'],['paid','Payé'],['failed','Échoué'],['refunded','Remboursé']].map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></div>
   <button className="btn mb-3" onClick={csv}>Exporter en CSV</button>
   <div className="grid gap-3">{L.map(r=>{const [bl,bc]=BADGE[r.status];const wa=`https://wa.me/${normPhone(r.phone).replace('+','')}?text=${encodeURIComponent(`Bonjour ${r.name}, c'est l'équipe OCD Live au sujet de ta réservation du ${r.live_date} à ${hhmm(r.start_time)}.`)}`
    return <article key={r.id} className="card grid gap-2">
     <div className="flex justify-between gap-2"><b className="font-display text-lg">{r.business}</b><div className="flex gap-2"><span className="status-badge rounded-full px-3 py-1 text-sm font-semibold text-white" style={{background:bc}}>{bl}</span><span className="status-badge rounded-full px-3 py-1 text-sm font-semibold text-white" style={{background:PAYBADGE[r.payment_status||'unpaid'][1]}}>{PAYBADGE[r.payment_status||'unpaid'][0]}</span></div></div>
     <p className="text-sm">{r.name} · {r.phone}<br/>{r.live_date} · {hhmm(r.start_time)}–{hhmm(r.end_time)} · {r.mode==='presentiel'?'Présentiel Lomé':`${r.city}, ${r.country}`}<br/>{r.package_name} · {fmt(r.price)} · {r.payment_method}</p>
     {r.product_desc&&<p className="text-sm text-mute">{r.product_desc}</p>}{r.refusal_reason&&<p className="text-sm text-mute">Motif : {r.refusal_reason}</p>}
     <div className="flex flex-wrap gap-2"><button className="btn btn-primary flex-1" disabled={r.status==='accepted'} onClick={()=>act(r.id,'accept')}>Accepter</button>
      <button className="btn flex-1 !text-white" style={{background:'#C53030'}} onClick={()=>{setRefuse(r.id);setReason('')}}>Refuser</button></div>
     <div className="flex flex-wrap gap-2 text-sm"><a className="btn" href={wa} target="_blank" rel="noreferrer">Écrire sur WhatsApp</a><button className="btn" onClick={()=>act(r.id,'pending')}>Remettre en attente</button><button className="btn" onClick={()=>act(r.id,'cancel')}>Annuler</button><button className="btn btn-primary" onClick={async()=>{const rr=await fetch('/api/admin/payment',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+ses.access_token},body:JSON.stringify({reservation_id:r.id,provider:['transfer','cash'].includes(r.payment_method)?r.payment_method:'manual',mark_paid:true})});const jj=await rr.json();setMsg(rr.ok?'Paiement marqué comme payé':'Erreur : '+(jj.error||'paiement non enregistré'));load()}}>Marquer comme payé</button></div>
     {!!Pay.filter(p=>p.reservation_id===r.id).length&&<details className="text-sm"><summary className="cursor-pointer">Historique des paiements</summary><div className="grid gap-1 mt-2">{Pay.filter(p=>p.reservation_id===r.id).map(p=><p key={p.id}>{p.provider} · {fmt(p.amount)} · {p.status} · {new Date(p.created_at).toLocaleString('fr-FR')}</p>)}</div></details>}
     <input className="input" placeholder="Note interne (Entrée pour enregistrer)" defaultValue={r.internal_note||''} onKeyDown={e=>{if(e.key==='Enter')act(r.id,'note',{note:e.target.value})}}/></article>})}
    {!L.length&&<p className="text-mute">Aucune réservation.</p>}</div></>}
  {tab==='cal'&&<div className="overflow-x-auto"><table className="text-sm w-full border-collapse"><thead><tr><th className="text-left p-1">Jour</th>{SLOTS.map(s=><th key={s} className="p-1">{s}</th>)}</tr></thead><tbody>
   {CAL_DATES.map(d=><tr key={d} className="border-t border-line"><td className="p-1 whitespace-nowrap">{new Date(d+'T00:00:00').toLocaleDateString('fr-FR',{day:'2-digit',month:'short'})}</td>{SLOTS.map(s=>{
    const rs=R.filter(r=>r.live_date===d&&hhmm(r.start_time)===s&&['accepted','pending'].includes(r.status));const bk=B.some(b=>b.live_date===d&&(!b.start_time||hhmm(b.start_time)===s))
    return <td key={s} className="p-1 align-top">{bk&&<div className="rounded px-1 bg-line">Bloqué</div>}{rs.map(r=><div key={r.id} className="rounded px-1 text-white mb-0.5" style={{background:BADGE[r.status][1]}}>{r.business.slice(0,10)}·{r.mode==='presentiel'?'P':'D'}</div>)}</td>})}</tr>)}</tbody></table></div>}
  {tab==='pk'&&<div className="grid gap-3">
   <form className="card grid sm:grid-cols-3 gap-3" onSubmit={async e=>{e.preventDefault();const {error}=await sb.from('site_settings').upsert({key:'booking',value:bookingSettings,updated_at:new Date().toISOString()});setMsg(error?error.message:'Calendrier enregistré')}}>
    <label>Jour d'ouverture<input className="input" type="date" value={bookingSettings.opening_date} onChange={e=>setBookingSettings({...bookingSettings,opening_date:e.target.value})}/></label>
    <label>Horizon (mois)<input className="input" type="number" min="1" max="36" value={bookingSettings.horizon_months} onChange={e=>setBookingSettings({...bookingSettings,horizon_months:+e.target.value})}/></label>
    <label>Créneaux (séparés par des virgules)<input className="input" value={(bookingSettings.slots||[]).join(', ')} onChange={e=>setBookingSettings({...bookingSettings,slots:e.target.value.split(',').map(v=>v.trim()).filter(Boolean)})}/></label>
    <button className="btn btn-primary sm:col-span-3">Enregistrer le calendrier</button></form>
   <form className="card grid sm:grid-cols-2 gap-3" onSubmit={async e=>{e.preventDefault();const {error}=await sb.from('site_settings').upsert({key:'payment',value:settings,updated_at:new Date().toISOString()});setMsg(error?error.message:'Réglages enregistrés')}}>
   <label className="flex items-center gap-2"><input type="checkbox" checked={settings.require_deposit} onChange={e=>setSettings({...settings,require_deposit:e.target.checked})}/> Exiger un acompte à la réservation</label>
   <label>Acompte (%)<input className="input" type="number" min="0" max="100" value={settings.deposit_percent} onChange={e=>setSettings({...settings,deposit_percent:+e.target.value})}/></label>
   <label>Taux EUR/FCFA (1 EUR)<input className="input" type="number" step="0.001" value={settings.eur_xof_rate} onChange={e=>setSettings({...settings,eur_xof_rate:+e.target.value})}/></label>
   <label>Taux USD/FCFA (1 USD)<input className="input" type="number" step="0.001" value={settings.usd_xof_rate} onChange={e=>setSettings({...settings,usd_xof_rate:+e.target.value})}/></label>
   <button className="btn btn-primary sm:col-span-2">Enregistrer les paiements</button></form><div className="flex justify-end"><button className="btn btn-primary" onClick={async()=>{const id=`package-${Date.now()}`;const {error}=await sb.from('packages').insert({id,name:'Nouveau package',description:'Description du package',duration_min:90,live_duration_min:90,live_count:1,price:15000,deposit_percent:30,modes:['presentiel','distance'],inclusions:['Régie professionnelle'],active:false,sort:P.length*10});setMsg(error?error.message:'Package créé');load()}}>+ Nouveau package</button></div>{P.map((p,i)=><div key={p.id} className="card grid sm:grid-cols-3 gap-2">
   <label>Nom<input className="input" defaultValue={p.name||''} onChange={e=>p.name=e.target.value}/></label>
   <label>Prix FCFA<input className="input" type="number" placeholder="Vide = devis" defaultValue={p.price??''} onChange={e=>p.price=e.target.value===''?null:+e.target.value}/></label>
   <label>Acompte (%)<input className="input" type="number" min="0" max="100" defaultValue={p.deposit_percent??30} onChange={e=>p.deposit_percent=+e.target.value}/></label>
   <label>Durée d'un live<input className="input" type="number" min="30" step="30" defaultValue={p.live_duration_min||p.duration_min||90} onChange={e=>{p.duration_min=+e.target.value;p.live_duration_min=+e.target.value}}/></label>
   <label>Nombre de lives<input className="input" type="number" min="1" defaultValue={p.live_count||1} onChange={e=>p.live_count=+e.target.value}/></label>
   <label>Ordre<input className="input" type="number" defaultValue={p.sort||0} onChange={e=>p.sort=+e.target.value}/></label>
   <label className="sm:col-span-2">Description<textarea className="input" defaultValue={p.short_description||p.description||''} onChange={e=>{p.description=e.target.value;p.short_description=e.target.value}}/></label>
   <label className="flex items-center gap-2"><input type="checkbox" defaultChecked={p.active!==false} onChange={e=>p.active=e.target.checked}/> Visible</label>
   <label className="flex items-center gap-2"><input type="checkbox" defaultChecked={(p.modes||[]).includes('presentiel')} onChange={e=>{const modes=new Set(p.modes||[]);e.target.checked?modes.add('presentiel'):modes.delete('presentiel');p.modes=[...modes]}}/> Présentiel</label>
   <label className="flex items-center gap-2"><input type="checkbox" defaultChecked={(p.modes||[]).includes('distance')} onChange={e=>{const modes=new Set(p.modes||[]);e.target.checked?modes.add('distance'):modes.delete('distance');p.modes=[...modes]}}/> À distance</label>
   <label>Mention<input className="input" defaultValue={p.mention||''} onChange={e=>p.mention=e.target.value}/></label>
   <p className="text-sm text-mute flex items-center">{R.filter(r=>r.package_id===p.id).length} réservation(s) générée(s)</p>
   <div className="sm:col-span-3 flex flex-wrap gap-2">
    <button className="btn btn-primary" onClick={async()=>{const {error}=await sb.from('packages').upsert(p,{onConflict:'id'});setMsg(error?error.message:'Package enregistré');load()}}>Enregistrer</button>
    <button className="btn" onClick={async()=>{const copy={...p,id:`${p.id}-copy-${Date.now()}`,name:`${p.name||'Package'} (copie)`,active:false,sort:Number(p.sort||0)+1};const {error}=await sb.from('packages').insert(copy);setMsg(error?error.message:'Package dupliqué');load()}}>Dupliquer</button>
    <button className="btn" disabled={i===0} onClick={async()=>{const other=P[i-1];await Promise.all([sb.from('packages').update({sort:(p.sort||0)-1}).eq('id',p.id),sb.from('packages').update({sort:(other.sort||0)+1}).eq('id',other.id)]);load()}}>Monter</button>
    <button className="btn" disabled={i===P.length-1} onClick={async()=>{const other=P[i+1];await Promise.all([sb.from('packages').update({sort:(p.sort||0)+1}).eq('id',p.id),sb.from('packages').update({sort:(other.sort||0)-1}).eq('id',other.id)]);load()}}>Descendre</button>
    <button className="btn text-live" disabled={R.some(r=>r.package_id===p.id)} onClick={async()=>{const {error}=await sb.from('packages').delete().eq('id',p.id);setMsg(error?error.message:'Package supprimé');load()}}>Supprimer</button>
   </div>
   </div>)}</div>}
  {tab==='partners'&&<div className="grid gap-3"><form className="card grid sm:grid-cols-3 gap-2" onSubmit={async e=>{e.preventDefault();const fd=new FormData(e.currentTarget);const row={name:fd.get('name'),logo_light:fd.get('logo_light')||null,logo_dark:fd.get('logo_dark')||null,url:fd.get('url')||null,active:fd.get('active')==='on',speed:fd.get('speed')||'normal',sort:Number(fd.get('sort')||0)};const {error}=await sb.from('partners').insert(row);setMsg(error?error.message:'Partenaire ajouté');e.currentTarget.reset();load()}}>
   <input required name="name" className="input" placeholder="Nom du partenaire"/>
   <input name="logo_light" className="input" placeholder="Logo clair (/media/logo.png ou URL)"/>
   <input name="logo_dark" className="input" placeholder="Logo sombre (facultatif)"/>
   <input name="url" type="url" className="input" placeholder="Lien externe (facultatif)"/>
   <select name="speed" className="input"><option value="normal">Vitesse normale</option><option value="slow">Vitesse lente</option></select>
   <input name="sort" type="number" className="input" placeholder="Ordre"/>
   <label className="flex items-center gap-2"><input name="active" type="checkbox"/> Activer sur le site</label>
   <button className="btn btn-primary sm:col-span-3">Ajouter le partenaire</button></form>
   <div className="grid sm:grid-cols-2 gap-3">{Partners.map((p,i)=><article key={p.id} className="card grid gap-2" draggable onDragStart={e=>e.dataTransfer.setData('text/plain',p.id)} onDragOver={e=>e.preventDefault()} onDrop={async e=>{e.preventDefault();const sourceId=e.dataTransfer.getData('text/plain');const source=Partners.find(v=>v.id===sourceId);if(!source||source.id===p.id)return;await Promise.all([sb.from('partners').update({sort:p.sort||0}).eq('id',source.id),sb.from('partners').update({sort:source.sort||0}).eq('id',p.id)]);load()}}>
    <div className="flex items-center justify-between gap-3"><b>{p.name}</b><label className="text-sm"><input type="checkbox" checked={p.active} onChange={async e=>{await sb.from('partners').update({active:e.target.checked}).eq('id',p.id);load()}}/> Actif</label></div>
    <div className="partner-admin-preview">{p.logo_light?<img src={p.logo_light} alt={`Aperçu ${p.name}`} width="200" height="70"/>:<span>{p.name}</span>}</div>
    <input className="input" defaultValue={p.logo_light||''} onChange={e=>p.logo_light=e.target.value}/>
    <input className="input" type="url" defaultValue={p.url||''} onChange={e=>p.url=e.target.value}/>
    <select className="input" defaultValue={p.speed||'normal'} onChange={e=>p.speed=e.target.value}><option value="normal">Normale</option><option value="slow">Lente</option></select>
    <div className="flex flex-wrap gap-2"><button className="btn btn-primary" onClick={async()=>{const {error}=await sb.from('partners').update({logo_light:p.logo_light,logo_dark:p.logo_dark,url:p.url||null,speed:p.speed||'normal',active:p.active}).eq('id',p.id);setMsg(error?error.message:'Partenaire enregistré');load()}}>Enregistrer</button><button className="btn" disabled={i===0} onClick={async()=>{const other=Partners[i-1];await Promise.all([sb.from('partners').update({sort:p.sort-10}).eq('id',p.id),sb.from('partners').update({sort:other.sort+10}).eq('id',other.id)]);load()}}>Monter</button><button className="btn text-live" onClick={async()=>{await sb.from('partners').delete().eq('id',p.id);load()}}>Supprimer</button></div>
   </article>)}</div></div>}
  {tab==='bl'&&<div className="grid gap-3"><form className="card grid sm:grid-cols-4 gap-2" onSubmit={async e=>{e.preventDefault();await sb.from('blocked_slots').insert({live_date:nb.date,start_time:nb.time||null,reason:nb.reason});setNb({date:'',time:'',reason:''});load()}}>
   <input required type="date" min={new Date().toISOString().slice(0,10)} className="input" value={nb.date} onChange={e=>setNb({...nb,date:e.target.value})}/>
   <select className="input" value={nb.time} onChange={e=>setNb({...nb,time:e.target.value})}><option value="">Journée entière</option>{SLOTS.map(s=><option key={s}>{s}</option>)}</select>
   <input className="input" placeholder="Raison" value={nb.reason} onChange={e=>setNb({...nb,reason:e.target.value})}/><button className="btn btn-primary">Bloquer</button></form>
   {B.map(b=><div key={b.id} className="card flex justify-between items-center"><span>{b.live_date} · {b.start_time?hhmm(b.start_time):'Journée entière'} {b.reason&&`· ${b.reason}`}</span><button className="btn" onClick={async()=>{await sb.from('blocked_slots').delete().eq('id',b.id);load()}}>Débloquer</button></div>)}</div>}
  {refuse&&<div role="dialog" aria-modal="true" className="fixed inset-0 bg-black/50 flex items-center justify-center p-4"><div className="card w-full max-w-md grid gap-3"><h2 className="text-xl font-bold">Refuser la demande</h2>
   <textarea className="input" rows="3" placeholder="Motif (facultatif) : créneau indisponible, demande hors cadre…" value={reason} onChange={e=>setReason(e.target.value)} autoFocus/>
   <div className="flex gap-2"><button className="btn flex-1" onClick={()=>setRefuse(null)}>Retour</button><button className="btn flex-1 !text-white" style={{background:'#C53030'}} onClick={()=>{act(refuse,'refuse',{reason});setRefuse(null)}}>Refuser</button></div></div></div>}
 </section>
 </main>}
