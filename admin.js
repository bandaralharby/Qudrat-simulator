const {createClient}=supabase;
const db=createClient(window.SUPABASE_URL,window.SUPABASE_PUBLISHABLE_KEY);
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
let skills=[],questions=[],questionPage=0;const pageSize=20;

document.addEventListener('DOMContentLoaded',init);
async function init(){
  $('today').textContent=new Intl.DateTimeFormat('ar-SA',{dateStyle:'full'}).format(new Date());
  bindEvents();
  const {data:{session}}=await db.auth.getSession();
  if(session)await enterDashboard(session);else showAuth();
}

function bindEvents(){
  $('loginForm').onsubmit=login;
  $('firstAccountBtn').onclick=createFirstAccount;
  $('logoutBtn').onclick=async()=>{await db.auth.signOut();location.reload()};
  $('menuButton').onclick=()=>$('sidebar').classList.toggle('open');
  document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>openView(b.dataset.view));
  document.querySelectorAll('[data-open-view]').forEach(b=>b.onclick=()=>openView(b.dataset.openView));
  $('addQuestionBtn').onclick=()=>openQuestionDialog();
  $('quickAddQuestion').onclick=()=>{openView('questions');openQuestionDialog()};
  $('closeDialog').onclick=$('cancelQuestion').onclick=()=> $('questionDialog').close();
  $('questionForm').onsubmit=saveQuestion;
  $('questionSection').onchange=fillSkillOptions;
  $('questionSearch').oninput=debounce(()=>{questionPage=0;loadQuestions()},300);
  $('sectionFilter').onchange=$('statusFilter').onchange=()=>{questionPage=0;loadQuestions()};
  $('prevPage').onclick=()=>{if(questionPage>0){questionPage--;loadQuestions()}};
  $('nextPage').onclick=()=>{questionPage++;loadQuestions()};
  $('refreshResults').onclick=loadResults;
}

function showAuth(){$('authScreen').hidden=false;$('app').hidden=true}
async function login(e){
  e.preventDefault();setMessage('authMessage','جارٍ تسجيل الدخول...');
  const {data,error}=await db.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});
  if(error)return setMessage('authMessage',friendlyAuthError(error.message));
  await enterDashboard(data.session);
}
async function createFirstAccount(){
  const email=$('email').value.trim(),password=$('password').value;
  if(!email||password.length<8)return setMessage('authMessage','أدخل البريد وكلمة مرور لا تقل عن 8 أحرف.');
  setMessage('authMessage','جارٍ إنشاء الحساب...');
  const {data,error}=await db.auth.signUp({email,password});
  if(error)return setMessage('authMessage',friendlyAuthError(error.message));
  if(data.session)await enterDashboard(data.session);else setMessage('authMessage','تم إنشاء الحساب. افتح رسالة التأكيد في بريدك ثم سجّل الدخول.',true);
}
async function enterDashboard(session){
  const {data,error}=await db.rpc('owner_dashboard_summary');
  if(error||!data){await db.auth.signOut();showAuth();return setMessage('authMessage','هذا الحساب غير مخوّل للدخول إلى لوحة المالك.');}
  $('authScreen').hidden=true;$('app').hidden=false;$('ownerEmail').textContent=session.user.email||'حساب المالك';
  paintSummary(data);
  await Promise.all([loadSkills(),loadQuestions(),loadResults()]);
}
function paintSummary(s){
  $('statQuestions').textContent=s.questions_total??0;$('statPublished').textContent=s.questions_published??0;
  $('statAttempts').textContent=s.attempts_completed??0;$('statAverage').textContent=`${s.average_score??0}%`;
  $('draftCount').textContent=s.questions_draft??0;$('userCount').textContent=s.users_total??0;$('allAttemptCount').textContent=s.attempts_total??0;
  const pct=s.questions_total?Math.round(100*s.questions_published/s.questions_total):0;
  $('publishedProgress').value=pct;$('publishedLabel').textContent=`${s.questions_published??0} من ${s.questions_total??0} (${pct}٪)`;
}
function openView(name){
  const titles={dashboard:'نظرة عامة',questions:'بنك الأسئلة',results:'نتائج الطلاب'};
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.querySelectorAll('.navItem').forEach(v=>v.classList.toggle('active',v.dataset.view===name));
  $(`${name}View`).classList.add('active');$('viewTitle').textContent=titles[name];$('sidebar').classList.remove('open');
}
async function loadSkills(){
  const {data,error}=await db.from('skills').select('id,section,name_ar').order('section').order('name_ar');
  if(error)return toast('تعذر تحميل المهارات');skills=data||[];fillSkillOptions();
}
function fillSkillOptions(){
  const section=$('questionSection').value,current=$('questionSkill').value;
  $('questionSkill').innerHTML=skills.filter(s=>s.section===section).map(s=>`<option value="${s.id}">${esc(s.name_ar)}</option>`).join('');
  if([...$('questionSkill').options].some(o=>o.value===current))$('questionSkill').value=current;
}
async function loadQuestions(){
  let query=db.from('questions').select('id,section,skill_id,difficulty,question_text,choices,correct_answer,explanation,status,skills(name_ar)',{count:'exact'}).order('updated_at',{ascending:false}).range(questionPage*pageSize,questionPage*pageSize+pageSize-1);
  const text=$('questionSearch').value.trim(),section=$('sectionFilter').value,status=$('statusFilter').value;
  if(text)query=query.ilike('question_text',`%${text}%`);if(section)query=query.eq('section',section);if(status)query=query.eq('status',status);
  const {data,count,error}=await query;if(error){toast('تعذر تحميل الأسئلة');return}
  questions=data||[];renderQuestions();$('pageLabel').textContent=`صفحة ${questionPage+1} — ${count??0} سؤال`;
  $('prevPage').disabled=questionPage===0;$('nextPage').disabled=(questionPage+1)*pageSize>=(count??0);
}
function renderQuestions(){
  $('questionsTable').innerHTML=questions.map(q=>`<tr><td class="questionCell" title="${esc(q.question_text)}">${esc(q.question_text)}</td><td>${q.section==='quantitative'?'كمي':'لفظي'}</td><td>${esc(q.skills?.name_ar||'—')}</td><td>${difficultyLabel(q.difficulty)}</td><td><span class="pill ${q.status}">${statusLabel(q.status)}</span></td><td><div class="rowActions"><button data-edit="${q.id}">تعديل</button><button class="delete" data-delete="${q.id}">حذف</button></div></td></tr>`).join('');
  $('questionsEmpty').hidden=questions.length>0;
  document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>openQuestionDialog(questions.find(q=>String(q.id)===b.dataset.edit)));
  document.querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>deleteQuestion(b.dataset.delete));
}
function openQuestionDialog(q=null){
  $('questionForm').reset();$('questionId').value=q?.id||'';$('dialogTitle').textContent=q?'تعديل السؤال':'إضافة سؤال';
  $('questionText').value=q?.question_text||'';$('questionSection').value=q?.section||'quantitative';fillSkillOptions();
  if(q)$('questionSkill').value=q.skill_id;$('questionDifficulty').value=q?.difficulty||'medium';$('questionStatus').value=q?.status||'draft';$('questionExplanation').value=q?.explanation||'';
  const choices=q?.choices?.length?q.choices:['','','',''];$('choicesGrid').innerHTML=choices.slice(0,5).map((c,i)=>`<label class="choiceInput"><input type="radio" name="correctChoice" value="${i}" ${q?.correct_answer===c?'checked':''} required><input class="choiceText" value="${esc(c)}" placeholder="الخيار ${['أ','ب','ج','د','هـ'][i]}" required></label>`).join('');
  setMessage('questionMessage','');$('questionDialog').showModal();
}
async function saveQuestion(e){
  e.preventDefault();const choiceInputs=[...document.querySelectorAll('.choiceText')],choices=choiceInputs.map(i=>i.value.trim());
  const correctIndex=Number(document.querySelector('[name=correctChoice]:checked')?.value);
  if(new Set(choices).size!==choices.length)return setMessage('questionMessage','يجب ألا تتكرر الخيارات.');
  const payload={section:$('questionSection').value,skill_id:Number($('questionSkill').value),difficulty:$('questionDifficulty').value,question_text:$('questionText').value.trim(),choices,correct_answer:choices[correctIndex],explanation:$('questionExplanation').value.trim(),status:$('questionStatus').value,updated_at:new Date().toISOString()};
  $('saveQuestion').disabled=true;const id=$('questionId').value;
  const {error}=id?await db.from('questions').update(payload).eq('id',id):await db.from('questions').insert(payload);
  $('saveQuestion').disabled=false;if(error)return setMessage('questionMessage',`تعذر الحفظ: ${error.message}`);
  $('questionDialog').close();toast(id?'تم تحديث السؤال':'تمت إضافة السؤال');await refreshAll();
}
async function deleteQuestion(id){
  if(!confirm('هل تريد حذف هذا السؤال نهائيًا؟ إذا استُخدم في محاولة سابقة فقد يتعذر حذفه.'))return;
  const {error}=await db.from('questions').delete().eq('id',id);if(error)return toast(`تعذر الحذف: ${error.message}`);
  toast('تم حذف السؤال');await refreshAll();
}
async function loadResults(){
  const {data,error}=await db.from('exam_attempts').select('id,exam_type,started_at,completed_at,score,quantitative_score,verbal_score').order('started_at',{ascending:false}).limit(100);
  if(error){toast('تعذر تحميل النتائج');return}
  $('resultsTable').innerHTML=(data||[]).map(r=>`<tr><td>${formatDate(r.started_at)}</td><td>${examTypeLabel(r.exam_type)}</td><td><b>${r.score==null?'—':`${Math.round(r.score)}%`}</b></td><td>${r.quantitative_score==null?'—':`${Math.round(r.quantitative_score)}%`}</td><td>${r.verbal_score==null?'—':`${Math.round(r.verbal_score)}%`}</td><td><span class="pill ${r.completed_at?'completed':'inProgress'}">${r.completed_at?'مكتملة':'غير مكتملة'}</span></td></tr>`).join('');
  $('resultsEmpty').hidden=(data||[]).length>0;
}
async function refreshAll(){const {data}=await db.rpc('owner_dashboard_summary');if(data)paintSummary(data);await loadQuestions()}
function setMessage(id,text,success=false){$(id).textContent=text;$(id).classList.toggle('success',success)}
function friendlyAuthError(m){if(/Invalid login credentials/i.test(m))return 'البريد أو كلمة المرور غير صحيحة.';if(/already registered/i.test(m))return 'الحساب موجود بالفعل؛ استخدم تسجيل الدخول.';return m}
function statusLabel(v){return({published:'منشور',draft:'مسودة',archived:'مؤرشف'})[v]||v}
function difficultyLabel(v){return({easy:'سهل',medium:'متوسط',hard:'صعب'})[v]||v}
function examTypeLabel(v){return({mock:'محاكاة كاملة',placement:'تحديد مستوى',training:'تدريب'})[v]||v}
function formatDate(v){return new Intl.DateTimeFormat('ar-SA',{dateStyle:'medium',timeStyle:'short'}).format(new Date(v))}
function toast(text){$('toast').textContent=text;$('toast').classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>$('toast').classList.remove('show'),2800)}
function debounce(fn,delay){let t;return(...args)=>{clearTimeout(t);t=setTimeout(()=>fn(...args),delay)}}

