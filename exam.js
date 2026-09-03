// Qudrat simulator V15 — cleaned build. Legacy shadowed timer/dot implementations removed.
const {createClient}=supabase;
const db=createClient(window.SUPABASE_URL,window.SUPABASE_PUBLISHABLE_KEY);
let attemptId=null,questions=[],current=0,answers={},flags={},seconds=6000,sectionSeconds=1500,timerRef=null,finishing=false,fontScale=1,activeSection='quantitative',sectionIndex=0,devQuick=false,totalDeadline=0,sectionDeadline=0;
const $=id=>document.getElementById(id);

async function ensureAuth(){
  const {data:{session}}=await db.auth.getSession();
  if(session)return true;
  const {data,error}=await db.auth.signInAnonymously();
  if(error)throw error;
  return !!data.session;
}

async function start(){
  document.body.classList.add('loading');
  try{
    await ensureAuth();
    const params=new URLSearchParams(location.search);
    devQuick=params.get('mode')==='devquick';
    const free=params.get('free')==='1';
    const requestedTotal=Number(params.get('total')||(free?10:20));
    const expectedTotal=Math.max(2,Math.min(120,Number.isFinite(requestedTotal)?requestedTotal:20));
    // استعادة المحاولة فقط إذا كانت من نفس نسخة الاختبار ونفس عدد الأسئلة.
    // أي جلسة قديمة (مثل اختبار 90 سؤالًا) تُلغى حتى لا تظهر بعد التحديث.
    try{
      const saved=JSON.parse(localStorage.getItem('qudrat_active_session_v25')||'null');
      if(saved?.attemptId && saved?.sessionVersion===25 && Array.isArray(saved.questions) && saved.questions.length===expectedTotal){
        attemptId=saved.attemptId; questions=saved.questions; current=Number(saved.current)||0;
        answers=saved.answers||{}; flags=saved.flags||{}; sectionIndex=Number(saved.sectionIndex)||0; devQuick=!!saved.devQuick;
        // نعتمد على وقت نهاية ثابت، لذلك يستمر العد حتى لو غادر الطالب الصفحة أو أغلقها.
        totalDeadline=Number(saved.totalDeadline)||((Number(saved.ts)||Date.now())+(Number(saved.seconds)||6000)*1000);
        sectionDeadline=Number(saved.sectionDeadline)||((Number(saved.ts)||Date.now())+(Number(saved.sectionSeconds)||1500)*1000);
        seconds=Math.max(0,Math.ceil((totalDeadline-Date.now())/1000));
        sectionSeconds=Math.max(0,Math.ceil((sectionDeadline-Date.now())/1000));
        activeSection=questions[current]?.section||'quantitative';
        render();
        if(seconds<=0){finish();return;}
        if(simFull() && sectionSeconds<=0){advanceExpiredSections();}
        startTimer(); $('status').textContent='تمت استعادة الاختبار والوقت مستمر منذ مغادرة الصفحة';
        return;
      }
      localStorage.removeItem('qudrat_active_session_v25');
    }catch{ localStorage.removeItem('qudrat_active_session_v25'); }
    // تنظيف مفاتيح الجلسات القديمة نهائيًا.
    localStorage.removeItem('qudrat_active_session_v10');
    const total=expectedTotal;
    const requestedMinutes=Number(params.get('minutes')||(free?10:(total===96?100:20)));
    seconds=Math.max(60,Math.round((Number.isFinite(requestedMinutes)?requestedMinutes:20)*60));
    sectionSeconds=total===96?1500:seconds;
    totalDeadline=Date.now()+seconds*1000;
    sectionDeadline=Date.now()+sectionSeconds*1000;
    const examType=params.get('type')||((total===96)?'mock':'placement');
    const {data,error}=await db.rpc('start_exam',{p_exam_type:examType,p_total:total});
    if(error)throw error;
    attemptId=data.attempt_id;
    const raw=data.questions||[]; const quant=raw.filter(q=>q.section==='quantitative').slice(0,48), verbal=raw.filter(q=>q.section==='verbal').slice(0,48); questions=total===96?[...quant.slice(0,24),...verbal.slice(0,24),...quant.slice(24),...verbal.slice(24)]:raw;
    questions.forEach(q=>{answers[q.id]=null;flags[q.id]=false});
    activeSection=questions[0]?.section||'quantitative';
    localStorage.removeItem('qudrat_result');
    if(devQuick){sectionIndex=0;sectionSeconds=300;seconds=300;totalDeadline=Date.now()+300000;sectionDeadline=totalDeadline;} render(); persistSession(); startTimer();
  }catch(e){
    console.error(e);
    $('questionText').textContent='تعذر بدء الاختبار.';
    $('status').textContent=e.message||'حدث خطأ غير معروف';
  }finally{document.body.classList.remove('loading')}
}

function sectionRank(s){return s==='quantitative'?0:1}
function sectionName(s){return s==='quantitative'?'القسم الكمي':'القسم اللفظي'}
function sectionQuestions(s){return questions.map((q,i)=>({q,i})).filter(x=>x.q.section===s)}

function render(){
  const q=questions[current]; if(!q)return;
  activeSection=q.section;
  const secName=sectionName(q.section);
  $('sectionLabel').textContent=secName;
  $('panelSection').textContent=secName;
  $('topCounter').textContent=`${current+1} من ${questions.length}`;
  $('counter').textContent=`السؤال ${current+1} من ${questions.length}`;
  $('questionText').textContent=q.question_text;
  $('questionText').style.fontSize=`${27*fontScale}px`;
  $('answers').innerHTML='';
  const letters=['أ','ب','ج','د','هـ'];
  q.choices.forEach((choice,i)=>{
    const b=document.createElement('button');
    if(answers[q.id]===choice)b.classList.add('chosen');
    b.innerHTML='<b></b><span></span>';
    b.querySelector('span').dataset.letter=letters[i]||'';
    b.querySelector('span').textContent=choice;
    b.onclick=()=>selectAnswer(choice);
    $('answers').appendChild(b);
  });
  $('flagBtn').classList.toggle('flaggedAction',!!flags[q.id]);
  $('flagBtn').textContent=flags[q.id]?'⚑ محدد للمراجعة':'⚑ تحديد للمراجعة';
  $('prevBtn').disabled=current===0;
  $('nextBtn').textContent=current===questions.length-1?'إنهاء الاختبار':'حفظ والتالي →';
  $('nextBtn').classList.toggle('finish',current===questions.length-1);
  renderTabs(); renderDots();
}

function renderTabs(){
  const qc=sectionQuestions('quantitative').length,vc=sectionQuestions('verbal').length;
  $('quantCount').textContent=qc;$('verbalCount').textContent=vc;
  $('quantTab').classList.toggle('active',activeSection==='quantitative');
  $('verbalTab').classList.toggle('active',activeSection==='verbal');
}

// renderDots: obsolete implementation removed during cleanup.


async function saveQuestion(q){
  const {error}=await db.rpc('save_answer',{p_attempt_id:attemptId,p_question_id:q.id,p_selected_answer:answers[q.id],p_flagged:!!flags[q.id]});
  if(error)throw error;
}
async function selectAnswer(choice){
  const q=questions[current];answers[q.id]=choice;render();$('status').textContent='جارٍ حفظ الإجابة...';
  try{await saveQuestion(q);$('status').textContent='تم حفظ الإجابة';persistSession();}catch(e){$('status').textContent='تعذر حفظ الإجابة';}
}

$('flagBtn').onclick=async()=>{const q=questions[current];flags[q.id]=!flags[q.id];render();try{await saveQuestion(q);$('status').textContent='تم حفظ علامة المراجعة';persistSession()}catch(e){$('status').textContent='تعذر حفظ علامة المراجعة'}};
$('prevBtn').onclick=()=>{if(current>0){current--;render()}};
$('nextBtn').onclick=()=>{if(current<questions.length-1){current++;render();return}confirmFinish()};
$('endTopBtn').onclick=confirmFinish;
function confirmFinish(){const u=Object.values(answers).filter(v=>v==null).length,f=Object.values(flags).filter(Boolean).length,msg=(u?`لديك ${u} سؤال غير مجاب. `:'')+(f?`ولديك ${f} سؤال محدد للمراجعة. `:'')+'هل تريد إنهاء الاختبار وإظهار النتيجة؟';if(confirm(msg))finish()}

$('quantTab').onclick=()=>jumpSection('quantitative');
$('verbalTab').onclick=()=>jumpSection('verbal');
function jumpSection(s){const idx=questions.findIndex(q=>q.section===s);if(idx>=0){current=idx;activeSection=s;render()}}

$('showAllBtn').onclick=toggleNavigator;
$('allQuestionsBtn').onclick=()=>renderDots(true);
function toggleNavigator(){if(innerWidth<=760){$('navigator').classList.toggle('open')}else{renderDots(true)}}
function closeNavigatorMobile(){if(innerWidth<=760)$('navigator').classList.remove('open')}

for(const b of document.querySelectorAll('[data-font]'))b.onclick=()=>{
  const m=b.dataset.font;
  if(m==='up')fontScale=Math.min(1.35,fontScale+.1);
  if(m==='down')fontScale=Math.max(.8,fontScale-.1);
  if(m==='reset')fontScale=1;
  render();
};

$('instructionsBtn').onclick=()=>openModal('instructionsModal');
$('calculatorBtn').onclick=()=>openModal('calculatorModal');
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>closeModal(b.dataset.close));
function openModal(id){$(id).hidden=false}
function closeModal(id){$(id).hidden=true}

const calcDisplay=$('calcDisplay');
$('calcGrid').addEventListener('click',e=>{
  if(e.target.tagName!=='BUTTON')return;
  const v=e.target.textContent;
  if(v==='C')calcDisplay.value='';
  else if(v==='⌫')calcDisplay.value=calcDisplay.value.slice(0,-1);
  else if(v==='='){
    try{const expr=calcDisplay.value.replace(/×/g,'*').replace(/÷/g,'/');if(!/^[0-9+\-*/().\s]+$/.test(expr))throw 0;calcDisplay.value=String(Function('"use strict";return ('+expr+')')())}catch{calcDisplay.value='خطأ'}
  }else calcDisplay.value+=(v==='خطأ'?'':v);
});

async function finish(){
  if(finishing)return;
  finishing=true;clearInterval(timerRef);document.body.classList.add('loading');$('status').textContent='جارٍ تصحيح الاختبار...';
  try{
    const {data,error}=await db.rpc('finish_exam',{p_attempt_id:attemptId});
    if(error)throw error;
    clearSession();localStorage.setItem('qudrat_result',JSON.stringify(data));location.href='results.html';
  }catch(e){
    console.error(e);finishing=false;document.body.classList.remove('loading');
    $('status').textContent='تعذر إنهاء الاختبار: '+(e?.message||'تحقق من الاتصال ثم حاول مرة أخرى');
  }
}

// startTimer: implementation defined below with section timing.

function fmt(s){return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`}

// محاكاة المحوسب: 4 أقسام × 24 سؤالًا × 25 دقيقة. لا رجوع بعد إنهاء القسم.
function simFull(){return questions.length===96&&!devQuick}
function secStart(){return simFull()?sectionIndex*24:0}
function secEnd(){return simFull()?secStart()+23:questions.length-1}
function syncSection(){if(simFull())sectionIndex=Math.floor(current/24)}
function goNextSection(auto=false){
  if(!simFull()||sectionIndex>=3){finish();return}
  const start=secStart(),end=secEnd();
  const unanswered=questions.slice(start,end+1).filter(q=>answers[q.id]==null).length;
  if(!auto&&!confirm((unanswered?`لديك ${unanswered} سؤال غير مجاب. `:'')+'بعد الانتقال لن تتمكن من العودة لهذا القسم. هل تريد الانتقال؟'))return;
  sectionIndex++; current=sectionIndex*24; sectionSeconds=1500; sectionDeadline=Date.now()+1500000; render();
  $('status').textContent='بدأ القسم الجديد — 25 دقيقة';
}

// قواعد التنقل الخاصة بالمحاكاة الكاملة
const _renderBase=render;
render=function(){syncSection();_renderBase();if(simFull()){
  const q=questions[current],local=current-secStart()+1;
  $('sectionLabel').textContent=`القسم ${sectionIndex+1} من 4 — ${sectionName(q.section)}`;
  $('panelSection').textContent=$('sectionLabel').textContent;
  $('topCounter').textContent=`${local} من 24`;$('counter').textContent=`السؤال ${local} من 24`;
  $('prevBtn').disabled=current===secStart();
  $('nextBtn').textContent=current===95?'إنهاء الاختبار':(current===secEnd()?'إنهاء القسم والانتقال →':'حفظ والتالي →');
}}
$('prevBtn').onclick=()=>{if(current>secStart()){current--;render()}};
$('nextBtn').onclick=()=>{if(current<secEnd()){current++;render();return}if(current===95)confirmFinish();else goNextSection(false)};
$('quantTab').onclick=$('verbalTab').onclick=()=>{$('status').textContent='يمكنك مراجعة أسئلة القسم الحالي فقط'};
renderDots=function(){const host=$('dots');host.innerHTML='';const rows=simFull()?questions.slice(secStart(),secEnd()+1).map((q,j)=>({q,i:secStart()+j})):sectionQuestions(activeSection);rows.forEach(({q,i},j)=>{const e=document.createElement('button');e.type='button';e.textContent=simFull()?j+1:i+1;if(answers[q.id]!=null)e.classList.add('answered');if(flags[q.id])e.classList.add('flagged');if(i===current)e.classList.add('current');e.onclick=()=>{current=i;render();closeNavigatorMobile()};host.appendChild(e)})};
$('allQuestionsBtn').onclick=()=>renderDots();
// startTimer: obsolete implementation removed during cleanup.
;


// V8: تنبيهات زمنية وانتقال واضح بين الأقسام
let warned5=false,warned1=false,pendingSectionMove=false;
function showTimeWarning(text,urgent=false){const w=$('timeWarning');if(!w)return;w.textContent=text;w.hidden=false;w.classList.toggle('urgent',urgent);clearTimeout(showTimeWarning._t);showTimeWarning._t=setTimeout(()=>w.hidden=true,4500)}
function updateSectionStats(){if(!simFull())return;const part=questions.slice(secStart(),secEnd()+1),done=part.filter(q=>answers[q.id]!=null).length,flagged=part.filter(q=>flags[q.id]).length;$('status').textContent=`القسم ${sectionIndex+1} من 4 — تمت الإجابة عن ${done} من 24${flagged?` — ${flagged} للمراجعة`:''}`;}
const __renderV8=render;render=function(){__renderV8();if(devQuick){$('sectionLabel').textContent='تجربة سريعة';$('panelSection').textContent='تجربة سريعة';}else updateSectionStats()};
function openSectionEndModal(){const part=questions.slice(secStart(),secEnd()+1),u=part.filter(q=>answers[q.id]==null).length,f=part.filter(q=>flags[q.id]).length;$('sectionModalTitle').textContent=`إنهاء القسم ${sectionIndex+1} من 4`;$('sectionModalText').textContent=(u?`لديك ${u} سؤال غير مجاب. `:'جميع أسئلة القسم مجابة. ')+(f?`ولديك ${f} سؤال محدد للمراجعة. `:'')+'بعد الانتقال لا يمكنك العودة إلى هذا القسم.';$('sectionModal').hidden=false;pendingSectionMove=true}
$('staySectionBtn').onclick=()=>{$('sectionModal').hidden=true;pendingSectionMove=false};
$('moveSectionBtn').onclick=()=>{$('sectionModal').hidden=true;pendingSectionMove=false;goNextSection(true)};
$('nextBtn').onclick=()=>{if(current<secEnd()){current++;render();return}if(!simFull() || current===95)confirmFinish();else openSectionEndModal()};
const __goNext=goNextSection;goNextSection=function(auto=false){if(!simFull()){confirmFinish();return;}if(auto){sectionIndex++;if(sectionIndex>=4){finish();return}current=sectionIndex*24;sectionSeconds=1500;sectionDeadline=Date.now()+1500000;warned5=false;warned1=false;render();persistSession();showTimeWarning(`بدأ القسم ${sectionIndex+1} من 4 — أمامك 25 دقيقة`);return}openSectionEndModal()};
function advanceExpiredSections(){
  if(!simFull())return;
  const now=Date.now();
  while(sectionIndex<3 && sectionDeadline<=now){
    sectionIndex++;
    current=sectionIndex*24;
    sectionDeadline+=1500000;
  }
  sectionSeconds=Math.max(0,Math.ceil((sectionDeadline-now)/1000));
  render();persistSession();
}
startTimer=function(){
  clearInterval(timerRef);
  const paint=()=>{
    const now=Date.now();
    seconds=Math.max(0,Math.ceil((totalDeadline-now)/1000));
    sectionSeconds=Math.max(0,Math.ceil((sectionDeadline-now)/1000));
    $('timer').textContent=fmt(seconds);$('sectionTimer').textContent=fmt(sectionSeconds);
    $('timer').style.color=seconds<=120?'#ffd1cc':'';$('sectionTimer').style.color=sectionSeconds<=60?'#ffd1cc':'';
    $('sectionTimer').classList.toggle('timerPulse',sectionSeconds<=60);
  };
  const tick=()=>{
    paint();
    if(seconds<=0){clearInterval(timerRef);finish();return}
    if(simFull()){
      if(sectionSeconds<=300&&!warned5){warned5=true;showTimeWarning('تبقّى 5 دقائق على انتهاء القسم')}
      if(sectionSeconds<=60&&!warned1){warned1=true;showTimeWarning('تبقّت دقيقة واحدة على انتهاء القسم',true)}
      if(sectionSeconds<=0){
        if(sectionIndex>=3){clearInterval(timerRef);finish();return}
        showTimeWarning('انتهى وقت القسم — سيتم الانتقال تلقائيًا',true);
        sectionIndex++;current=sectionIndex*24;sectionDeadline=Date.now()+1500000;
        warned5=false;warned1=false;render();persistSession();
      }
    }
  };
  tick();timerRef=setInterval(tick,1000);
};

// حماية جلسة الاختبار من التحديث أو الإغلاق العرضي.
const SESSION_KEY='qudrat_active_session_v25';
function persistSession(){
  if(!attemptId||!questions.length)return;
  try{localStorage.setItem(SESSION_KEY,JSON.stringify({sessionVersion:25,attemptId,questions,current,answers,flags,seconds,sectionSeconds,sectionIndex,devQuick,totalDeadline,sectionDeadline,ts:Date.now()}))}catch{}
}
function clearSession(){try{localStorage.removeItem(SESSION_KEY)}catch{}}
window.addEventListener('beforeunload',e=>{if(attemptId&&!finishing){persistSession();e.preventDefault();e.returnValue=''}});
document.addEventListener('visibilitychange',()=>{if(document.hidden)persistSession()});
setInterval(()=>{if(attemptId&&!finishing)persistSession()},5000);

start();
