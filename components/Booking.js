'use client'
import {useEffect,useState} from 'react'
import {SLOTS,FIRST_DAY,addMin} from '@/lib/slots'
import PartnerStrip from '@/components/PartnerStrip'
import {packageFallbacks} from '@/lib/packageFallbacks'

const fmt=n=>n==null?'Sur devis':new Intl.NumberFormat('fr-FR').format(n)+' FCFA'
const frDate=d=>new Date(d+'T00:00:00Z').toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',timeZone:'UTC'})
const PAY=[['tmoney','T-Money'],['flooz','Flooz'],['flutterwave','Mobile Money'],['paypal','PayPal'],['card','Carte bancaire'],['transfer','Virement bancaire'],['cash','Espèces au studio']]

export default function Booking({packages}){
 const [step,setStep]=useState(0),[d,setD]=useState({}),[av,setAv]=useState({}),[showDoor,setShowDoor]=useState(false)
 const [slots,setSlots]=useState(SLOTS)
 const [openingDate,setOpeningDate]=useState(FIRST_DAY)
 const initialMonth=new Date().toISOString().slice(0,7)<='2026-11'?'2026-12':new Date().toISOString().slice(0,7)
 const [month,setMonth]=useState(initialMonth)
 const [packageList,setPackageList]=useState(packages?.length?packages:packageFallbacks),[packageLoading,setPackageLoading]=useState(false)
 const [f,setF]=useState({name:'',phone:'',email:'',business:'',product:'',city:'',country:'',address:'',social:'',payment:'tmoney',website:''})
 const [err,setErr]=useState(''),[busy,setBusy]=useState(false)
 const pkg=packageList.find(p=>p.id===d.pkg)

 async function loadPackages(){
  setPackageLoading(true)
  try{
   const response=await fetch('/api/packages',{cache:'no-store'})
   const json=await response.json().catch(()=>({}))
    if(Array.isArray(json.packages)&&json.packages.length)setPackageList(json.packages)
  }finally{setPackageLoading(false)}
 }

 useEffect(()=>{
  if(!sessionStorage.getItem('ocd-door-seen')){setShowDoor(true);sessionStorage.setItem('ocd-door-seen','1');const t=setTimeout(()=>setShowDoor(false),900);return()=>clearTimeout(t)}
 },[])
 useEffect(()=>{if(!packages?.length)loadPackages()},[])
 useEffect(()=>{
  const preset=new URLSearchParams(window.location.search).get('package')
  if(preset)setD(v=>({...v,pkg:preset}))
 },[])
 useEffect(()=>{
  fetch('/api/settings',{cache:'no-store'}).then(r=>r.json()).then(j=>{
   const configured=j.settings?.booking?.slots
   if(Array.isArray(configured)&&configured.length)setSlots(configured)
   if(j.settings?.booking?.opening_date)setOpeningDate(j.settings.booking.opening_date)
  }).catch(()=>{})
 },[])
 useEffect(()=>{
  try{
   const saved=JSON.parse(localStorage.getItem('ocd-reservation-draft')||'null')
   if(saved?.draft)setD(saved.draft)
   if(saved?.form)setF(saved.form)
   if(saved?.step&&saved.step<5)setStep(saved.step)
  }catch{}
 },[])
 useEffect(()=>{
  if(step>=5){localStorage.removeItem('ocd-reservation-draft');return}
  localStorage.setItem('ocd-reservation-draft',JSON.stringify({draft:d,form:f,step}))
 },[d,f,step])
 useEffect(()=>{if(d.mode)fetch(`/api/availability?mode=${d.mode}&month=${month}`).then(r=>r.json()).then(j=>setAv(j.unavailable||{})).catch(()=>{})},[d.mode,month])
 useEffect(()=>{
  const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)e.target.classList.add('revealed')}),{threshold:.12})
  document.querySelectorAll('[data-reveal]').forEach(el=>io.observe(el));return()=>io.disconnect()
 },[])

 const today=new Date().toISOString().slice(0,10)
 const pick=(k,v,next)=>{setD(o=>({...o,[k]:v}));setStep(next);setErr('')}
 const set=k=>e=>setF(o=>({...o,[k]:e.target.value}))
 async function send(e){e.preventDefault();setBusy(true);setErr('')
  const r=await fetch('/api/reserve',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...f,mode:d.mode,date:d.date,time:d.time,pkg:d.pkg,selectedDates:d.selectedDates||[]})})
  const j=await r.json().catch(()=>({}));setBusy(false)
  if(r.ok){localStorage.removeItem('ocd-reservation-draft');setStep(5)}else{setErr(j.error||'Erreur, réessaie.');if(r.status===409)setStep(2)}}

 const allowedPayments=[
  ['presentiel','cash'],['presentiel','transfer'],['presentiel','tmoney'],['presentiel','flooz'],
  ['distance','tmoney'],['distance','flooz'],['distance','flutterwave'],['distance','paypal'],['distance','card'],['distance','transfer']
 ]
 const choices=PAY.filter(([k])=>allowedPayments.some(([m,x])=>m===d.mode&&x===k))
 const recap=[[d.mode&&(d.mode==='presentiel'?'En présentiel':'À distance'),0],[d.date&&frDate(d.date),1],[d.time&&d.time,2],[pkg&&pkg.name,3]].filter(x=>x[0])
 const monthDate=new Date(month+'-01T00:00:00Z')
 const daysInMonth=new Date(Date.UTC(monthDate.getUTCFullYear(),monthDate.getUTCMonth()+1,0)).getUTCDate()
 const monthOffset=(new Date(Date.UTC(monthDate.getUTCFullYear(),monthDate.getUTCMonth(),1)).getUTCDay()+6)%7
 const calendarDays=Array.from({length:daysInMonth},(_,i)=>`${month}-${String(i+1).padStart(2,'0')}`)
 const baseMonth=today.slice(0,7)
 const maxMonth=new Date(Date.UTC(+baseMonth.slice(0,4),+baseMonth.slice(5,7)-1+12,1)).toISOString().slice(0,7)
 const minMonth=baseMonth<'2026-12'?'2026-12':baseMonth
 function changeMonth(delta){
  const next=new Date(Date.UTC(monthDate.getUTCFullYear(),monthDate.getUTCMonth()+delta,1)).toISOString().slice(0,7)
  if(next>=minMonth&&next<=maxMonth)setMonth(next)
 }

 return <><main className="booking-shell">
  <div className="booking-progress" aria-label={`Étape ${Math.min(step+1,5)} sur 5`}>
   {[0,1,2,3,4].map(i=><button key={i} type="button" disabled={i>step} onClick={()=>setStep(i)} className={i===step?'active':i<step?'complete':''}><span>{i+1}</span><small>{['Mode','Date','Créneau','Package','Infos'][i]}</small></button>)}
  </div>
  {showDoor&&<div className="door-opening" aria-hidden="true"><div className="door-left"/><div className="door-right"/></div>}
  <header className="brand-header">
   <div><img src="/logo.jpg" alt="OCD Live" className="h-12 w-auto" width="120" height="50"/><p className="brand-slogan">Les Opportunités C'est Dehors.</p></div>
   <span className="live-label"><i className="live-dot"/>En direct</span>
  </header>
  <div className="marquee" aria-label="Live, vente, Lomé, opportunité, dehors"><div>Live&nbsp; · &nbsp;Vente&nbsp; · &nbsp;Lomé&nbsp; · &nbsp;Opportunité&nbsp; · &nbsp;Dehors&nbsp; · &nbsp;Live&nbsp; · &nbsp;Vente&nbsp; · &nbsp;Lomé</div></div>
  {step<5&&recap.length>0&&<nav aria-label="Tes choix" className="sticky top-[52px] z-10 bg-bg py-2 flex flex-wrap gap-2">{recap.map(([t,s])=><button key={s} onClick={()=>setStep(s)} className="text-sm rounded-full border border-line bg-card px-3 py-1.5 focus-visible:outline-brand">{t} ✎</button>)}</nav>}
  <div className="step-enter" key={step}>
  {step===0&&<section data-reveal><h1 className="text-3xl font-bold my-4">Réserve ton live de vente</h1><div className="grid gap-3 md:grid-cols-2">
   <button className="big mode-card" onClick={()=>pick('mode','presentiel',1)}><b className="text-xl font-display">En présentiel</b><p className="text-mute">Au studio OCD Live, à Lomé.</p></button>
   <button className="big mode-card" onClick={()=>pick('mode','distance',1)}><b className="text-xl font-display">À distance</b><p className="text-mute">Depuis chez toi, partout dans le monde, avec une assistante basée à Lomé.</p></button></div></section>}
  {step===1&&<section><h2 className="text-2xl font-bold my-4">Choisis un jour</h2><div className="flex items-center justify-between mb-3"><button type="button" className="btn !px-3" disabled={month<=minMonth} onClick={()=>changeMonth(-1)} aria-label="Mois précédent">←</button><b>{monthDate.toLocaleDateString('fr-FR',{month:'long',year:'numeric',timeZone:'UTC'})}</b><button type="button" className="btn !px-3" disabled={month>=maxMonth} onClick={()=>changeMonth(1)} aria-label="Mois suivant">→</button></div>
   <div className="grid grid-cols-7 gap-1.5 text-center text-sm" role="grid">{['L','M','M','J','V','S','D'].map((x,i)=><b key={i} className="text-mute">{x}</b>)}
   {Array.from({length:monthOffset},(_,i)=><i key={'empty-'+i}/>)}
   {calendarDays.map((day,i)=>{const full=(av[day]||[]).length>=slots.length;const off=day<openingDate||day<today||full
    return <button key={day} disabled={off} onClick={()=>pick('date',day,2)} aria-label={frDate(day)} className={'day-button btn !px-0 !min-h-[48px] '+(d.date===day?'selected':'')} style={{animationDelay:`${i*18}ms`}}>{+day.slice(8)}</button>})}</div></section>}
  {step===2&&<section><h2 className="text-2xl font-bold my-4">À quelle heure ?</h2><p className="text-mute mb-3">Créneaux d'1h30 · {frDate(d.date)}</p><div className="grid grid-cols-2 gap-3">
   {slots.filter(s=>!(av[d.date]||[]).includes(s)).map(s=><button key={s} className="btn slot-card text-lg" onClick={()=>pick('time',s,3)}>{s}</button>)}</div>
   {slots.every(s=>(av[d.date]||[]).includes(s))&&<p>Plus de créneau ce jour-là.</p>}{err&&<p role="alert" className="text-live mt-3">{err}</p>}</section>}
  {step===3&&<section className="package-step"><div className="package-heading"><span className="package-kicker">Dernière grande étape</span><h2 className="text-2xl font-bold">Choisis ton package</h2><p className="text-mute">Sélectionne l'offre adaptée à ton activité.</p></div>
   {packageLoading&&<div className="grid gap-3 package-skeletons">{[0,1,2].map(i=><div key={i} className="package-skeleton"/>)}</div>}
   {!packageLoading&&packageList.length>0&&<div className="grid gap-3 package-grid">
   {packageList.filter(p=>!p.modes||!d.mode||p.modes.includes(d.mode)).map((p,i)=><button key={p.id} className={'big package-card '+(p.id==='boost'?'boost-package':'')+(d.pkg===p.id?' package-selected':'')} onClick={()=>{setD(o=>({...o,pkg:p.id}));setErr('')}} style={{animationDelay:`${i*70}ms`}}>
    {p.id==='boost'&&<span className="boost-badge">Le plus choisi</span>}
    <span className="selection-ring" aria-hidden="true"/>
    <div className="package-card-head"><b className="font-display text-lg">{p.name}</b><b className="package-price">{fmt(p.price)}</b></div>{p.mention&&<span className="boost-badge">{p.mention}</span>}<p className="package-description">{p.short_description||p.description||'Live personnalisé selon tes besoins.'}</p><div className="package-meta"><span>{p.live_count>1?`${p.live_count} lives`:`${p.live_duration_min||p.duration_min||90} min`}</span>{p.price!=null&&<span>≈ ${(p.price/600).toLocaleString('fr-FR',{maximumFractionDigits:0})} USD · ${(p.price/655.957).toLocaleString('fr-FR',{maximumFractionDigits:2})} EUR</span>}</div>{Array.isArray(p.inclusions)&&p.inclusions.length>0&&<ul className="package-inclusions">{p.inclusions.slice(0,2).map((item)=><li key={item}>{item}</li>)}</ul>}</button>)}</div>}
    {pkg?.live_count>1&&<div className="card mt-3"><b>Dates des {pkg.live_count} lives</b><p className="text-mute text-sm mt-1">Premier jour : {d.date}. Ajoute les autres dates, une par ligne.</p><textarea className="input mt-2" rows="4" value={(d.selectedDates||[]).join('\n')} placeholder={`${d.date}\n2026-12-09\n2026-12-16`} onChange={e=>setD(o=>({...o,selectedDates:e.target.value.split('\n').map(v=>v.trim()).filter(Boolean)}))}/><small className="text-mute">Sélection reste soumise à validation de l'équipe.</small></div>}
   {!packageLoading&&packageList.length===0&&<div className="package-empty card"><b>Les packages ne sont pas disponibles pour le moment.</b><p className="text-mute">La connexion à la base peut avoir échoué. Réessaie dans quelques instants.</p><button type="button" className="btn btn-primary mt-3" onClick={loadPackages}>Réessayer</button></div>}
   {!packageLoading&&packageList.length>0&&<button className="btn btn-primary package-next" disabled={!d.pkg} onClick={()=>setStep(4)}>Continuer avec {pkg?.name||'ce package'} <span aria-hidden="true">→</span></button>}
   {err&&<p role="alert" className="text-live">{err}</p>}</section>}
  {step===4&&<form onSubmit={send} className="grid gap-3"><h2 className="text-2xl font-bold my-4">Tes informations</h2>
   <input name="website" value={f.website} onChange={set('website')} tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true"/>
   <label>Nom<input required className="input" value={f.name} onChange={set('name')} autoComplete="name"/></label>
   <label>Téléphone / WhatsApp<input required type="tel" className="input" value={f.phone} onChange={set('phone')} autoComplete="tel"/></label>
   <label>E-mail (facultatif)<input type="email" className="input" value={f.email} onChange={set('email')} autoComplete="email"/></label>
   <label>Nom de ton business<input required className="input" value={f.business} onChange={set('business')}/></label>
   <label>Ce que tu présentes<textarea className="input" rows="3" value={f.product} onChange={set('product')}/></label>
   {d.mode==='distance'?<div className="grid grid-cols-2 gap-3"><label>Ville<input required className="input" value={f.city} onChange={set('city')}/></label><label>Pays<input required className="input" value={f.country} onChange={set('country')}/></label></div>
    :<><label>Adresse<input className="input" value={f.address} onChange={set('address')}/></label><label>Réseau social<input className="input" value={f.social} onChange={set('social')}/></label></>}
   <fieldset><legend className="mb-1">Paiement souhaité</legend><div className="flex flex-wrap gap-2">{choices.map(([k,l])=><label key={k} className={'btn cursor-pointer '+(f.payment===k?'!border-brand':'')}><input type="radio" className="sr-only" name="pay" checked={f.payment===k} onChange={()=>setF(o=>({...o,payment:k}))}/>{l}</label>)}</div><p className="text-xs text-mute mt-2">Le paiement est demandé uniquement après acceptation de l'équipe.</p></fieldset>
   {pkg&&<p className="text-mute">Résumé : {pkg.name} · {fmt(pkg.price)} · {frDate(d.date)}, {d.time}–{addMin(d.time,pkg.duration_min)}</p>}
   {err&&<p role="alert" className="text-live">{err}</p>}
   <button disabled={busy} className="btn btn-primary text-lg">{busy?'Envoi…':'Réserver mon live'}</button>
   <p className="text-xs text-mute">Tes données servent uniquement à traiter ta réservation. Elles ne sont ni vendues ni partagées.</p></form>}
  {step===5&&<section className="card text-center my-8 p-8 confirmation"><div className="confetti" aria-hidden="true">{Array.from({length:14}).map((_,i)=><i key={i} style={{'--i':i}}/> )}</div><h2 className="text-2xl font-bold mb-2">Demande envoyée avec un grand sourire</h2><p>L'équipe OCD Live étudie ta demande et te répond par WhatsApp.</p><p className="text-mute mt-3">{pkg?.price==null?'Pour ce besoin sur mesure, un devis sera envoyé.':'Le paiement ou l’acompte ne sera demandé qu’après acceptation de ta réservation.'}</p></section>}
  </div>
 </main><PartnerStrip/></>}
