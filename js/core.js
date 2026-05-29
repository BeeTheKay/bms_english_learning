const LENGTH_RANGES = { short:[8,10], medium:[15,18], long:[25,30] };
const TYPE_LABELS = {
  mc:'Multiple Choice', fill:'Fill in the Blank',
  word_form:'Word Formation', transform:'Key Word Transformation',
  tf:'True / False / Not Mentioned', error:'Error Correction'
};
const MC_KEYS = ['1','2','3','4'];
const MC_HOME = ['a','s','d','f'];

function loadProgress(){
  try{ return JSON.parse(localStorage.getItem('bms_eng_progress')||'{"questions":{},"sessions":[]}'); }
  catch(e){ return {questions:{},sessions:[]}; }
}

let state = {
  screen:'start',
  testLength:'medium',
  session:[],
  idx:0,
  answers:[],
  answered:false,
  progress:loadProgress()
};

function saveProgress(){
  localStorage.setItem('bms_eng_progress',JSON.stringify(state.progress));
}

function getQP(id){
  return state.progress.questions[id] || {attempts:0,correct:0,ease:2.5,lastShown:0};
}

function updateQP(id,wasCorrect){
  const p = getQP(id);
  p.attempts++;
  if(wasCorrect) p.correct++;
  p.ease = wasCorrect ? Math.min(3.5, p.ease+0.1) : Math.max(1.3, p.ease-0.2);
  p.lastShown = Date.now();
  state.progress.questions[id] = p;
  saveProgress();
}

function weight(id){
  const p = getQP(id);
  if(p.attempts===0) return 2.0;
  let w = 1.0;
  const acc = p.correct/p.attempts;
  if(acc < 0.5) w *= 3.0;
  if(p.correct >= 3 && acc >= 0.8) w *= 0.3;
  const hrs = (Date.now()-p.lastShown)/3600000;
  w *= Math.min(1.5, hrs/24 + 0.1);
  return Math.max(0.1, w);
}

function pickQuestions(n){
  const pool = QUESTIONS.map(q=>({q,w:weight(q.id)}));
  const result=[];
  while(result.length<n && pool.length>0){
    const total=pool.reduce((s,x)=>s+x.w,0);
    let r=Math.random()*total;
    for(let i=0;i<pool.length;i++){
      r-=pool[i].w;
      if(r<=0){ result.push(pool[i].q); pool.splice(i,1); break; }
    }
  }
  return result;
}

function targetLen(){
  const [lo,hi]=LENGTH_RANGES[state.testLength];
  return lo+Math.floor(Math.random()*(hi-lo+1));
}

function normalise(s){ return s.trim().toLowerCase().replace(/['']/g,"'").replace(/[.,!?;:]+$/,''); }

function checkAnswer(q,userAns){
  const u=normalise(userAns);
  if(q.type==='tf'){
    return u!=='' && normalise(q.answer)===u;
  }
  if(q.type==='error'){
    const parts=userAns.split('|||');
    const userWrong=normalise(parts[0]||'');
    const userFix=normalise(parts[1]||'');
    if(!userWrong) return false;
    const wrongOk=userWrong===normalise(q.answer)||(q.alternates||[]).some(a=>normalise(a)===userWrong);
    const validFixes=[q.correction||'',...(q.correctionAlternates||[])].map(normalise);
    return wrongOk && validFixes.includes(userFix);
  }
  if(!u) return false;
  if(q.type==='transform' && q.gapAnswer){
    if(normalise(q.gapAnswer)===u) return true;
    return (q.gapAlternates||[]).some(a=>normalise(a)===u);
  }
  if(normalise(q.answer)===u) return true;
  return (q.alternates||[]).some(a=>normalise(a)===u);
}

function isDark(){ return document.body.classList.contains('dark'); }

function toggleDark(){
  document.body.classList.toggle('dark');
  localStorage.setItem('bms_dark', isDark()?'1':'0');
  document.querySelectorAll('.dark-toggle').forEach(b=>{ b.textContent=isDark()?'☀':'☾'; });
}

function initDark(){
  if(localStorage.getItem('bms_dark')==='1') document.body.classList.add('dark');
}
