'use client'
import {useEffect,useState} from 'react'

export default function PartnerStrip(){
 const [partners,setPartners]=useState([])
 useEffect(()=>{
  fetch('/api/partners',{cache:'no-store'}).then(r=>r.ok?r.json():{partners:[]}).then(j=>setPartners(Array.isArray(j.partners)?j.partners:[])).catch(()=>setPartners([]))
 },[])
 if(!partners.length)return null
 const items=partners.length===1?Array.from({length:12},()=>partners[0]):partners
 return <section className="partner-band" aria-label="Nos partenaires">
  <p>Nos partenaires</p>
  <div className="partner-marquee" tabIndex={0}>
   <div className="partner-track">
    {[0,1].map(copy=><div className="partner-copy" aria-hidden={copy===1?true:undefined} key={copy}>
     {items.map((partner,index)=>partner.url?<a key={`${copy}-${partner.id||partner.name}-${index}`} href={partner.url} target="_blank" rel="noopener noreferrer sponsored" aria-label={`Visiter le site de ${partner.name}`}>
      {partner.logo_light||partner.logo_dark?<picture>{partner.logo_dark&&<source srcSet={partner.logo_dark} media="(prefers-color-scheme: dark)"/>}<img src={partner.logo_light||partner.logo_dark} alt={copy===0?`Logo ${partner.name}`:''} width="200" height="70" loading="lazy"/></picture>:<span className="partner-fallback">{partner.name}</span>}
     </a>:<span key={`${copy}-${partner.id||partner.name}-${index}`} className="partner-logo" aria-label={`Logo ${partner.name}`}>
      {partner.logo_light||partner.logo_dark?<picture>{partner.logo_dark&&<source srcSet={partner.logo_dark} media="(prefers-color-scheme: dark)"/>}<img src={partner.logo_light||partner.logo_dark} alt={copy===0?`Logo ${partner.name}`:''} width="200" height="70" loading="lazy"/></picture>:<span className="partner-fallback">{partner.name}</span>}
     </span>)}
    </div>)}
   </div>
  </div>
 </section>
}
