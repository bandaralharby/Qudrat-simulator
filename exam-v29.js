// Qudrat simulator V15 — cleaned build. Legacy shadowed timer/dot implementations removed.
const {createClient}=supabase;
const db=createClient(window.SUPABASE_URL,window.SUPABASE_PUBLISHABLE_KEY);
let attemptId=null,questions=[],current=0,answers={},flags={},seconds=6000,sectionSeconds=3000,timerRef=null,finishing=false,fontScale=1,activeSection='quantitative',sectionIndex=0,devQuick=false,totalDeadline=0,sectionDeadline=0;
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
    // V27: امسح أي جلسة قديمة من الإصدارات السابقة نهائيًا.
    for(let i=localStorage.length-1;i>=0;i--){
      const k=localStorage.key(i);
      if(k && k.startsWith('qudrat_active_session_') && k!=='qudrat_active_session_v29') localStorage.removeItem(k);
    }
    // عند الدخول من الصفحة الرئيسية نبدأ محاولة جديدة ولا نعيد اختبارًا قديمًا.
    if(params.get('fresh')==='1') localStorage.removeItem('qudrat_active_session_v29');

    // استعادة المحاولة فقط إذا كانت من نفس نسخة الاختبار ونفس عدد الأسئلة.
    // أي جلسة قديمة (مثل اختبار 90 سؤالًا) تُلغى حتى لا تظهر بعد التحديث.
    try{
      const saved=JSON.parse(localStorage.getItem('qudrat_active_session_v29')||'null');
      if(saved?.attemptId && saved?.sessionVersion===29 && Array.isArray(saved.questions) && saved.questions.length===expectedTotal){
        attemptId=saved.attemptId; questions=saved.questions; current=Number(saved.current)||0;
        answers=saved.answers||{}; flags=saved.flags||{}; sectionIndex=Number(saved.sectionIndex)||0; devQuick=!!saved.devQuick;
        // نعتمد على وقت نهاية ثابت، لذلك يستمر العد حتى لو غادر الطالب الصفحة أو أغلقها.
        totalDeadline=Number(saved.totalDeadline)||((Number(saved.ts)||Date.now())+(Number(saved.seconds)||6000)*1000);
        sectionDeadline=Number(saved.sectionDeadline)||((Number(saved.ts)||Date.now())+(Number(saved.sectionSeconds)||3000)*1000);
        seconds=Math.max(0,Math.ceil((totalDeadline-Date.now())/1000));
        sectionSeconds=Math.max(0,Math.ceil((sectionDeadline-Date.now())/1000));
        activeSection=questions[current]?.section||'quantitative';
        render();
        if(seconds<=0){finish();return;}
        if(simFull() && sectionSeconds<=0){advanceExpiredSections();}
        startTimer(); $('status').textContent='تمت استعادة الاختبار والوقت مستمر منذ مغادرة الصفحة';
        return;
      }
      localStorage.removeItem('qudrat_active_session_v29');
    }catch{ localStorage.removeItem('qudrat_active_session_v29'); }
    // تنظيف مفاتيح الجلسات القديمة نهائيًا.
    localStorage.removeItem('qudrat_active_session_v10');
    localStorage.removeItem('qudrat_active_session_v25');
    const total=expectedTotal;
    const requestedMinutes=Number(params.get('minutes')||(free?10:(total===96?100:20)));
    seconds=Math.max(60,Math.round((Number.isFinite(requestedMinutes)?requestedMinutes:20)*60));
    sectionSeconds=total===96?3000:seconds;
    totalDeadline=Date.now()+seconds*1000;
    sectionDeadline=Date.now()+sectionSeconds*1000;
    const examType=params.get('type')||((total===96)?'mock':'placement');
    const {data,error}=await db.rpc('start_exam',{p_exam_type:examType,p_total:total});
    if(error)throw error;
    attemptId=data.attempt_id;
    const raw=data.questions||[];
    if(raw.length!==total) throw new Error(`عدد الأسئلة المستلم ${raw.length} بدل ${total}. لن يتم تشغيل اختبار ناقص.`);
    const quant=raw.filter(q=>q.section==='quantitative'), verbal=raw.filter(q=>q.section==='verbal');
    questions=total===96?[...quant.slice(0,48),...verbal.slice(0,48)]:raw;
    if(total===96 && questions.length!==96) throw new Error('تعذر تجهيز 96 سؤالًا كاملة.');
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
    b.innerHTML='<b class="answerLetter"></b><span></span>';
    b.querySelector('.answerLetter').textContent=letters[i]||'';
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
$('endBottomBtn').onclick=confirmFinish;
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
  finishing=true;
  clearInterval(timerRef);
  // الإنهاء محليًا فورًا: لا تسمح باستعادة الاختبار بعد ضغط الزر حتى لو تأخر الاتصال.
  clearSession();
  document.body.classList.add('loading');
  $('status').textContent='جارٍ إنهاء الاختبار وإظهار النتيجة...';
  const rpcFinish=()=>db.rpc('finish_exam',{p_attempt_id:attemptId});
  const withTimeout=(promise,ms)=>Promise.race([
    promise,
    new Promise((_,reject)=>setTimeout(()=>reject(new Error('انتهت مهلة الاتصال')),ms))
  ]);
  try{
    let response=await withTimeout(rpcFinish(),12000);
    if(response.error) throw response.error;
    localStorage.setItem('qudrat_result',JSON.stringify(response.data));
    location.replace('results.html?v=30');
  }catch(firstError){
    console.error(firstError);
    try{
      const response=await withTimeout(rpcFinish(),12000);
      if(response.error) throw response.error;
      localStorage.setItem('qudrat_result',JSON.stringify(response.data));
      location.replace('results.html?v=30');
    }catch(e){
      console.error(e);
      // لا نعيد الاختبار المنتهي. نعطي المستخدم خيار إعادة محاولة جلب النتيجة فقط.
      finishing=false;
      document.body.classList.remove('loading');
      $('status').textContent='تم إيقاف الاختبار، لكن تعذر جلب النتيجة. اضغط إنهاء الاختبار لإعادة محاولة جلبها.';
    }
  }
}

// startTimer: implementation defined below with section timing.

function fmt(s){return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`}

// المحاكاة الكاملة: قسمان فقط — 48 كمي ثم 48 لفظي، 50 دقيقة لكل قسم.
function simFull(){return questions.length===96&&!devQuick}
function secStart(){return simFull()?sectionIndex*48:0}
function secEnd(){return simFull()?Math.min(secStart()+47,questions.length-1):questions.length-1}
function syncSection(){if(simFull())sectionIndex=current<48?0:1}
function goNextSection(auto=false){
  if(!simFull()||sectionIndex>=1){finish();return}
  if(!auto){openSectionEndModal();return}
  sectionIndex=1; current=48; sectionSeconds=3000; sectionDeadline=Date.now()+3000000;
  warned5=false;warned1=false;render();persistSession();showTimeWarning('بدأ القسم اللفظي — أمامك 50 دقيقة');
}

const _renderBase=render;
render=function(){syncSection();_renderBase();if(simFull()){
  const q=questions[current],local=current-secStart()+1;
  $('sectionLabel').textContent=`القسم ${sectionIndex+1} من 2 — ${sectionName(q.section)}`;
  $('panelSection').textContent=$('sectionLabel').textContent;
  $('topCounter').textContent=`${local} من 48`;$('counter').textContent=`السؤال ${local} من 48`;
  $('prevBtn').disabled=current===secStart();
  $('nextBtn').textContent=current===95?'إنهاء الاختبار':(current===47?'إنهاء القسم والانتقال →':'حفظ والتالي →');
  updateSectionStats();
}}
$('prevBtn').onclick=()=>{if(current>secStart()){current--;render()}};
$('nextBtn').onclick=()=>{if(current<secEnd()){current++;render();return}if(!simFull()||current===95)confirmFinish();else openSectionEndModal()};
// شاشة عرض جميع الأسئلة: يمكن تصفح القسمين ثم الرجوع لنفس السؤال بزر إغلاق.
let overviewSection=null;
function openQuestionsOverview(){
  overviewSection=questions[current]?.section||'quantitative';
  renderDots();
  if(innerWidth<=760)$('navigator').classList.add('open');
}
function closeQuestionsOverview(){
  $('navigator').classList.remove('open');
  overviewSection=null;
  render();
}
$('showAllBtn').onclick=openQuestionsOverview;
$('allQuestionsBtn').onclick=openQuestionsOverview;
$('closeNavigatorBtn').onclick=closeQuestionsOverview;
$('quantTab').onclick=()=>{overviewSection='quantitative';renderDots()};
$('verbalTab').onclick=()=>{overviewSection='verbal';renderDots()};
renderDots=function(){
  const host=$('dots');host.innerHTML='';
  const shown=overviewSection || (simFull()?questions[current]?.section:activeSection);
  $('quantTab').classList.toggle('active',shown==='quantitative');
  $('verbalTab').classList.toggle('active',shown==='verbal');
  const rows=questions.map((q,i)=>({q,i})).filter(x=>x.q.section===shown);
  rows.forEach(({q,i},j)=>{
    const e=document.createElement('button');e.type='button';e.textContent=j+1;
    if(answers[q.id]!=null)e.classList.add('answered');if(flags[q.id])e.classList.add('flagged');if(i===current)e.classList.add('current');
    e.onclick=()=>{current=i;activeSection=q.section;overviewSection=null;render();closeNavigatorMobile()};host.appendChild(e)
  });
};

let warned5=false,warned1=false,pendingSectionMove=false;
function showTimeWarning(text,urgent=false){const w=$('timeWarning');if(!w)return;w.textContent=text;w.hidden=false;w.classList.toggle('urgent',urgent);clearTimeout(showTimeWarning._t);showTimeWarning._t=setTimeout(()=>w.hidden=true,4500)}
function updateSectionStats(){if(!simFull())return;const part=questions.slice(secStart(),secEnd()+1),done=part.filter(q=>answers[q.id]!=null).length,flagged=part.filter(q=>flags[q.id]).length;$('status').textContent=`القسم ${sectionIndex+1} من 2 — تمت الإجابة عن ${done} من 48${flagged?` — ${flagged} للمراجعة`:''}`;}
function openSectionEndModal(){const part=questions.slice(secStart(),secEnd()+1),u=part.filter(q=>answers[q.id]==null).length,f=part.filter(q=>flags[q.id]).length;$('sectionModalTitle').textContent=`إنهاء القسم ${sectionIndex+1} من 2`;$('sectionModalText').textContent=(u?`لديك ${u} سؤال غير مجاب. `:'جميع أسئلة القسم مجابة. ')+(f?`ولديك ${f} سؤال محدد للمراجعة. `:'')+'بعد الانتقال لا يمكنك العودة إلى هذا القسم.';$('sectionModal').hidden=false;pendingSectionMove=true}
$('staySectionBtn').onclick=()=>{$('sectionModal').hidden=true;pendingSectionMove=false};
$('moveSectionBtn').onclick=()=>{$('sectionModal').hidden=true;pendingSectionMove=false;goNextSection(true)};
function advanceExpiredSections(){
  if(!simFull())return; const now=Date.now();
  if(sectionIndex===0 && sectionDeadline<=now){sectionIndex=1;current=48;sectionDeadline+=3000000;}
  sectionSeconds=Math.max(0,Math.ceil((sectionDeadline-now)/1000));render();persistSession();
}
startTimer=function(){
  clearInterval(timerRef);
  const tick=()=>{
    const now=Date.now(); seconds=Math.max(0,Math.ceil((totalDeadline-now)/1000)); sectionSeconds=Math.max(0,Math.ceil((sectionDeadline-now)/1000));
    $('timer').textContent=fmt(seconds);$('sectionTimer').textContent=fmt(sectionSeconds);
    $('timer').style.color=seconds<=120?'#ffd1cc':'';$('sectionTimer').style.color=sectionSeconds<=60?'#ffd1cc':'';
    $('sectionTimer').classList.toggle('timerPulse',sectionSeconds<=60);
    if(seconds<=0){clearInterval(timerRef);finish();return}
    if(simFull()){
      if(sectionSeconds<=300&&!warned5){warned5=true;showTimeWarning('تبقّى 5 دقائق على انتهاء القسم')}
      if(sectionSeconds<=60&&!warned1){warned1=true;showTimeWarning('تبقّت دقيقة واحدة على انتهاء القسم',true)}
      if(sectionSeconds<=0){
        if(sectionIndex>=1){clearInterval(timerRef);finish();return}
        showTimeWarning('انتهى وقت القسم الكمي — سيتم الانتقال إلى اللفظي تلقائيًا',true);
        sectionIndex=1;current=48;sectionDeadline=Date.now()+3000000;warned5=false;warned1=false;render();persistSession();
      }
    }
  };
  tick();timerRef=setInterval(tick,1000);
};

// حماية جلسة الاختبار من التحديث أو الإغلاق العرضي.
const SESSION_KEY='qudrat_active_session_v29';
function persistSession(){
  if(!attemptId||!questions.length)return;
  try{localStorage.setItem(SESSION_KEY,JSON.stringify({sessionVersion:29,attemptId,questions,current,answers,flags,seconds,sectionSeconds,sectionIndex,devQuick,totalDeadline,sectionDeadline,ts:Date.now()}))}catch{}
}
function clearSession(){try{localStorage.removeItem(SESSION_KEY)}catch{}}
window.addEventListener('beforeunload',e=>{if(attemptId&&!finishing){persistSession();e.preventDefault();e.returnValue=''}});
document.addEventListener('visibilitychange',()=>{if(document.hidden)persistSession()});
setInterval(()=>{if(attemptId&&!finishing)persistSession()},5000);

start();
