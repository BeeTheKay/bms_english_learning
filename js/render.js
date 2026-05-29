function startTest(){
  state.session=pickQuestions(targetLen());
  state.idx=0; state.answers=[]; state.answered=false;
  state.screen='test';
  render();
}

function submitAnswer(q,userAns){
  if(state.answered) return;
  state.answered=true;
  const correct=checkAnswer(q,userAns);
  state.answers.push({id:q.id,correct,userAns,topic:q.topic});
  updateQP(q.id,correct);
  showFeedback(q,correct,userAns);
}

function nextQuestion(){
  state.idx++;
  state.answered=false;
  if(state.idx>=state.session.length){
    finishTest();
  } else {
    render();
    window.scrollTo(0,0);
  }
}

function finishTest(){
  const score=state.answers.filter(a=>a.correct).length;
  const total=state.answers.length;
  state.progress.sessions.push({
    date:Date.now(),score,total,
    topics:state.answers.filter(a=>!a.correct).map(a=>a.topic),
    wrong:state.answers.filter(a=>!a.correct).map(a=>{
      const q=QUESTIONS.find(x=>x.id===a.id);
      const correctAns=(q&&q.type==='transform'&&q.gapAnswer)?q.gapAnswer:q?q.answer:'?';
      return {id:a.id,topic:a.topic,userAns:a.userAns,correctAns};
    })
  });
  saveProgress();
  state.screen='summary';
  render();
  window.scrollTo(0,0);
}

function darkToggleBtn(){
  return `<button class="dark-toggle" id="darkToggle">${isDark()?'☀':'☾'}</button>`;
}

function render(){
  const app=document.getElementById('app');
  if(state.screen==='start') app.innerHTML=renderStart();
  else if(state.screen==='test') app.innerHTML=renderTest();
  else app.innerHTML=renderSummary();
  attachHandlers();
}

function renderLengthSelector(active){
  return `<div class="length-row">
    <button class="lbtn${active==='short'?' active':''}" data-len="short">Short<br><small>8–10 q</small></button>
    <button class="lbtn${active==='medium'?' active':''}" data-len="medium">Medium<br><small>15–18 q</small></button>
    <button class="lbtn${active==='long'?' active':''}" data-len="long">Long<br><small>25–30 q</small></button>
  </div>`;
}

function renderSessionHistory(sessions){
  return sessions.slice().reverse().map((s,si)=>{
    const d=new Date(s.date);
    const ds=d.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
    const wrongItems=(s.wrong||[]).map(w=>{
      const q=QUESTIONS.find(x=>x.id===w.id);
      const qText=q?q.question.split('\nKEY WORD:')[0]:'?';
      const short=qText.length>72?qText.slice(0,69)+'…':qText;
      return `<div style="padding:5px 0;border-bottom:1px solid var(--border3);font-size:.78rem;font-family:Arial,sans-serif">
        <div style="font-style:italic;color:var(--text2)">${esc(short)}</div>
        <div style="display:flex;gap:14px;margin-top:2px;flex-wrap:wrap">
          <span>You: <span style="color:var(--red)">${w.userAns?esc(w.userAns):'—'}</span></span>
          <span>Correct: <span style="color:var(--green)">${esc(w.correctAns||'?')}</span></span>
        </div>
      </div>`;
    }).join('');
    const detailId=`sh-d-${si}`;
    return `<div style="padding:10px 0;border-bottom:1px solid var(--border3)">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span style="font-size:.83rem;font-family:Arial,sans-serif;color:var(--muted)">${ds}</span>
        <span style="font-size:.9rem;font-family:Arial,sans-serif;font-weight:bold;color:var(--text)">${s.score}/${s.total} &nbsp;<span style="font-weight:normal;color:var(--muted)">(${Math.round(s.score/s.total*100)}%)</span></span>
      </div>
      ${wrongItems
        ?`<button onclick="var el=document.getElementById('${detailId}');var open=el.style.display!=='none';el.style.display=open?'none':'block';this.textContent=open?'▶ ${(s.wrong||[]).length} mistake${(s.wrong||[]).length!==1?'s':''}':'▼ ${(s.wrong||[]).length} mistake${(s.wrong||[]).length!==1?'s':''}'" style="margin-top:5px;font-size:.72rem;color:var(--muted2);background:none;border:none;cursor:pointer;font-family:Arial,sans-serif;padding:0">▶ ${(s.wrong||[]).length} mistake${(s.wrong||[]).length!==1?'s':''}</button>
         <div id="${detailId}" style="display:none;margin-top:4px">${wrongItems}</div>`
        :`<div style="font-size:.72rem;color:var(--green);font-family:Arial,sans-serif;margin-top:4px">No mistakes</div>`
      }
    </div>`;
  }).join('');
}

function renderStart(){
  const sessions=state.progress.sessions;
  const last=sessions.length>0?sessions[sessions.length-1]:null;
  const totalQ=Object.values(state.progress.questions);
  const totalAtt=totalQ.reduce((s,p)=>s+p.attempts,0);
  const totalCor=totalQ.reduce((s,p)=>s+p.correct,0);
  const overallAcc=totalAtt>0?Math.round(totalCor/totalAtt*100):null;

  let statsHtml='';
  let historyPanel='';
  if(sessions.length>0){
    statsHtml=`<div class="stats-row">
      <div class="stat-box" id="sessionsBox" style="cursor:pointer;border:2px solid var(--border2);transition:border-color .15s" title="Click to view session history">
        <span class="stat-num">${sessions.length}</span>
        <span class="stat-lbl" id="sessLbl">Sessions ▾</span>
      </div>
      <div class="stat-box"><span class="stat-num">${last?Math.round(last.score/last.total*100)+'%':'—'}</span><span class="stat-lbl">Last Score</span></div>
      <div class="stat-box"><span class="stat-num">${overallAcc!==null?overallAcc+'%':'—'}</span><span class="stat-lbl">Overall Acc.</span></div>
    </div>`;
    historyPanel=`<div id="sessHistWrap" style="display:none;margin-bottom:16px">
      <div class="card" style="padding:14px 18px;margin-bottom:0">
        <h2 style="margin-bottom:10px">All Sessions</h2>
        ${renderSessionHistory(sessions)}
      </div>
    </div>`;
  }

  return `<div class="header-bar">
    <div><h1>BMS English Practice</h1><span class="sub" style="margin:0">Cambridge A2–B1</span></div>
    <div class="hdr-right">${darkToggleBtn()}</div>
  </div>
  <p style="font-size:.9rem;color:var(--muted);margin-bottom:20px;font-family:Arial,sans-serif">Questions drawn from your BMS corpus: tenses, verb patterns, phrasal verbs, collocations, word formation, and reading comprehension. Weak topics appear more often.</p>
  ${renderLengthSelector(state.testLength)}
  ${statsHtml}
  ${historyPanel}
  <button class="btn-primary" id="startBtn">Start Test</button>`;
}

function renderTest(){
  const q=state.session[state.idx];
  const n=state.session.length;
  const pct=Math.round((state.idx/n)*100);

  let body='';
  if(q.type==='mc') body=renderMC(q);
  else if(q.type==='fill') body=renderFill(q);
  else if(q.type==='word_form') body=renderWordForm(q);
  else if(q.type==='transform') body=renderTransform(q);
  else if(q.type==='tf') body=renderTF(q);
  else if(q.type==='error') body=renderError(q);

  return `<div class="header-bar">
    <h1>BMS English Practice</h1>
    <div class="hdr-right">
      ${darkToggleBtn()}
      <button id="quitBtn" style="font-size:.78rem;color:var(--muted);background:none;border:none;cursor:pointer;font-family:Arial,sans-serif">✕ Quit</button>
    </div>
  </div>
  <div class="progress-wrap"><div class="progress-fill" style="width:${pct}%"></div></div>
  <div class="q-counter">Question ${state.idx+1} of ${n}</div>
  <div class="card">
    <div class="type-tag">${TYPE_LABELS[q.type]}</div>
    ${body}
  </div>`;
}

function showAnsWrap(){
  return `<div id="showAnsWrap"><button class="show-ans-btn" id="showAnsBtn">Show Answer</button></div>`;
}

function renderMC(q){
  const keys=['1','2','3','4'];
  const opts=q.options.map((o,i)=>`<button class="mc-opt" data-opt="${i}" data-val="${esc(o)}"><span class="mc-key">${keys[i]}</span>${esc(o)}</button>`).join('');
  return `<p class="q-text">${esc(q.question)}</p>
  <div class="mc-opts" id="mcOpts">${opts}</div>
  <p class="kbd-hint">Keys: 1–4 or A / S / D / F</p>
  ${showAnsWrap()}
  <div id="feedback"></div>
  <div id="nextWrap"></div>`;
}

function renderFill(q){
  const hasVerbHint=/\([a-z]+\)/i.test(q.question);
  const instruction=hasVerbHint
    ?`<p style="font-size:.8rem;color:var(--muted);font-family:Arial,sans-serif;margin-bottom:10px;font-style:italic">Write the verb in (brackets) in the correct form.</p>`
    :`<p style="font-size:.8rem;color:var(--muted);font-family:Arial,sans-serif;margin-bottom:10px;font-style:italic">Fill in the missing word.</p>`;
  return `<p class="q-text">${esc(q.question)}</p>
  ${instruction}
  <div class="input-row">
    <input class="t-input" id="ansInput" type="text" placeholder="Your answer…" autocomplete="off" spellcheck="false">
    <button class="check-btn" id="checkBtn">Check</button>
  </div>
  ${showAnsWrap()}
  <div id="feedback"></div>
  <div id="nextWrap"></div>`;
}

function renderWordForm(q){
  const display=esc(q.question).replace(/\[([^\]]+)\]/g,'<span class="root">[$1]</span>');
  return `<p class="q-text">${display}</p>
  <p style="font-size:.8rem;color:var(--muted);font-family:Arial,sans-serif;margin-bottom:10px;font-style:italic">Write the correct form of the word in brackets. The answer may be negative.</p>
  <div class="input-row">
    <input class="t-input" id="ansInput" type="text" placeholder="Correct form…" autocomplete="off" spellcheck="false">
    <button class="check-btn" id="checkBtn">Check</button>
  </div>
  ${showAnsWrap()}
  <div id="feedback"></div>
  <div id="nextWrap"></div>`;
}

function renderTransform(q){
  const parts=q.question.split('\nKEY WORD: ');
  const sentence=parts[0]||q.question;
  const kw=parts[1]||'';

  let inputArea;
  if(q.prefix!==undefined){
    const pre=q.prefix?`<span>${esc(q.prefix)}</span>`:'';
    const suf=q.suffix?`<span>${esc(q.suffix)}</span>`:'';
    inputArea=`<p class="transform-note" style="margin-top:10px">Fill in the gap using the key word (2–5 words). Do not change the key word itself.</p>
    <div class="gap-row">
      ${pre}
      <input class="t-input" id="ansInput" type="text" placeholder="…" autocomplete="off" spellcheck="false">
      ${suf}
    </div>
    <button class="check-btn" id="checkBtn" style="margin-bottom:14px">Check</button>`;
  } else {
    inputArea=`<p class="transform-note" style="margin-top:10px">Rewrite the sentence using the key word. Do not change the key word itself.</p>
    <div class="input-row">
      <input class="t-input" id="ansInput" type="text" placeholder="Your rewritten sentence…" autocomplete="off" spellcheck="false">
      <button class="check-btn" id="checkBtn">Check</button>
    </div>`;
  }

  return `<p class="q-text">${esc(sentence)}</p>
  ${kw?`<p class="key-word-label">Key word</p><p style="margin-bottom:10px"><span class="key-word">${esc(kw)}</span></p>`:''}
  ${inputArea}
  ${showAnsWrap()}
  <div id="feedback"></div>
  <div id="nextWrap"></div>`;
}

function renderTF(q){
  return `<div class="passage">${esc(q.passage)}</div>
  <p class="q-text">${esc(q.question)}</p>
  <div class="tf-row" id="tfRow">
    <button class="tf-btn" data-val="True"><span class="mc-key">T</span>True</button>
    <button class="tf-btn" data-val="False"><span class="mc-key">F</span>False</button>
    <button class="tf-btn" data-val="Not Mentioned"><span class="mc-key">N</span>Not Mentioned</button>
  </div>
  ${showAnsWrap()}
  <div id="feedback"></div>
  <div id="nextWrap"></div>`;
}

function renderError(q){
  const deleteNote = q.correction==='' ? ' Leave the second field empty if the word should be deleted.' : '';
  return `<p class="error-instruction">Find the incorrect word or phrase and write what it should be.${deleteNote}</p>
  <p class="q-text">${esc(q.question)}</p>
  <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:14px">
    <div style="display:flex;align-items:center;gap:8px">
      <span style="font-size:.78rem;color:var(--muted);font-family:Arial,sans-serif;white-space:nowrap;min-width:100px">Incorrect:</span>
      <input class="t-input" id="errWrong" type="text" placeholder="Wrong word or phrase…" autocomplete="off" spellcheck="false" style="margin:0">
    </div>
    <div style="display:flex;align-items:center;gap:8px">
      <span style="font-size:.78rem;color:var(--muted);font-family:Arial,sans-serif;white-space:nowrap;min-width:100px">Should be:</span>
      <input class="t-input" id="errFix" type="text" placeholder="${q.correction===''?'(leave blank — delete it)':'Corrected form…'}" autocomplete="off" spellcheck="false" style="margin:0">
      <button class="check-btn" id="checkBtn">Check</button>
    </div>
  </div>
  ${showAnsWrap()}
  <div id="feedback"></div>
  <div id="nextWrap"></div>`;
}

function showFeedback(q,correct,userAns){
  const saw=document.getElementById('showAnsWrap');
  if(saw) saw.innerHTML='';

  const fb=document.getElementById('feedback');
  const nw=document.getElementById('nextWrap');
  const isLast=state.idx>=state.session.length-1;
  const nextLabel=isLast?'See Results →':'Next Question →';

  let displayAns;
  if(q.type==='transform' && q.gapAnswer){
    displayAns=`"${esc(q.gapAnswer)}" → ${esc(q.answer)}`;
  } else if(q.type==='error'){
    const corrDisplay=q.correction===''?'(delete)':esc(q.correction);
    displayAns=`${esc(q.answer)} → ${corrDisplay}`;
  } else {
    displayAns=esc(q.answer);
  }

  if(correct){
    fb.innerHTML=`<div class="feedback correct"><strong>✓ Correct!</strong>${q.hint?`<span>${esc(q.hint)}</span>`:''}</div>`;
  } else {
    fb.innerHTML=`<div class="feedback wrong"><strong>✗ Incorrect.</strong> Correct answer: <em>${displayAns}</em>${q.hint?`<br><span style="margin-top:4px;display:block">${esc(q.hint)}</span>`:''}</div>`;
  }
  nw.innerHTML=`<button class="next-btn" id="nextBtn">${nextLabel}</button>`;
  document.getElementById('nextBtn').addEventListener('click',nextQuestion);

  if(q.type==='mc'){
    document.querySelectorAll('.mc-opt').forEach(btn=>{
      btn.disabled=true;
      if(btn.dataset.val===q.answer) btn.classList.add('correct');
      else if(btn.dataset.val===userAns && !correct) btn.classList.add('wrong');
    });
  }
  if(['fill','word_form','transform'].includes(q.type)){
    const inp=document.getElementById('ansInput');
    if(inp){ inp.disabled=true; inp.classList.add(correct?'correct':'wrong'); }
    const cb=document.getElementById('checkBtn');
    if(cb) cb.disabled=true;
  }
  if(q.type==='error'){
    ['errWrong','errFix'].forEach(id=>{
      const inp=document.getElementById(id);
      if(inp){ inp.disabled=true; inp.classList.add(correct?'correct':'wrong'); }
    });
    const cb=document.getElementById('checkBtn');
    if(cb) cb.disabled=true;
  }
  if(q.type==='tf'){
    document.querySelectorAll('.tf-btn').forEach(btn=>{
      btn.disabled=true;
      if(btn.dataset.val===q.answer) btn.classList.add('correct');
      else if(btn.dataset.val===userAns && !correct) btn.classList.add('wrong');
    });
  }
}

function renderSummary(){
  const correct=state.answers.filter(a=>a.correct).length;
  const total=state.answers.length;
  const pct=Math.round(correct/total*100);

  const encouragement = pct>=90?'Outstanding work! You\'re exam-ready.' :
    pct>=75?'Great result! Keep that momentum going.' :
    pct>=60?'Solid effort — a few weak spots to iron out.' :
    'Good attempt. Focus on the topics below and try again.';

  const missedMap={};
  state.answers.forEach(a=>{
    if(!missedMap[a.topic]) missedMap[a.topic]={right:0,wrong:0};
    if(a.correct) missedMap[a.topic].right++;
    else missedMap[a.topic].wrong++;
  });
  const missedTopics=Object.entries(missedMap)
    .filter(([,v])=>v.wrong>0)
    .sort((a,b)=>b[1].wrong-a[1].wrong);

  const wrongAnswers=state.answers.filter(a=>!a.correct).map(a=>{
    const q=QUESTIONS.find(x=>x.id===a.id);
    if(!q) return null;
    const typeLabel=TYPE_LABELS[q.type]||q.type;
    const correctAns=(q.type==='transform'&&q.gapAnswer)?q.gapAnswer:q.answer;
    const qText=q.question.split('\nKEY WORD:')[0];
    return {typeLabel,topic:a.topic,qText,userAns:a.userAns,correctAns};
  }).filter(Boolean);

  let missedHtml='';
  if(wrongAnswers.length===0){
    missedHtml=`<p style="font-size:.85rem;color:var(--green);font-family:Arial,sans-serif">No errors this session — excellent!</p>`;
  } else {
    missedHtml=wrongAnswers.map(w=>`
      <div style="border-bottom:1px solid var(--border3);padding:10px 0;font-family:Arial,sans-serif">
        <div style="font-size:.7rem;text-transform:uppercase;letter-spacing:.08em;color:var(--muted2);margin-bottom:3px">${esc(w.typeLabel)} &middot; ${esc(w.topic.replace(/_/g,' '))}</div>
        <div style="font-size:.88rem;color:var(--text2);margin-bottom:5px;font-family:Georgia,serif;font-style:italic">${esc(w.qText.length>90?w.qText.slice(0,87)+'…':w.qText)}</div>
        <div style="font-size:.82rem;display:flex;gap:18px;flex-wrap:wrap">
          <span>Your answer: <span style="color:var(--red);font-weight:bold">${w.userAns?esc(w.userAns):'<em>none</em>'}</span></span>
          <span>Correct: <span style="color:var(--green);font-weight:bold">${esc(w.correctAns)}</span></span>
        </div>
      </div>`).join('');
  }

  const allTopics={};
  Object.entries(state.progress.questions).forEach(([id,p])=>{
    const q=QUESTIONS.find(x=>x.id===id);
    if(!q||p.attempts===0) return;
    if(!allTopics[q.topic]) allTopics[q.topic]={att:0,cor:0};
    allTopics[q.topic].att+=p.attempts;
    allTopics[q.topic].cor+=p.correct;
  });
  const weakTopics=Object.entries(allTopics)
    .filter(([,v])=>v.att>=2 && v.cor/v.att<0.7)
    .sort((a,b)=>(a[1].cor/a[1].att)-(b[1].cor/b[1].att));

  const weakHtml=weakTopics.length===0
    ?`<p style="font-size:.82rem;color:var(--muted);font-family:Arial,sans-serif;padding:8px 0">No weak areas detected yet.</p>`
    :`<ul class="topic-list">${weakTopics.map(([t,v])=>{
        const acc=Math.round(v.cor/v.att*100);
        return `<li><span>${t.replace(/_/g,' ')}</span><span class="${acc<50?'acc-bad':'acc-ok'}">${acc}%</span></li>`;
      }).join('')}</ul>`;

  const histHtml=renderSessionHistory(state.progress.sessions.slice(-5));

  return `<div class="header-bar">
    <h1>Session Complete</h1>
    <div class="hdr-right">${darkToggleBtn()}</div>
  </div>
  <div class="score-big">${correct}<span> / ${total}</span></div>
  <p class="encourage">${encouragement}</p>
  <div class="stats-row">
    <div class="stat-box"><span class="stat-num">${pct}%</span><span class="stat-lbl">Score</span></div>
    <div class="stat-box"><span class="stat-num">${correct}</span><span class="stat-lbl">Correct</span></div>
    <div class="stat-box"><span class="stat-num">${total-correct}</span><span class="stat-lbl">Wrong</span></div>
  </div>

  <div class="card">
    <h2>This session — mistakes${wrongAnswers.length>0?` (${wrongAnswers.length})`:''}  </h2>
    ${missedHtml}
  </div>

  <div class="card" id="weakCard">
    <div class="collapsible-hdr" id="weakHdr">
      <span>All-time weak areas (&lt;70% accuracy)</span>
      <span id="weakArrow">▼</span>
    </div>
    <div class="coll-body" id="weakBody">${weakHtml}</div>
  </div>

  <div class="card" id="histCard">
    <div class="collapsible-hdr" id="histHdr">
      <span>Recent sessions</span>
      <span id="histArrow">▼</span>
    </div>
    <div class="coll-body" id="histBody">${histHtml}</div>
  </div>

  ${renderLengthSelector(state.testLength)}
  <button class="btn-primary" id="newTestBtn">New Test</button>
  <button class="btn-secondary" id="backHomeBtn">Back to Start</button>`;
}

function attachHandlers(){
  document.querySelectorAll('.dark-toggle').forEach(btn=>{
    btn.addEventListener('click',toggleDark);
  });

  document.querySelectorAll('.lbtn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      state.testLength=btn.dataset.len;
      document.querySelectorAll('.lbtn').forEach(b=>b.classList.toggle('active',b.dataset.len===state.testLength));
    });
  });

  if(state.screen==='start'){
    document.getElementById('startBtn').addEventListener('click',startTest);
    const sessBox=document.getElementById('sessionsBox');
    if(sessBox){
      sessBox.addEventListener('click',()=>{
        const wrap=document.getElementById('sessHistWrap');
        const lbl=document.getElementById('sessLbl');
        if(!wrap) return;
        const open=wrap.style.display!=='none';
        wrap.style.display=open?'none':'block';
        lbl.textContent=open?'Sessions ▾':'Sessions ▲';
        sessBox.style.borderColor=open?'var(--border2)':'var(--ink)';
      });
    }
  }

  if(state.screen==='test'){
    const q=state.session[state.idx];

    document.getElementById('quitBtn').addEventListener('click',()=>{
      if(confirm('Quit this test? Progress won\'t be counted.')){ state.screen='start'; render(); }
    });

    const showBtn=document.getElementById('showAnsBtn');
    if(showBtn){
      showBtn.addEventListener('click',()=>{
        if(state.answered) return;
        submitAnswer(q, q.type==='error' ? '|||' : '');
      });
    }

    if(q.type==='mc'){
      document.querySelectorAll('.mc-opt').forEach(btn=>{
        btn.addEventListener('click',()=>{
          if(state.answered) return;
          submitAnswer(q,btn.dataset.val);
        });
      });
    }

    if(['fill','word_form','transform'].includes(q.type)){
      const inp=document.getElementById('ansInput');
      const cb=document.getElementById('checkBtn');
      const doCheck=()=>{ if(!state.answered && inp.value.trim()) submitAnswer(q,inp.value); };
      cb.addEventListener('click',doCheck);
      inp.addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); e.stopPropagation(); doCheck(); } });
      inp.focus();
    }

    if(q.type==='error'){
      const wrong=document.getElementById('errWrong');
      const fix=document.getElementById('errFix');
      const cb=document.getElementById('checkBtn');
      const doCheck=()=>{
        if(state.answered||!wrong.value.trim()) return;
        submitAnswer(q, wrong.value+'|||'+fix.value);
      };
      cb.addEventListener('click',doCheck);
      [wrong,fix].forEach(inp=>{
        inp.addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); e.stopPropagation(); doCheck(); } });
      });
      wrong.focus();
    }

    if(q.type==='tf'){
      document.querySelectorAll('.tf-btn').forEach(btn=>{
        btn.addEventListener('click',()=>{
          if(state.answered) return;
          submitAnswer(q,btn.dataset.val);
        });
      });
    }
  }

  if(state.screen==='summary'){
    document.getElementById('newTestBtn').addEventListener('click',startTest);
    document.getElementById('backHomeBtn').addEventListener('click',()=>{ state.screen='start'; render(); });

    document.getElementById('weakHdr').addEventListener('click',()=>{
      const b=document.getElementById('weakBody');
      const a=document.getElementById('weakArrow');
      b.classList.toggle('open');
      a.textContent=b.classList.contains('open')?'▲':'▼';
    });
    document.getElementById('histHdr').addEventListener('click',()=>{
      const b=document.getElementById('histBody');
      const a=document.getElementById('histArrow');
      b.classList.toggle('open');
      a.textContent=b.classList.contains('open')?'▲':'▼';
    });
  }
}

function esc(s){
  return String(s)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}

document.addEventListener('keydown',(e)=>{
  if(state.screen!=='test') return;
  const q=state.session[state.idx];
  if(!q) return;

  if(e.key==='Enter' && state.answered){
    const nb=document.getElementById('nextBtn');
    if(nb){ e.preventDefault(); nextQuestion(); }
    return;
  }

  if(!state.answered && q.type==='mc'){
    const tag=e.target.tagName;
    if(tag==='INPUT'||tag==='TEXTAREA') return;
    const idx = MC_KEYS.indexOf(e.key)!==-1
      ? MC_KEYS.indexOf(e.key)
      : MC_HOME.indexOf(e.key.toLowerCase());
    if(idx>=0){
      const opts=document.querySelectorAll('.mc-opt');
      if(opts[idx]){ e.preventDefault(); opts[idx].click(); }
    }
  }

  if(!state.answered && q.type==='tf'){
    const tag=e.target.tagName;
    if(tag==='INPUT'||tag==='TEXTAREA') return;
    const map = {t:'True', f:'False', n:'Not Mentioned'};
    const val = map[e.key.toLowerCase()];
    if(val){
      const btn=[...document.querySelectorAll('.tf-btn')].find(b=>b.dataset.val===val);
      if(btn){ e.preventDefault(); btn.click(); }
    }
  }
});

initDark();
render();
