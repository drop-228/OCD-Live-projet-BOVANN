import {normPhone} from './phone'
async function email(to,subject,text){
 if(!process.env.RESEND_API_KEY||!to)return false
 const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+process.env.RESEND_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({from:process.env.EMAIL_FROM,to,subject,text})})
 return r.ok}
async function telegram(text){
 const t=process.env.TELEGRAM_BOT_TOKEN,c=process.env.TELEGRAM_CHAT_ID;if(!t||!c)return false
 const r=await fetch(`https://api.telegram.org/bot${t}/sendMessage`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:c,text})});return r.ok}
async function whatsapp(phone,text){
 const {TWILIO_ACCOUNT_SID:sid,TWILIO_AUTH_TOKEN:tok,TWILIO_WHATSAPP_FROM:from}=process.env;if(!sid||!tok||!from)return false
 const body=new URLSearchParams({From:'whatsapp:'+from,To:'whatsapp:'+normPhone(phone),Body:text})
 const r=await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,{method:'POST',headers:{Authorization:'Basic '+Buffer.from(sid+':'+tok).toString('base64')},body});return r.ok}
export async function notifyAdmin(text){
 await Promise.allSettled([email(process.env.ADMIN_EMAIL,'Nouvelle réservation OCD Live',text),telegram(text)])}
// Client : WhatsApp d'abord, sinon e-mail
export async function notifyClient({phone,email:to},subject,text){
 try{if(await whatsapp(phone,text))return 'whatsapp'}catch{}
 try{if(await email(to,subject,text))return 'email'}catch{}
 return null}
