'use client'
import {useEffect} from 'react'
import PartnerStrip from '@/components/PartnerStrip'

export default function HomePage({packages=[]}){
 useEffect(()=>{
  const nodes=document.querySelectorAll('[data-reveal]')
  const io=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting)entry.target.classList.add('revealed')}),{threshold:.12})
  nodes.forEach(node=>io.observe(node));return()=>io.disconnect()
 },[])
 return <div className="home-page">
  <header className="site-nav">
   <a href="/" className="nav-brand" aria-label="OCD Live"><img src="/logo.jpg" alt="OCD Live"/><span>OCD <b>LIVE</b></span></a>
   <nav aria-label="Navigation principale"><a href="#services">Services</a><a href="#packages">Packages</a><a href="#studio">Le studio</a><a href="#faq">FAQ</a></nav>
   <a className="nav-cta" href="/reservation">Réserver mon live <span>→</span></a>
  </header>
  <main>
   <section className="hero-section">
    <div className="hero-grid"/>
    <div className="hero-copy" data-reveal>
     <div className="hero-live"><span/><b>Basé à Lomé, Togo</b></div>
     <p className="hero-kicker">STUDIO DE LIVE COMMERCE</p>
     <h1>LES OPPORTUNITÉS,<br/><em>C'EST DEHORS !</em></h1>
     <p>Donne à ta marque le décor, les outils et l'expertise pour vendre en live. En présentiel au studio ou à distance, Bouvann et l'équipe OCD Live propulsent ton business.</p>
     <div className="hero-actions"><a className="hero-primary" href="/reservation">RÉSERVER MON LIVE <span>→</span></a><a className="hero-secondary" href="#services">DÉCOUVRIR NOS SERVICES</a></div>
     <div className="hero-proof"><div><strong>6</strong><span>créneaux par jour</span></div><div><strong>LIVE</strong><span>présentiel & distance</span></div></div>
    </div>
    <div className="hero-media" data-reveal>
     <img src="/media/studio-live.png" alt="Hôte en live commerce dans un studio professionnel"/>
     <div className="hero-media-tag"><span className="live-dot"/>TRANSMISSION EN DIRECT</div>
     <div className="hero-camera-card"><span>CAM 01</span><b>OCD STUDIO</b></div>
    </div>
   </section>
   <section className="services-section" id="services" data-reveal>
    <div className="section-heading"><span>01 / NOS SERVICES</span><h2>Tout pour faire vivre<br/>ta marque en direct.</h2></div>
    <div className="service-grid">
     <article><div className="service-number">01</div><h3>Live présentiel</h3><p>Un studio équipé, un décor maîtrisé et une équipe pour produire ton live à Lomé.</p></article>
     <article><div className="service-number">02</div><h3>Live à distance</h3><p>Diffuse depuis chez toi avec le cadre, les conseils et l'assistance de l'équipe OCD.</p></article>
     <article><div className="service-number">03</div><h3>Animation & vente</h3><p>Une présentation claire, rythmée et tournée vers la conversion de tes prospects.</p></article>
    </div>
   </section>
   <section className="advantage-section" id="studio" data-reveal>
    <div className="advantage-media"><img src="/media/production.png" alt="Studio de production OCD Live"/></div>
    <div className="advantage-copy"><span>02 / POURQUOI OCD LIVE</span><h2>Ton studio.<br/><em>Ta prochaine vente.</em></h2>
     <ul><li><b>Production maîtrisée</b><span>Caméras, lumière, son et réseau.</span></li><li><b>Conseil commercial</b><span>Des formats pensés pour convertir.</span></li><li><b>Accompagnement humain</b><span>Une équipe proche, disponible à Lomé.</span></li></ul>
    </div>
   </section>
   <section className="packages-section" id="packages" data-reveal>
    <div className="section-heading light"><span>03 / NOS PACKAGES</span><h2>Choisis ton format.</h2></div>
    <div className="public-package-grid">
     {packages.length?packages.map((p,i)=><article key={p.id} className={p.id==='boost'?'featured-package':''}><div className="package-index">{String(i+1).padStart(2,'0')}</div>{p.id==='boost'&&<span className="featured-label">LE PLUS CHOISI</span>}<h3>{p.name}</h3><p>{p.short_description||p.description||'Un format adapté à ton live commerce.'}</p>{p.mention&&<span className="public-package-mention">{p.mention}</span>}<p className="public-package-duration">{p.live_count>1?`${p.live_count} lives`:`${p.live_duration_min||p.duration_min||90} min`}</p><div className="public-price">{p.price==null?'SUR DEVIS':new Intl.NumberFormat('fr-FR').format(p.price)+' FCFA'}</div>{p.price!=null&&<small className="public-eur">≈ EUR ${(p.price/655.957).toLocaleString('fr-FR',{maximumFractionDigits:0})} · USD ${(p.price/600).toLocaleString('fr-FR',{maximumFractionDigits:0})}</small>}<a href={`/reservation?package=${encodeURIComponent(p.id)}`}>Choisir ce package <span>→</span></a></article>):<article><h3>Packages en chargement</h3><p>Les offres sont récupérées depuis Supabase.</p></article>}
    </div>
   </section>
   <section className="gallery-section" data-reveal>
    <div className="section-heading"><span>04 / LE STUDIO EN ACTION</span><h2>Une expérience<br/>qui se voit.</h2></div>
    <div className="gallery-grid"><img src="/media/studio-commerce.png" alt="Live commerce avec créatrice"/><img src="/media/dashboard.png" alt="Pilotage professionnel d activité"/><img src="/media/studio-live.png" alt="Transmission en direct"/></div>
   </section>
   <section className="testimonials-section" data-reveal><div className="section-heading"><span>05 / ILS ONT TENTÉ L'AVENTURE</span><h2>Le live devient un vrai canal.</h2></div><div className="testimonial-grid"><blockquote>“Le cadre professionnel a changé la façon dont nos clients nous regardent.”<footer>— Entrepreneuse, Lomé</footer></blockquote><blockquote>“Un accompagnement simple, efficace et orienté résultats.”<footer>— Vendeur à distance</footer></blockquote></div></section>
   <section className="faq-section" id="faq" data-reveal><div className="section-heading"><span>06 / QUESTIONS FRÉQUENTES</span><h2>Avant de sortir.</h2></div><div className="faq-grid"><details><summary>Comment réserver ?</summary><p>Choisis le mode, la date, l’heure, ton package puis envoie tes informations. L’équipe confirme ensuite ta demande.</p></details><details><summary>Le paiement se fait-il maintenant ?</summary><p>Non. La réservation reste en attente jusqu’à l’acceptation de l’équipe. Le lien de paiement est envoyé après validation.</p></details><details><summary>Peut-on participer à distance ?</summary><p>Oui. Sélectionne le mode À distance et précise ta ville et ton pays.</p></details><details><summary>À partir de quelle date ?</summary><p>Les premiers créneaux disponibles commencent le 1er décembre 2026.</p></details></div></section>
   <section className="home-cta"><span>PRÊT À SORTIR ?</span><h2>Ta prochaine opportunité<br/>est dehors.</h2><a href="/reservation">RÉSERVER MON LIVE →</a></section>
  </main>
  <PartnerStrip/>
  <footer className="site-footer"><div><img src="/logo.jpg" alt="OCD Live"/><p>Les Opportunités C'est Dehors.</p></div><div><b>OCD Live</b><span>Studio de live commerce</span><span>Lomé, Togo</span></div><div><a href="/reservation">Réserver</a><a href="/admin">Administration</a></div><small>© 2026 OCD Live</small></footer>
 </div>
}
