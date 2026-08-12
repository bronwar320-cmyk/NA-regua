const cfg = window.NA_REGUA_CONFIG || {};
const hasSupabase = cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY &&
  !cfg.SUPABASE_URL.includes("COLE_AQUI") && !cfg.SUPABASE_ANON_KEY.includes("COLE_AQUI");
const sb = hasSupabase ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY) : null;

const OWNER_EMAILS = ["bryanyttcontato@gmail.com", "naregua@icloud.com"];
const DAILY_LIMIT = 10;
const photos = [
  "assets/corte-1.jpg","assets/corte-2.jpg","assets/corte-3.jpg","assets/corte-4.jpg","assets/corte-5.jpg"
];

let currentSlide = 0;
let session = null;
let realtimeChannel = null;

const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const toast = msg => { const el=$("toast"); el.textContent=msg; el.classList.add("show"); setTimeout(()=>el.classList.remove("show"),3500); };
const todayISO = () => new Date().toLocaleDateString("en-CA", {timeZone:"America/Sao_Paulo"});

function setupGallery(){
  $("gallerySlides").innerHTML = photos.map((p,i)=>`<div class="gallery-slide ${i===0?"active":""}" style="background-image:url('${p}')"></div>`).join("");
  $("galleryDots").innerHTML = photos.map((_,i)=>`<button class="${i===0?"active":""}" aria-label="Foto ${i+1}" onclick="goSlide(${i})"></button>`).join("");
  setInterval(()=>goSlide((currentSlide+1)%photos.length),5000);
}
function goSlide(i){
  currentSlide=i;
  document.querySelectorAll(".gallery-slide").forEach((x,n)=>x.classList.toggle("active",n===i));
  document.querySelectorAll(".gallery-dots button").forEach((x,n)=>x.classList.toggle("active",n===i));
}
window.goSlide=goSlide;

function showConfigWarning(){
  if(!hasSupabase){
    toast("Configure a URL e a chave pública do Supabase no arquivo config.js.");
  }
}

function getTimesForDate(date){
  const d = new Date(date+"T12:00:00");
  const day = d.getDay();
  if(day===0) return ["09:00","10:00","11:00","14:00","15:00","16:00","17:00"];
  if(day===1) return ["08:00","09:00","10:00","11:00","15:40","16:40","17:40","18:40"];
  if(day===2 || day===3) return ["08:00","09:00","10:00","11:00","15:40","16:40","17:40","18:40","19:40"];
  if(day===4) return ["07:30","08:30","09:30","10:30","11:30","15:40","16:40","17:40","18:40","19:40"];
  if(day===5) return ["07:00","08:00","09:00","10:00","11:00","15:40","16:40","17:40","18:40","19:40"];
  return ["07:30","08:30","09:30","10:30","11:30","15:00","16:00","17:00","18:00"];
}
async function loadSlots(){
  const date=$("bookingDate").value;
  const select=$("bookingTime");
  if(!date){ select.innerHTML="<option value=''>Selecione a data primeiro</option>"; return; }
  if(date < todayISO()){ select.innerHTML="<option value=''>Escolha uma data futura</option>"; return; }
  let used = [];
  if(sb){
    const {data,error}=await sb.from("appointments").select("time").eq("date",date).neq("status","cancelled");
    if(!error) used=(data||[]).map(x=>x.time);
  }
  const times=getTimesForDate(date);
  select.innerHTML = `<option value="">Selecione</option>` + times.map(t=>`<option value="${t}" ${used.includes(t)?"disabled":""}>${t}${used.includes(t)?" — ocupado":""}</option>`).join("");
  $("slotStatus").textContent = `Vagas usadas: ${used.length}/${DAILY_LIMIT}. ${used.length>=DAILY_LIMIT?"Dia lotado.":""}`;
}
async function submitBooking(e){
  e.preventDefault();
  if(!sb){ showConfigWarning(); return; }
  const payload={
    name:$("bookingName").value.trim(), whatsapp:$("bookingWhatsapp").value.trim(),
    email:$("bookingEmail").value.trim() || null, service:$("bookingService").value,
    date:$("bookingDate").value, time:$("bookingTime").value
  };
  if(!payload.time) return toast("Escolha um horário.");
  const {data: existing,error: checkErr}=await sb.from("appointments").select("id").eq("date",payload.date).neq("status","cancelled");
  if(checkErr) return toast("Não foi possível verificar as vagas.");
  if((existing||[]).length>=DAILY_LIMIT) return toast("Esse dia já atingiu 10 agendamentos.");
  const {error}=await sb.from("appointments").insert(payload);
  if(error){
    if(error.code==="23505") return toast("Esse horário acabou de ser ocupado. Escolha outro.");
    return toast("Erro ao confirmar: "+error.message);
  }
  $("bookingForm").reset(); $("bookingDate").value=payload.date; await loadSlots();
  toast("Agendamento confirmado!");
}

async function loadChat(){
  if(!sb){ $("chatMessages").innerHTML='<div class="empty">Chat disponível após configurar o Supabase.</div>'; return; }
  const {data,error}=await sb.from("chat_messages").select("*").order("created_at",{ascending:true}).limit(100);
  if(error){ $("chatMessages").innerHTML='<div class="empty">Não foi possível carregar o chat.</div>'; return; }
  $("chatMessages").innerHTML = (data||[]).map(m=>chatBubble(m)).join("") || '<div class="empty">Ainda não há mensagens.</div>';
  $("chatMessages").scrollTop=$("chatMessages").scrollHeight;
}
function chatBubble(m){
  return `<div class="chat-msg"><div class="bubble"><b>${esc(m.name)}</b><br>${esc(m.message)}</div><small>${new Date(m.created_at).toLocaleString("pt-BR")}</small></div>`;
}
async function submitChat(e){
  e.preventDefault();
  if(!sb){ showConfigWarning(); return; }
  const name=$("chatName").value.trim(), email=$("chatEmail").value.trim()||null, message=$("chatText").value.trim();
  const {error}=await sb.from("chat_messages").insert({name,email,message});
  if(error) return toast("Não foi possível enviar a mensagem.");
  $("chatText").value=""; await loadChat(); toast("Mensagem enviada!");
}

async function login(){
  if(!sb){ showConfigWarning(); return; }
  const email=$("loginEmail").value.trim().toLowerCase(), password=$("loginPassword").value;
  if(!OWNER_EMAILS.includes(email)) return $("loginMsg").textContent="E-mail não autorizado.";
  const {data,error}=await sb.auth.signInWithPassword({email,password});
  if(error) return $("loginMsg").textContent="Login inválido.";
  session=data.session; await showOwnerPanel();
}
async function logout(){ await sb?.auth.signOut(); session=null; $("ownerPanel").classList.add("hidden"); $("loginBox").classList.remove("hidden"); }
async function showOwnerPanel(){
  if(!session) return;
  const email=session.user.email.toLowerCase();
  if(!OWNER_EMAILS.includes(email)){ await logout(); return; }
  $("loginBox").classList.add("hidden"); $("ownerPanel").classList.remove("hidden"); $("ownerEmailLabel").textContent=email;
  await refreshDashboard();
}
async function refreshDashboard(){
  if(!sb) return;
  const today=todayISO();
  const {data: appts}=await sb.from("appointments").select("*").order("date",{ascending:true}).order("time",{ascending:true});
  const {data: msgs}=await sb.from("chat_messages").select("*").order("created_at",{ascending:true});
  const all=appts||[];
  $("todayCount").textContent=all.filter(a=>a.date===today && a.status!=="cancelled").length;
  $("upcomingCount").textContent=all.filter(a=>a.date>=today && a.status!=="cancelled").length;
  $("chatCount").textContent=(msgs||[]).length;
  $("appointmentsTable").innerHTML=`<table class="admin-table"><thead><tr><th>Data</th><th>Hora</th><th>Nome</th><th>WhatsApp</th><th>Corte</th><th>Status</th><th></th></tr></thead><tbody>${all.map(a=>`<tr><td>${esc(a.date)}</td><td>${esc(a.time)}</td><td>${esc(a.name)}</td><td>${esc(a.whatsapp)}</td><td>${esc(a.service)}</td><td>${esc(a.status||"confirmed")}</td><td><button class="secondary" onclick="cancelAppointment('${a.id}')">Cancelar</button></td></tr>`).join("")}</tbody></table>`;
  $("adminChat").innerHTML=(msgs||[]).map(m=>`<div class="admin-line"><b>${esc(m.name)}</b> · ${new Date(m.created_at).toLocaleString("pt-BR")}<br>${esc(m.message)}${m.email?`<small>${esc(m.email)}</small>`:""}</div>`).join("")||"Sem mensagens.";
}
window.cancelAppointment=async id=>{
  if(!sb || !session) return;
  const {error}=await sb.from("appointments").update({status:"cancelled"}).eq("id",id);
  if(error) toast("Não foi possível cancelar."); else { toast("Agendamento cancelado."); await refreshDashboard(); }
};

function setupRealtime(){
  if(!sb) return;
  realtimeChannel=sb.channel("na-regua-live")
    .on("postgres_changes",{event:"*",schema:"public",table:"appointments"},()=>{loadSlots();refreshDashboard();})
    .on("postgres_changes",{event:"*",schema:"public",table:"chat_messages"},()=>{loadChat();refreshDashboard();})
    .subscribe();
}

document.addEventListener("DOMContentLoaded", async ()=>{
  setupGallery(); showConfigWarning();
  const min=todayISO(); $("bookingDate").min=min; $("bookingDate").value=min;
  $("bookingDate").addEventListener("change",loadSlots);
  $("bookingForm").addEventListener("submit",submitBooking);
  $("chatForm").addEventListener("submit",submitChat);
  $("loginBtn").addEventListener("click",login);
  $("logoutBtn").addEventListener("click",logout);
  await loadSlots(); await loadChat();
  if(sb){
    const {data}=await sb.auth.getSession(); session=data.session;
    if(session && OWNER_EMAILS.includes(session.user.email.toLowerCase())) await showOwnerPanel();
    sb.auth.onAuthStateChange((_event,s)=>{session=s; if(s) showOwnerPanel();});
    setupRealtime();
  }
});
