import { useState, useEffect, useCallback } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, LineChart, Line } from "recharts";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MONTH_FULL = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const CUR = new Date().getMonth();

const DEFAULT_BUDGET_CATS = [
  {id:"food",name:"Food",budget:4000,freq:"monthly",freqDays:1},
  {id:"groceries",name:"Groceries",budget:1500,freq:"monthly",freqDays:1},
  {id:"transport",name:"Transportation",budget:1500,freq:"monthly",freqDays:1},
  {id:"pet",name:"Pet Expense",budget:1000,freq:"monthly",freqDays:1},
  {id:"work",name:"Work Allowance",budget:600,freq:"monthly",freqDays:1},
  {id:"rent",name:"Rent",budget:5000,freq:"monthly",freqDays:1},
  {id:"electricity",name:"Electricity",budget:2000,freq:"monthly",freqDays:1},
  {id:"wifi",name:"Wifi + Load",budget:1000,freq:"monthly",freqDays:1},
  {id:"water",name:"Water",budget:300,freq:"monthly",freqDays:1},
];

const SUB_CATS = ["Entertainment","Work","Business","Other"];
const GOALS = [
  {id:"emergency",name:"Emergency Fund",target:500000,icon:"🛡️",color:"#ec4899"},
  {id:"dubai",name:"Dubai Travel Fund",target:50000,icon:"✈️",color:"#f43f5e"},
  {id:"apartment",name:"Apartment Rent (1 Year)",target:60000,icon:"🏠",color:"#f97316"},
  {id:"income",name:"Increase Income Stream",target:40000,icon:"📈",color:"#7c3aed"},
  {id:"invest",name:"Investment Fund",target:500000,icon:"💹",color:"#0891b2"},
];
const CC = ["#ec4899","#f43f5e","#f97316","#7c3aed","#0891b2","#059669","#eab308","#3b82f6","#a855f7","#14b8a6"];
const LIABILITY_CATS = ["Debt","Loan","Credit Card"];

const mkMonth = () => ({income:[],fixedActual:{},variable:[],savings:[],subsPaid:{},liabPaid:{}});
const mkCard = () => ({limit:0,balance:0,dueDate:"",transactions:[],payments:[]});
const uid = () => Math.random().toString(36).slice(2,9);

const FREQ_OPTIONS = [
  {value:"monthly", label:"Monthly"},
  {value:"weekly",  label:"Weekly (×4.33/mo)"},
  {value:"custom",  label:"Custom (days/week)"},
];
function computeMonthly(baseAmount, freq, freqDays){
  const b = Number(baseAmount)||0;
  if(freq==="monthly") return b;
  if(freq==="weekly")  return Math.round(b * 4.33);
  return Math.round(b * (Number(freqDays)||1) * 4.33);
}
function freqLabel(c){
  if(c.freq==="monthly") return "monthly";
  if(c.freq==="weekly")  return "×4.33/mo (weekly)";
  return `${c.freqDays||1}×/wk × 4.33`;
}
const fmt = n => `₱${Number(n||0).toLocaleString("en-PH",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const deepClone = o => JSON.parse(JSON.stringify(o));

const DEFAULT = {
  months: Object.fromEntries(MONTHS.map((_,i)=>[i,mkMonth()])),
  monthBudgets: Object.fromEntries(MONTHS.map((_,i)=>[i,DEFAULT_BUDGET_CATS.map(c=>({...c}))])),
  goals: Object.fromEntries(GOALS.map(g=>[g.id,0])),
  subscriptions: [],
  cards: {bdo:mkCard(),unionbank:mkCard()},
  liabilities: [],
  receivables: [],
  financialAdvice: Object.fromEntries(MONTHS.map((_,i)=>[i,""])),
  _budgetSavedMonths:[],
};

const S = {
  bg:"#fff8fb",surf:"#ffffff",surf2:"#fce7f3",
  border:"#fbcfe8",borderD:"#f9a8d4",
  text:"#1f2937",muted:"#be185d",mutedL:"#f9a8d4",
  accent:"#ec4899",accentD:"#db2777",
  green:"#16a34a",red:"#dc2626",yellow:"#d97706",purple:"#7c3aed",blue:"#1d4ed8",
  teal:"#0891b2",
};
const card = {background:S.surf,borderRadius:14,padding:20,marginBottom:16,border:`1px solid ${S.border}`,boxShadow:"0 1px 6px rgba(236,72,153,0.06)"};
const inp = {background:S.bg,border:`1px solid ${S.border}`,color:S.text,padding:"9px 12px",borderRadius:9,fontSize:13,width:"100%",boxSizing:"border-box",outline:"none"};
const sel = {background:S.bg,border:`1px solid ${S.border}`,color:S.text,padding:"9px 12px",borderRadius:9,fontSize:13,width:"100%",boxSizing:"border-box",cursor:"pointer",outline:"none"};
const lbl = {fontSize:11,color:S.muted,marginBottom:5,display:"block",fontWeight:600,textTransform:"uppercase",letterSpacing:0.5};

function Btn({children,onClick,color,outline=false,small=false,full=false,disabled=false}){
  const bg=color||S.accent;
  return <button disabled={disabled} onClick={onClick} style={{background:outline?"transparent":disabled?"#ccc":bg,color:outline?S.muted:"#fff",border:outline?`1px solid ${S.border}`:`1px solid ${disabled?"#ccc":bg}`,padding:small?"5px 12px":"9px 18px",borderRadius:9,cursor:disabled?"not-allowed":"pointer",fontSize:small?12:13,fontWeight:600,whiteSpace:"nowrap",width:full?"100%":"auto",opacity:disabled?0.6:1}}>{children}</button>;
}

function EditableField({label, value, onChange, type="text", placeholder="", prefix="", style:extraStyle={}}){
  const [editing,setEditing]=useState(false);
  const [local,setLocal]=useState(value);
  useEffect(()=>{setLocal(value);},[value]);
  const commit=()=>{onChange(local);setEditing(false);};
  if(editing) return <div style={{display:"flex",flexDirection:"column",gap:4,...extraStyle}}>
    {label&&<span style={lbl}>{label}</span>}
    <div style={{display:"flex",gap:6,alignItems:"center"}}>
      <input autoFocus style={{...inp,flex:1}} type={type} value={local} placeholder={placeholder}
        onChange={e=>setLocal(e.target.value)}
        onKeyDown={e=>{if(e.key==="Enter")commit();if(e.key==="Escape"){setLocal(value);setEditing(false);}}}/>
      <button onClick={commit} style={{background:S.green,border:"none",color:"#fff",padding:"7px 12px",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:700,flexShrink:0}}>✓</button>
      <button onClick={()=>{setLocal(value);setEditing(false);}} style={{background:"none",border:`1px solid ${S.border}`,color:S.muted,padding:"7px 10px",borderRadius:8,cursor:"pointer",fontSize:12,flexShrink:0}}>✕</button>
    </div>
  </div>;
  return <div style={{display:"flex",flexDirection:"column",gap:4,...extraStyle}}>
    {label&&<span style={lbl}>{label}</span>}
    <div onClick={()=>setEditing(true)} style={{display:"flex",alignItems:"center",gap:6,padding:"8px 12px",background:S.bg,border:`1px solid ${S.border}`,borderRadius:9,cursor:"pointer",minHeight:38}} title="Click to edit">
      <span style={{flex:1,fontSize:13,color:value?S.text:"#9ca3af"}}>{prefix}{value||<span style={{color:"#9ca3af",fontStyle:"italic"}}>{placeholder||"—"}</span>}</span>
      <span style={{fontSize:12,color:S.muted,flexShrink:0}}>✏️</span>
    </div>
  </div>;
}

function MiniStat({label:l,value,color,sub}){
  return <div style={{flex:1,minWidth:110,background:S.surf2,borderRadius:11,padding:"12px 14px",border:`1px solid ${S.border}`}}>
    <div style={{fontSize:10,color:S.muted,marginBottom:3,fontWeight:700,textTransform:"uppercase",letterSpacing:0.5}}>{l}</div>
    <div style={{fontSize:18,fontWeight:700,color:color||S.accent}}>{value}</div>
    {sub&&<div style={{fontSize:10,color:S.muted,marginTop:2}}>{sub}</div>}
  </div>;
}

// Dynamic category select — pulls from budget cats + extras
function CatSelect({value, onChange, cats, budgetCats}){
  const [custom,setCustom]=useState(false);
  // Build list from budget cat names + standard extras
  const extras=["Shopping","Healthcare","Personal Care","Entertainment","Education","Clothing","Dining Out","Travel","Gifts","Miscellaneous","Liability Payment"];
  const budgetNames=(budgetCats||[]).map(c=>c.name);
  const list=cats||(budgetNames.length>0?[...new Set([...budgetNames,...extras])]:extras);
  if(custom||(!list.includes(value)&&value)){
    return <div style={{display:"flex",gap:6}}>
      <input style={{...inp,flex:1}} placeholder="Type category..." value={value} onChange={e=>onChange(e.target.value)}/>
      <button onClick={()=>{setCustom(false);onChange("");}} style={{background:"none",border:`1px solid ${S.border}`,color:S.muted,borderRadius:9,padding:"0 10px",cursor:"pointer",fontSize:12,flexShrink:0}}>↩</button>
    </div>;
  }
  return <select style={sel} value={value} onChange={e=>e.target.value==="__c__"?setCustom(true):onChange(e.target.value)}>
    <option value="">Select...</option>
    {list.map(c=><option key={c} value={c}>{c}</option>)}
    {(!cats)&&<option value="__c__">+ Custom</option>}
  </select>;
}

function getMonthBudget(data,month){
  return (data.monthBudgets&&data.monthBudgets[month])?data.monthBudgets[month]:DEFAULT_BUDGET_CATS.map(c=>({...c}));
}

export default function App(){
  const [tab,setTab]=useState("dashboard");
  const [data,setData]=useState(null);
  const [month,setMonth]=useState(CUR);
  const [loading,setLoading]=useState(true);
  const [saved,setSaved]=useState(false);

  useEffect(()=>{(async()=>{
    try{
      const r=await window.storage.get("gera-budget-v4");
      const r3=!r?await window.storage.get("gera-budget-v3"):null;
      const raw=r||r3;
      if(raw){
        const d=JSON.parse(raw.value);
        if(!d.cards)d.cards={bdo:mkCard(),unionbank:mkCard()};
        if(!d.cards.bdo)d.cards.bdo=mkCard();
        if(!d.cards.unionbank)d.cards.unionbank=mkCard();
        if(!d.monthBudgets){
          const base=d.budgetCats||DEFAULT_BUDGET_CATS;
          d.monthBudgets=Object.fromEntries(MONTHS.map((_,i)=>[i,base.map(c=>({...c}))]));
          delete d.budgetCats;
        }
        if(!d.liabilities)d.liabilities=[];
        if(!d.receivables)d.receivables=[];
        if(!d.financialAdvice)d.financialAdvice=Object.fromEntries(MONTHS.map((_,i)=>[i,""]));
        if(!d._budgetSavedMonths)d._budgetSavedMonths=[];
        MONTHS.forEach((_,i)=>{
          if(!d.months[i])d.months[i]=mkMonth();
          if(!d.months[i].savings)d.months[i].savings=[];
          if(!d.months[i].subsPaid)d.months[i].subsPaid={};
          if(!d.months[i].liabPaid)d.months[i].liabPaid={};
          if(!d.months[i].fixedActual)d.months[i].fixedActual={};
          if(!d.monthBudgets[i])d.monthBudgets[i]=DEFAULT_BUDGET_CATS.map(c=>({...c}));
        });
        setData(d);
      } else setData({...DEFAULT});
    }catch(e){console.error(e);setData({...DEFAULT});}
    setLoading(false);
  })();},[]);

  const save = useCallback(async d=>{
    const nd={...d};
    setData(nd);
    try{
      await window.storage.set("gera-budget-v4",JSON.stringify(nd));
      setSaved(true);
      setTimeout(()=>setSaved(false),1800);
    }catch{}
  },[]);

  if(loading||!data) return <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:S.bg,color:S.muted,fontFamily:"system-ui,sans-serif"}}>Loading your data...</div>;

  const md=data.months[month]||mkMonth();
  const budgetCats=getMonthBudget(data,month);
  const totalBudget=budgetCats.reduce((s,c)=>s+Number(c.budget),0);
  const totalIncome=(md.income||[]).reduce((s,x)=>s+Number(x.amount),0);
  const totalFixed=budgetCats.reduce((s,c)=>s+Number(md.fixedActual?.[c.id]||0),0);
  const totalVar=(md.variable||[]).reduce((s,x)=>s+Number(x.amount),0);
  const totalSubs=(data.subscriptions||[]).reduce((s,x)=>s+Number(x.amount),0);
  const totalSavings=(md.savings||[]).reduce((s,x)=>s+Number(x.amount),0);
  // Liability min payments that are checked this month
  const checkedLiabPay=(data.liabilities||[]).filter(l=>md.liabPaid?.[l.id]).reduce((s,l)=>s+Number(l.minPayment||0),0);
  const totalExp=totalFixed+totalVar+totalSubs+checkedLiabPay;
  const remaining=totalIncome-totalExp-totalSavings;

  const TABS=[
    {id:"dashboard",l:"📊"},
    {id:"monthly",l:"📅 Monthly"},
    {id:"budget",l:"💰 Budget"},
    {id:"goals",l:"🎯 Goals"},
    {id:"subs",l:"📋 Subs"},
    {id:"credit",l:"💳 Credit"},
    {id:"liabilities",l:"🏦 Liabilities"},
    {id:"receivables",l:"📥 Receivables"},
    {id:"summary",l:"📈 Summary"},
  ];

  const sharedProps={data,save,month,md,budgetCats,totalIncome,totalFixed,totalVar,totalExp,remaining,totalSubs,totalSavings,totalBudget,checkedLiabPay};

  return <div style={{background:S.bg,minHeight:"100vh",color:S.text,fontFamily:"system-ui,sans-serif"}}>
    <div style={{background:"#fff",padding:"12px 16px",borderBottom:`1px solid ${S.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,boxShadow:"0 1px 4px rgba(236,72,153,0.07)",flexWrap:"wrap"}}>
      <h1 style={{margin:0,fontSize:16,fontWeight:700,color:S.accent}}>🌸 Gera's Budget Tracker 2026</h1>
      <div style={{display:"flex",gap:8,alignItems:"center"}}>
        {saved&&<span style={{fontSize:12,color:S.green,fontWeight:600}}>✓ Saved</span>}
        <select value={month} onChange={e=>setMonth(Number(e.target.value))} style={{...sel,width:"auto",padding:"6px 10px"}}>
          {MONTHS.map((m,i)=><option key={i} value={i}>{m} 2026</option>)}
        </select>
      </div>
    </div>
    <div style={{background:"#fff",borderBottom:`1px solid ${S.border}`,display:"flex",overflowX:"auto"}}>
      {TABS.map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={{padding:"11px 10px",background:"none",border:"none",color:tab===t.id?S.accent:S.muted,borderBottom:`2px solid ${tab===t.id?S.accent:"transparent"}`,cursor:"pointer",fontWeight:tab===t.id?700:400,whiteSpace:"nowrap",fontSize:12}}>{t.l}</button>)}
    </div>
    <div style={{padding:16,maxWidth:900,margin:"0 auto"}}>
      {tab==="dashboard"&&<Dashboard {...sharedProps}/>}
      {tab==="monthly"&&<Monthly {...sharedProps}/>}
      {tab==="budget"&&<BudgetManager data={data} save={save} month={month}/>}
      {tab==="goals"&&<Goals data={data} save={save}/>}
      {tab==="subs"&&<Subscriptions data={data} save={save} month={month} md={md}/>}
      {tab==="credit"&&<Credit data={data} save={save} month={month}/>}
      {tab==="liabilities"&&<Liabilities data={data} save={save} month={month} md={md} budgetCats={budgetCats}/>}
      {tab==="receivables"&&<Receivables data={data} save={save} month={month} md={md}/>}
      {tab==="summary"&&<Summary data={data} save={save} month={month}/>}
    </div>
  </div>;
}

// ─── DASHBOARD ───────────────────────────────────────────────
function Dashboard({data,month,md,budgetCats,totalIncome,totalExp,remaining,totalFixed,totalVar,totalSubs,totalSavings,totalBudget,checkedLiabPay}){
  const pieData=[
    ...budgetCats.filter(c=>Number(md.fixedActual?.[c.id])>0).map(c=>({name:c.name,value:Number(md.fixedActual[c.id])})),
    ...(md.variable||[]).map(v=>({name:v.category||v.description,value:Number(v.amount)})),
    ...(totalSubs>0?[{name:"Subscriptions",value:totalSubs}]:[]),
    ...(checkedLiabPay>0?[{name:"Liability Payments",value:checkedLiabPay}]:[]),
  ];
  // Pending receivables
  const pendingRec=(data.receivables||[]).filter(r=>!r.received&&!r.cancelled).reduce((s,r)=>s+Number(r.amount),0);
  return <div>
    <p style={{margin:"0 0 12px",fontSize:13,color:S.muted}}>{MONTH_FULL[month]} Overview</p>
    <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:8}}>
      <MiniStat label="Income" value={fmt(totalIncome)} color={S.green}/>
      <MiniStat label="Expenses" value={fmt(totalExp)} color={S.red}/>
      <MiniStat label="Savings" value={fmt(totalSavings)} color={S.purple}/>
      <MiniStat label="Remaining" value={fmt(remaining)} color={remaining>=0?S.green:S.red}/>
    </div>
    <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:14}}>
      <MiniStat label="Fixed" value={fmt(totalFixed)} sub={`Budget ${fmt(totalBudget)}`}/>
      <MiniStat label="Variable" value={fmt(totalVar)}/>
      <MiniStat label="Subscriptions" value={fmt(totalSubs)} sub="/mo"/>
      <MiniStat label="Liab Payments" value={fmt(checkedLiabPay)} color={S.red}/>
      {pendingRec>0&&<MiniStat label="Pending Receivables" value={fmt(pendingRec)} color={S.teal}/>}
    </div>
    {pieData.length>0&&<div style={card}>
      <div style={{fontSize:13,fontWeight:700,marginBottom:8,color:S.accent}}>Expense Breakdown</div>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart><Pie data={pieData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`} labelLine={false} fontSize={10}>
          {pieData.map((_,i)=><Cell key={i} fill={CC[i%CC.length]}/>)}
        </Pie><Tooltip formatter={v=>fmt(v)}/></PieChart>
      </ResponsiveContainer>
    </div>}
    <div style={card}>
      <div style={{fontSize:13,fontWeight:700,marginBottom:12,color:S.accent}}>Budget vs Actual — {MONTH_FULL[month]}</div>
      {budgetCats.map(c=>{
        const actual=Number(md.fixedActual?.[c.id]||0);
        const pct=c.budget>0?Math.min((actual/c.budget)*100,100):0;
        const over=actual>c.budget;
        return <div key={c.id} style={{marginBottom:10}}>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:3}}>
            <span>{c.name}</span><span style={{color:over?S.red:S.muted}}>{fmt(actual)} / {fmt(c.budget)}</span>
          </div>
          <div style={{background:S.bg,borderRadius:4,height:6,border:`1px solid ${S.border}`}}>
            <div style={{width:`${pct}%`,background:over?S.red:S.accent,borderRadius:4,height:"100%",transition:"width 0.3s"}}/>
          </div>
        </div>;
      })}
    </div>
  </div>;
}

// ─── MONTHLY ─────────────────────────────────────────────────
function Monthly({data,save,month,md,budgetCats,totalIncome,totalFixed,totalVar,totalExp,remaining,totalSubs,totalSavings,checkedLiabPay}){
  const [incF,setIncF]=useState({source:"",amount:""});
  const [varF,setVarF]=useState({description:"",category:"",amount:""});
  const [savF,setSavF]=useState({goalId:"",amount:"",notes:""});
  const [showFixed,setShowFixed]=useState(false);

  const upd=(fn)=>{const d=deepClone(data);fn(d);save(d);};
  const addIncome=()=>{if(!incF.source||!incF.amount)return;upd(d=>{d.months[month].income.push({...incF,id:uid()});});setIncF({source:"",amount:""});};
  const updIncome=(id,nx)=>upd(d=>{d.months[month].income=d.months[month].income.map(x=>x.id===id?{...x,...nx}:x);});
  const delIncome=id=>upd(d=>{d.months[month].income=d.months[month].income.filter(x=>x.id!==id);});
  const updateFixed=(catId,val)=>upd(d=>{if(!d.months[month].fixedActual)d.months[month].fixedActual={};d.months[month].fixedActual[catId]=val;});
  const addVar=()=>{if(!varF.description||!varF.amount)return;upd(d=>{if(!d.months[month].variable)d.months[month].variable=[];d.months[month].variable.push({...varF,id:uid()});});setVarF({description:"",category:"",amount:""});};
  const updVar=(id,nx)=>upd(d=>{d.months[month].variable=d.months[month].variable.map(x=>x.id===id?{...x,...nx}:x);});
  const delVar=id=>upd(d=>{d.months[month].variable=d.months[month].variable.filter(x=>x.id!==id);});
  const addSavings=()=>{
    if(!savF.goalId||!savF.amount)return;
    const goal=GOALS.find(g=>g.id===savF.goalId);
    upd(d=>{
      if(!d.months[month].savings)d.months[month].savings=[];
      d.months[month].savings.push({...savF,goalName:goal?.name,goalIcon:goal?.icon,id:uid()});
      d.goals[savF.goalId]=Number(d.goals[savF.goalId]||0)+Number(savF.amount);
    });
    setSavF({goalId:"",amount:"",notes:""});
  };
  const updSavings=(item,nx)=>upd(d=>{
    const old=d.months[month].savings.find(x=>x.id===item.id);
    const diff=Number(nx.amount)-Number(old.amount);
    d.months[month].savings=d.months[month].savings.map(x=>x.id===item.id?{...x,...nx}:x);
    if(diff!==0)d.goals[item.goalId]=Math.max(0,Number(d.goals[item.goalId]||0)+diff);
  });
  const delSavings=item=>upd(d=>{
    d.months[month].savings=d.months[month].savings.filter(x=>x.id!==item.id);
    d.goals[item.goalId]=Math.max(0,Number(d.goals[item.goalId]||0)-Number(item.amount));
  });

  const catGroups=(md.variable||[]).reduce((acc,x)=>{const k=x.category||"Uncategorized";if(!acc[k])acc[k]=[];acc[k].push(x);return acc;},{});

  // Show liability payments in expenses
  const liabPaid=(data.liabilities||[]).filter(l=>md.liabPaid?.[l.id]);

  return <div>
    <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:14}}>
      <MiniStat label="Income" value={fmt(totalIncome)} color={S.green}/>
      <MiniStat label="Expenses" value={fmt(totalExp)} color={S.red}/>
      <MiniStat label="Savings" value={fmt(totalSavings)} color={S.purple}/>
      <MiniStat label="Remaining" value={fmt(remaining)} color={remaining>=0?S.green:S.red}/>
    </div>
    {/* Income */}
    <div style={card}>
      <div style={{fontSize:13,fontWeight:700,marginBottom:12,color:S.accent}}>💵 Income</div>
      <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap",alignItems:"flex-end",padding:12,background:S.surf2,borderRadius:10,border:`1px solid ${S.border}`}}>
        <div style={{flex:2,minWidth:130}}><span style={lbl}>Source</span><input style={inp} placeholder="Freelance, Salary..." value={incF.source} onChange={e=>setIncF({...incF,source:e.target.value})}/></div>
        <div style={{flex:1,minWidth:100}}><span style={lbl}>Amount (₱)</span><input style={inp} type="number" placeholder="0" value={incF.amount} onChange={e=>setIncF({...incF,amount:e.target.value})}/></div>
        <Btn onClick={addIncome} color={S.green}>+ Add</Btn>
      </div>
      {(md.income||[]).length===0&&<p style={{color:S.muted,fontSize:13,margin:0}}>No income logged yet.</p>}
      {(md.income||[]).map(x=><div key={x.id} style={{display:"flex",alignItems:"flex-end",gap:8,padding:"10px 0",borderTop:`1px solid ${S.border}`,flexWrap:"wrap"}}>
        <EditableField value={x.source} onChange={v=>updIncome(x.id,{...x,source:v})} placeholder="Source" style={{flex:2,minWidth:120}}/>
        <EditableField value={String(x.amount)} onChange={v=>updIncome(x.id,{...x,amount:v})} type="number" placeholder="0" prefix="₱" style={{flex:1,minWidth:100}}/>
        <button onClick={()=>delIncome(x.id)} style={{background:"none",border:"none",color:S.red,cursor:"pointer",fontSize:20,lineHeight:1,paddingBottom:8}}>×</button>
      </div>)}
      {(md.income||[]).length>0&&<div style={{borderTop:`1px solid ${S.border}`,paddingTop:10,display:"flex",justifyContent:"flex-end",fontWeight:700,fontSize:13,color:S.green}}>Total: {fmt(totalIncome)}</div>}
    </div>
    {/* Variable Expenses */}
    <div style={card}>
      <div style={{fontSize:13,fontWeight:700,marginBottom:12,color:S.accent}}>🧾 Expenses</div>
      <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap",alignItems:"flex-end",padding:12,background:S.surf2,borderRadius:10,border:`1px solid ${S.border}`}}>
        <div style={{flex:2,minWidth:130}}><span style={lbl}>Description</span><input style={inp} placeholder="Shopee, Lunch..." value={varF.description} onChange={e=>setVarF({...varF,description:e.target.value})}/></div>
        <div style={{flex:2,minWidth:140}}><span style={lbl}>Category</span><CatSelect value={varF.category} onChange={v=>setVarF({...varF,category:v})} budgetCats={budgetCats}/></div>
        <div style={{flex:1,minWidth:90}}><span style={lbl}>Amount (₱)</span><input style={inp} type="number" placeholder="0" value={varF.amount} onChange={e=>setVarF({...varF,amount:e.target.value})}/></div>
        <Btn onClick={addVar}>+ Add</Btn>
      </div>
      {(md.variable||[]).length===0&&liabPaid.length===0&&<p style={{color:S.muted,fontSize:13,margin:0}}>No expenses added.</p>}
      {Object.entries(catGroups).map(([cat,items])=><div key={cat}>
        <div style={{fontSize:10,fontWeight:700,color:S.accent,textTransform:"uppercase",letterSpacing:1,padding:"8px 0 4px",borderTop:`1px solid ${S.border}`}}>{cat}</div>
        {items.map(x=><div key={x.id} style={{display:"flex",alignItems:"flex-end",gap:8,padding:"10px 0",borderTop:`1px solid ${S.border}`,flexWrap:"wrap"}}>
          <EditableField value={x.description} onChange={v=>updVar(x.id,{...x,description:v})} placeholder="Description" style={{flex:2,minWidth:120}}/>
          <div style={{flex:2,minWidth:130}}><span style={lbl}>Category</span><CatSelect value={x.category} onChange={v=>updVar(x.id,{...x,category:v})} budgetCats={budgetCats}/></div>
          <EditableField value={String(x.amount)} onChange={v=>updVar(x.id,{...x,amount:v})} type="number" placeholder="0" prefix="₱" style={{flex:1,minWidth:90}}/>
          <button onClick={()=>delVar(x.id)} style={{background:"none",border:"none",color:S.red,cursor:"pointer",fontSize:20,lineHeight:1,paddingBottom:8}}>×</button>
        </div>)}
      </div>)}
      {/* Liability payments auto-added */}
      {liabPaid.length>0&&<div>
        <div style={{fontSize:10,fontWeight:700,color:S.red,textTransform:"uppercase",letterSpacing:1,padding:"8px 0 4px",borderTop:`1px solid ${S.border}`}}>Liability Payments (auto)</div>
        {liabPaid.map(l=><div key={l.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderTop:`1px solid ${S.border}`,fontSize:13}}>
          <span style={{color:S.muted}}>{l.name} <span style={{fontSize:11,background:"#fff0f0",color:S.red,padding:"1px 6px",borderRadius:4}}>min payment</span></span>
          <span style={{color:S.red,fontWeight:600}}>{fmt(l.minPayment)}</span>
        </div>)}
      </div>}
      {((md.variable||[]).length>0||liabPaid.length>0)&&<div style={{borderTop:`1px solid ${S.border}`,paddingTop:10,display:"flex",justifyContent:"flex-end",fontWeight:700,fontSize:13,color:S.accent}}>Total: {fmt(totalVar+checkedLiabPay)}</div>}
    </div>
    {/* Savings */}
    <div style={{...card,border:`1px solid #e9d5ff`}}>
      <div style={{fontSize:13,fontWeight:700,marginBottom:12,color:S.purple}}>💰 Savings</div>
      <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap",alignItems:"flex-end",padding:12,background:"#faf5ff",borderRadius:10,border:`1px solid #e9d5ff`}}>
        <div style={{flex:2,minWidth:150}}><span style={{...lbl,color:S.purple}}>Save towards</span>
          <select style={sel} value={savF.goalId} onChange={e=>setSavF({...savF,goalId:e.target.value})}>
            <option value="">Select goal...</option>
            {GOALS.map(g=><option key={g.id} value={g.id}>{g.icon} {g.name}</option>)}
          </select>
        </div>
        <div style={{flex:1,minWidth:100}}><span style={{...lbl,color:S.purple}}>Amount (₱)</span><input style={inp} type="number" placeholder="0" value={savF.amount} onChange={e=>setSavF({...savF,amount:e.target.value})}/></div>
        <div style={{flex:2,minWidth:130}}><span style={{...lbl,color:S.purple}}>Notes</span><input style={inp} placeholder="Monthly allotment..." value={savF.notes} onChange={e=>setSavF({...savF,notes:e.target.value})}/></div>
        <Btn onClick={addSavings} color={S.purple}>+ Save</Btn>
      </div>
      {(md.savings||[]).length===0&&<p style={{color:"#a78bfa",fontSize:13,margin:0}}>No savings logged this month.</p>}
      {(md.savings||[]).map(x=><div key={x.id} style={{display:"flex",alignItems:"flex-end",gap:8,padding:"10px 0",borderTop:`1px solid #e9d5ff`,flexWrap:"wrap"}}>
        <div style={{flex:2,minWidth:150}}><span style={{...lbl,color:S.purple}}>Goal</span>
          <select style={sel} value={x.goalId} onChange={e=>{const g=GOALS.find(g=>g.id===e.target.value);updSavings(x,{...x,goalId:e.target.value,goalName:g?.name,goalIcon:g?.icon});}}>
            {GOALS.map(g=><option key={g.id} value={g.id}>{g.icon} {g.name}</option>)}
          </select>
        </div>
        <EditableField value={String(x.amount)} onChange={v=>updSavings(x,{...x,amount:v})} type="number" placeholder="0" prefix="₱" style={{flex:1,minWidth:90}}/>
        <EditableField value={x.notes||""} onChange={v=>updSavings(x,{...x,notes:v})} placeholder="Notes" style={{flex:2,minWidth:120}}/>
        <button onClick={()=>delSavings(x)} style={{background:"none",border:"none",color:S.red,cursor:"pointer",fontSize:20,lineHeight:1,paddingBottom:8}}>×</button>
      </div>)}
      {(md.savings||[]).length>0&&<div style={{borderTop:`1px solid #e9d5ff`,paddingTop:10,display:"flex",justifyContent:"flex-end",fontWeight:700,fontSize:13,color:S.purple}}>Total Saved: {fmt(totalSavings)}</div>}
    </div>
    {/* Fixed actuals */}
    <div style={card}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer"}} onClick={()=>setShowFixed(!showFixed)}>
        <div style={{fontSize:13,fontWeight:700,color:S.accent}}>🏷️ Budget Actuals <span style={{fontSize:11,color:S.muted,fontWeight:400}}>({fmt(totalFixed)} spent)</span></div>
        <span style={{color:S.muted,fontSize:13}}>{showFixed?"▲":"▼"}</span>
      </div>
      {showFixed&&<>
        <p style={{fontSize:11,color:S.muted,marginTop:10,marginBottom:12}}>Click any value to edit actual amounts spent this month.</p>
        {budgetCats.map(c=>{
          const actual=String(md.fixedActual?.[c.id]||"");
          const over=Number(actual)>c.budget;
          return <div key={c.id} style={{display:"flex",alignItems:"flex-end",gap:10,marginBottom:10,flexWrap:"wrap"}}>
            <div style={{flex:1,fontSize:13,minWidth:100,paddingBottom:4}}>{c.name}</div>
            <div style={{fontSize:11,color:S.muted,paddingBottom:4}}>Budget: {fmt(c.budget)}</div>
            <EditableField value={actual} onChange={v=>updateFixed(c.id,v)} type="number" placeholder="0" prefix="₱" style={{minWidth:130,flex:1,border:over?`1px solid ${S.red}`:"none"}}/>
          </div>;
        })}
        <div style={{borderTop:`1px solid ${S.border}`,paddingTop:10,display:"flex",justifyContent:"flex-end",fontWeight:700,fontSize:13,color:S.accent}}>Total: {fmt(totalFixed)}</div>
      </>}
    </div>
  </div>;
}

// ─── BUDGET MANAGER ──────────────────────────────────────────
function BudgetManager({data,save,month}){
  const [localCats,setLocalCats]=useState(()=>deepClone(getMonthBudget(data,month)));
  const [form,setForm]=useState({name:"",baseAmount:"",freq:"monthly",freqDays:1});
  const [editing,setEditing]=useState(null);
  const [copyFrom,setCopyFrom]=useState("");
  const [dirty,setDirty]=useState(false);

  useEffect(()=>{setLocalCats(deepClone(getMonthBudget(data,month)));setDirty(false);},[month]);

  const total=localCats.reduce((s,c)=>s+Number(c.budget),0);

  const addCat=()=>{
    if(!form.name||!form.baseAmount)return;
    const monthly=computeMonthly(form.baseAmount,form.freq,form.freqDays);
    setLocalCats([...localCats,{id:uid(),name:form.name.trim(),baseAmount:Number(form.baseAmount),freq:form.freq,freqDays:Number(form.freqDays)||1,budget:monthly}]);
    setForm({name:"",baseAmount:"",freq:"monthly",freqDays:1});setDirty(true);
  };
  const delCat=id=>{setLocalCats(localCats.filter(c=>c.id!==id));setDirty(true);};
  const saveEdit=()=>{
    if(!editing.name||!editing.baseAmount)return;
    const monthly=computeMonthly(editing.baseAmount,editing.freq,editing.freqDays);
    setLocalCats(localCats.map(c=>c.id===editing.id?{...c,name:editing.name,baseAmount:Number(editing.baseAmount),freq:editing.freq,freqDays:Number(editing.freqDays)||1,budget:monthly}:c));
    setEditing(null);setDirty(true);
  };
  const handleSave=()=>{
    const d=deepClone(data);
    d.monthBudgets[month]=deepClone(localCats);
    if(!d._budgetSavedMonths)d._budgetSavedMonths=[];
    if(!d._budgetSavedMonths.includes(month))d._budgetSavedMonths.push(month);
    for(let m=month+1;m<12;m++){
      if(!d._budgetSavedMonths.includes(m)) d.monthBudgets[m]=deepClone(localCats);
    }
    save(d);setDirty(false);
  };
  const copyBudgetFrom=()=>{
    if(copyFrom==="")return;
    setLocalCats(getMonthBudget(data,Number(copyFrom)).map(c=>({...c,id:uid()})));
    setCopyFrom("");setDirty(true);
  };

  return <div>
    <div style={{...card,background:"#f0fdf4",border:`1px solid #bbf7d0`}}>
      <div style={{fontSize:12,color:S.green,fontWeight:700}}>💡 Budget categories here automatically appear as expense categories in Monthly tab.</div>
    </div>
    <div style={{...card,background:S.surf2,border:`1px solid ${S.borderD}`}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
        <div>
          <div style={{fontSize:13,fontWeight:700,color:S.accent}}>💰 Budget for {MONTH_FULL[month]}</div>
          <div style={{fontSize:11,color:S.muted,marginTop:2}}>Changes carry forward to future months.</div>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
          <select style={{...sel,width:"auto",padding:"6px 10px",fontSize:12}} value={copyFrom} onChange={e=>setCopyFrom(e.target.value)}>
            <option value="">Copy from month...</option>
            {MONTHS.map((m,i)=>i!==month&&<option key={i} value={i}>{m}</option>)}
          </select>
          <Btn onClick={copyBudgetFrom} small outline>Copy</Btn>
        </div>
      </div>
    </div>
    <div style={card}>
      <div style={{fontSize:13,fontWeight:700,marginBottom:4,color:S.accent}}>Add Category</div>
      <div style={{padding:14,background:S.surf2,borderRadius:10,border:`1px solid ${S.border}`,marginBottom:16}}>
        <div style={{marginBottom:10}}><span style={lbl}>Category Name</span><input style={inp} placeholder="Food, Gym, Transport..." value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"flex-end"}}>
          <div style={{minWidth:160}}><span style={lbl}>Frequency</span>
            <select style={sel} value={form.freq} onChange={e=>setForm({...form,freq:e.target.value})}>
              {FREQ_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          {form.freq==="custom"&&<div style={{minWidth:90}}><span style={lbl}>Days/week</span><input style={inp} type="number" min="1" max="7" value={form.freqDays} onChange={e=>setForm({...form,freqDays:Number(e.target.value)||1})}/></div>}
          <div style={{minWidth:130}}><span style={lbl}>{form.freq==="monthly"?"Amount (₱/mo)":form.freq==="weekly"?"Amount (₱/week)":"Amount (₱/occurrence)"}</span><input style={inp} type="number" placeholder="0" value={form.baseAmount} onChange={e=>setForm({...form,baseAmount:e.target.value})}/></div>
          {form.freq!=="monthly"&&form.baseAmount&&<div style={{minWidth:120}}>
            <span style={lbl}>Monthly total</span>
            <div style={{padding:"9px 12px",background:"#dcfce7",borderRadius:9,fontSize:13,fontWeight:700,color:S.green,border:"1px solid #bbf7d0"}}>{fmt(computeMonthly(form.baseAmount,form.freq,form.freqDays))}</div>
          </div>}
        </div>
        <div style={{marginTop:12}}><Btn onClick={addCat} color={S.green} full>+ Add Category</Btn></div>
      </div>
      {localCats.length===0&&<p style={{color:S.muted,fontSize:13,textAlign:"center",padding:"20px 0"}}>No categories yet.</p>}
      {localCats.map(c=>(
        <div key={c.id} style={{padding:"12px 0",borderTop:`1px solid ${S.border}`}}>
          {editing?.id===c.id?(
            <div style={{background:S.surf2,borderRadius:10,padding:14,border:`1px solid ${S.borderD}`}}>
              <div style={{marginBottom:10}}><span style={lbl}>Category Name</span><input style={inp} value={editing.name} onChange={e=>setEditing({...editing,name:e.target.value})}/></div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"flex-end"}}>
                <div style={{minWidth:160}}><span style={lbl}>Frequency</span>
                  <select style={sel} value={editing.freq} onChange={e=>setEditing({...editing,freq:e.target.value})}>
                    {FREQ_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                {editing.freq==="custom"&&<div style={{minWidth:90}}><span style={lbl}>Days/week</span><input style={inp} type="number" value={editing.freqDays} onChange={e=>setEditing({...editing,freqDays:Number(e.target.value)||1})}/></div>}
                <div style={{minWidth:130}}><span style={lbl}>Amount</span><input style={inp} type="number" value={editing.baseAmount} onChange={e=>setEditing({...editing,baseAmount:e.target.value})}/></div>
              </div>
              <div style={{display:"flex",gap:8,marginTop:12}}><Btn onClick={saveEdit} color={S.green} small>Save</Btn><Btn onClick={()=>setEditing(null)} outline small>Cancel</Btn></div>
            </div>
          ):(
            <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
              <div style={{flex:2,minWidth:120}}>
                <div style={{fontSize:13,fontWeight:600}}>{c.name}</div>
                <div style={{fontSize:10,color:S.muted,marginTop:2}}>
                  {c.freq!=="monthly"&&<span>₱{(c.baseAmount||0).toLocaleString()} {c.freq==="weekly"?"/ week":`/ occurrence (${c.freqDays||1}×/wk)`} → </span>}
                  <span style={{color:S.green,fontWeight:600}}>{fmt(c.budget)}/mo</span>
                  <span style={{color:S.muted}}> · {freqLabel(c)}</span>
                </div>
              </div>
              <div style={{fontWeight:700,fontSize:15,color:S.accent,minWidth:90}}>{fmt(c.budget)}<span style={{fontSize:10,color:S.muted,fontWeight:400}}>/mo</span></div>
              <div style={{display:"flex",gap:6}}>
                <button onClick={()=>setEditing({...c,baseAmount:c.baseAmount||c.budget})} style={{background:S.surf2,border:`1px solid ${S.border}`,color:S.muted,padding:"5px 11px",borderRadius:8,cursor:"pointer",fontSize:12}}>✏️</button>
                <button onClick={()=>delCat(c.id)} style={{background:"#fff0f0",border:`1px solid #fecaca`,color:S.red,padding:"5px 11px",borderRadius:8,cursor:"pointer",fontSize:12}}>🗑</button>
              </div>
            </div>
          )}
        </div>
      ))}
      {localCats.length>0&&<div style={{borderTop:`2px solid ${S.borderD}`,marginTop:8,paddingTop:12,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontSize:13,color:S.muted,fontWeight:600}}>Total Monthly Budget</span>
        <span style={{fontSize:16,fontWeight:700,color:S.accent}}>{fmt(total)}</span>
      </div>}
      <div style={{marginTop:16}}><Btn onClick={handleSave} color={dirty?S.accent:"#9ca3af"} full>{dirty?"💾 Save & Apply Forward":"✓ No Unsaved Changes"}</Btn></div>
    </div>
  </div>;
}

// ─── GOALS ───────────────────────────────────────────────────
function Goals({data,save}){
  const [editing,setEditing]=useState(null);
  const [val,setVal]=useState(0);
  return <div>
    <p style={{margin:"0 0 16px",fontSize:13,color:S.muted}}>Goals 2026 — savings logged monthly auto-update these.</p>
    {GOALS.map(g=>{
      const saved=Number(data.goals?.[g.id]||0);
      const pct=Math.min((saved/g.target)*100,100);
      return <div key={g.id} style={card}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
          <div><div style={{fontWeight:700,fontSize:14}}>{g.icon} {g.name}</div><div style={{fontSize:11,color:S.muted}}>Target: {fmt(g.target)}</div></div>
          <div style={{textAlign:"right"}}><div style={{fontWeight:700,color:g.color,fontSize:16}}>{fmt(saved)}</div><div style={{fontSize:11,color:S.muted}}>{pct.toFixed(1)}% · {fmt(g.target-saved)} to go</div></div>
        </div>
        <div style={{background:S.bg,borderRadius:6,height:10,marginBottom:12,border:`1px solid ${S.border}`}}><div style={{width:`${pct}%`,background:g.color,borderRadius:6,height:"100%",transition:"width 0.4s"}}/></div>
        {editing===g.id?
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <input type="number" style={{...inp,flex:1}} value={val} onChange={e=>setVal(e.target.value)}/>
            <Btn onClick={()=>{save({...data,goals:{...data.goals,[g.id]:Number(val)}});setEditing(null);}} color={g.color} small>Save</Btn>
            <Btn onClick={()=>setEditing(null)} outline small>Cancel</Btn>
          </div>:
          <Btn onClick={()=>{setEditing(g.id);setVal(data.goals?.[g.id]||0);}} outline small>Edit manually</Btn>
        }
      </div>;
    })}
  </div>;
}

// ─── SUBSCRIPTIONS ───────────────────────────────────────────
function Subscriptions({data,save,month,md}){
  const [form,setForm]=useState({name:"",amount:"",due:"",category:""});
  const [localSubs,setLocalSubs]=useState(()=>deepClone(data.subscriptions||[]));
  const [dirty,setDirty]=useState(false);
  useEffect(()=>{setLocalSubs(deepClone(data.subscriptions||[]));setDirty(false);},[month]);

  const subs=data.subscriptions||[];
  const subsPaid=md.subsPaid||{};
  const total=subs.reduce((s,x)=>s+Number(x.amount),0);
  const paidTotal=subs.filter(s=>subsPaid[s.id]).reduce((acc,s)=>acc+Number(s.amount),0);

  const handleSave=()=>{const d=deepClone(data);d.subscriptions=deepClone(localSubs);save(d);setDirty(false);};
  const togglePaid=id=>{const d=deepClone(data);if(!d.months[month].subsPaid)d.months[month].subsPaid={};d.months[month].subsPaid[id]=!subsPaid[id];save(d);};

  const groups=SUB_CATS.reduce((acc,cat)=>{acc[cat]=subs.filter(x=>x.category===cat);return acc;},{});
  const uncategorized=subs.filter(x=>!x.category||!SUB_CATS.includes(x.category));

  return <div>
    <div style={card}>
      <div style={{fontSize:13,fontWeight:700,marginBottom:12,color:S.accent}}>Add Subscription</div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"flex-end"}}>
        <div style={{flex:2,minWidth:120}}><span style={lbl}>Name</span><input style={inp} placeholder="Netflix, Notion..." value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></div>
        <div style={{flex:1,minWidth:80}}><span style={lbl}>Amount (₱)</span><input style={inp} type="number" placeholder="0" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})}/></div>
        <div style={{flex:1,minWidth:80}}><span style={lbl}>Due</span><input style={inp} placeholder="15th" value={form.due} onChange={e=>setForm({...form,due:e.target.value})}/></div>
        <div style={{flex:1,minWidth:130}}><span style={lbl}>Category</span><CatSelect value={form.category} onChange={v=>setForm({...form,category:v})} cats={SUB_CATS}/></div>
        <Btn onClick={()=>{if(!form.name||!form.amount)return;setLocalSubs([...localSubs,{...form,id:uid()}]);setForm({name:"",amount:"",due:"",category:""});setDirty(true);}}>+ Add</Btn>
      </div>
      <div style={{marginTop:14}}>
        {localSubs.map(s=><div key={s.id} style={{display:"flex",alignItems:"flex-end",gap:8,padding:"10px 0",borderTop:`1px solid ${S.border}`,flexWrap:"wrap"}}>
          <EditableField value={s.name} onChange={v=>{setLocalSubs(ls=>ls.map(x=>x.id===s.id?{...x,name:v}:x));setDirty(true);}} style={{flex:2,minWidth:120}}/>
          <EditableField value={String(s.amount)} onChange={v=>{setLocalSubs(ls=>ls.map(x=>x.id===s.id?{...x,amount:v}:x));setDirty(true);}} type="number" prefix="₱" style={{flex:1,minWidth:90}}/>
          <EditableField value={s.due||""} onChange={v=>{setLocalSubs(ls=>ls.map(x=>x.id===s.id?{...x,due:v}:x));setDirty(true);}} placeholder="Due" style={{flex:1,minWidth:90}}/>
          <div style={{flex:1,minWidth:110}}><span style={lbl}>Category</span><CatSelect value={s.category} onChange={v=>{setLocalSubs(ls=>ls.map(x=>x.id===s.id?{...x,category:v}:x));setDirty(true);}} cats={SUB_CATS}/></div>
          <button onClick={()=>{setLocalSubs(ls=>ls.filter(x=>x.id!==s.id));setDirty(true);}} style={{background:"none",border:"none",color:S.red,cursor:"pointer",fontSize:20,lineHeight:1,paddingBottom:8}}>×</button>
        </div>)}
        <div style={{marginTop:14}}><Btn onClick={handleSave} color={dirty?S.accent:"#9ca3af"} full>{dirty?"💾 Save Subscriptions":"✓ No Unsaved Changes"}</Btn></div>
      </div>
    </div>
    <div style={card}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
        <div><div style={{fontSize:13,fontWeight:700,color:S.accent}}>📋 {MONTH_FULL[month]} Checklist</div></div>
        <div style={{textAlign:"right"}}><div style={{fontSize:12,color:S.green,fontWeight:700}}>{fmt(paidTotal)} paid</div><div style={{fontSize:11,color:S.red}}>{fmt(total-paidTotal)} pending</div></div>
      </div>
      {subs.length>0&&<div style={{margin:"10px 0 14px"}}><div style={{background:S.bg,borderRadius:6,height:8,border:`1px solid ${S.border}`}}><div style={{width:`${total>0?(paidTotal/total)*100:0}%`,background:S.green,borderRadius:6,height:"100%"}}/></div><div style={{fontSize:10,color:S.muted,marginTop:4}}>{subs.filter(s=>subsPaid[s.id]).length} of {subs.length} paid</div></div>}
      {subs.length===0&&<p style={{color:S.muted,fontSize:13}}>No subscriptions yet.</p>}
      {SUB_CATS.map(cat=>{const items=groups[cat]||[];if(!items.length)return null;return <div key={cat}><div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:1,color:S.accent,padding:"10px 0 6px",borderTop:`1px solid ${S.border}`}}>{cat}</div>{items.map(s=><SubCheckRow key={s.id} s={s} paid={!!subsPaid[s.id]} onToggle={()=>togglePaid(s.id)}/>)}</div>;})}
      {uncategorized.length>0&&<div><div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",color:S.muted,padding:"10px 0 6px",borderTop:`1px solid ${S.border}`}}>Uncategorized</div>{uncategorized.map(s=><SubCheckRow key={s.id} s={s} paid={!!subsPaid[s.id]} onToggle={()=>togglePaid(s.id)}/>)}</div>}
      {subs.length>0&&<div style={{borderTop:`1px solid ${S.border}`,marginTop:8,paddingTop:10,display:"flex",justifyContent:"space-between",fontWeight:700,fontSize:13}}><span style={{color:S.muted}}>Total /mo</span><span style={{color:S.accent}}>{fmt(total)}</span></div>}
    </div>
  </div>;
}
function SubCheckRow({s,paid,onToggle}){
  return <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderTop:`1px solid ${S.border}`}}>
    <button onClick={onToggle} style={{flexShrink:0,width:22,height:22,borderRadius:6,border:`2px solid ${paid?S.green:S.border}`,background:paid?S.green:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
      {paid&&<span style={{color:"#fff",fontSize:13}}>✓</span>}
    </button>
    <div style={{flex:1}}><div style={{fontSize:13,fontWeight:paid?400:600,color:paid?S.muted:S.text,textDecoration:paid?"line-through":"none"}}>{s.name}</div>{s.due&&<div style={{fontSize:11,color:S.muted}}>Due: {s.due}</div>}</div>
    <span style={{fontWeight:700,fontSize:13,color:paid?S.green:S.accent}}>{fmt(s.amount)}</span>
    {paid&&<span style={{fontSize:10,background:"#dcfce7",color:S.green,padding:"2px 7px",borderRadius:6,fontWeight:600}}>PAID</span>}
  </div>;
}

// ─── CREDIT CARD ─────────────────────────────────────────────
function Credit({data,save,month}){
  const liabCC=(data.liabilities||[]).filter(l=>l.category==="Credit Card").map(l=>({id:`liab_${l.id}`,name:l.name,color:"#7c3aed",isLiab:true,liabId:l.id}));
  return <div>
    {liabCC.length===0&&<div style={{...card,textAlign:"center",color:S.muted,padding:40}}>No credit cards yet. Add one under <b>🏦 Liabilities</b> with category <b>Credit Card</b> — it'll appear here automatically.</div>}
    {liabCC.map(cd=><CardSection key={cd.id} cd={cd} data={data} save={save} month={month}/>)}
  </div>;
}

function CardSection({cd,data,save,month}){
  const [txF,setTxF]=useState({description:"",category:"",amount:"",date:""});
  const [pmtF,setPmtF]=useState({amount:"",date:"",notes:""});
  const [editing,setEditing]=useState(false);
  const [ev,setEv]=useState({limit:"",balance:"",dueDate:""});

  const budgetCats=getMonthBudget(data,month);

  let c;
  if(cd.isLiab){
    const liab=(data.liabilities||[]).find(l=>l.id===cd.liabId)||{};
    c={limit:liab.creditLimit||0,balance:liab.currentBalance||0,dueDate:liab.dueDate||"",transactions:liab.transactions||[],payments:liab.payments||[]};
  } else {
    c=data.cards?.[cd.id]||mkCard();
  }

  const upd=(fn)=>{const d=deepClone(data);if(!d.cards)d.cards={};if(!cd.isLiab&&!d.cards[cd.id])d.cards[cd.id]=mkCard();fn(d);save(d);};

  const saveSettings=()=>{
    upd(d=>{
      if(cd.isLiab){const l=d.liabilities.find(x=>x.id===cd.liabId);if(l){l.creditLimit=Number(ev.limit)||0;l.currentBalance=Number(ev.balance)||0;l.dueDate=ev.dueDate||"";}}
      else{d.cards[cd.id].limit=Number(ev.limit)||0;d.cards[cd.id].balance=Number(ev.balance)||0;d.cards[cd.id].dueDate=ev.dueDate||"";}
    });
    setEditing(false);
  };

  const addTx=()=>{
    if(!txF.description||!txF.amount)return;
    upd(d=>{
      const tx={...txF,month,id:uid()};
      if(cd.isLiab){const l=d.liabilities.find(x=>x.id===cd.liabId);l.transactions=[...(l.transactions||[]),tx];l.currentBalance=Number(l.currentBalance||0)+Number(txF.amount);}
      else{d.cards[cd.id].transactions=[...(c.transactions||[]),tx];d.cards[cd.id].balance=Number(c.balance)+Number(txF.amount);}
    });
    setTxF({description:"",category:"",amount:"",date:""});
  };

  const delTx=id=>{
    upd(d=>{
      if(cd.isLiab){const l=d.liabilities.find(x=>x.id===cd.liabId);const tx=(l.transactions||[]).find(x=>x.id===id);l.transactions=(l.transactions||[]).filter(x=>x.id!==id);if(tx)l.currentBalance=Math.max(0,Number(l.currentBalance||0)-Number(tx.amount));}
      else{const tx=(c.transactions||[]).find(x=>x.id===id);d.cards[cd.id].transactions=(c.transactions||[]).filter(x=>x.id!==id);if(tx)d.cards[cd.id].balance=Math.max(0,Number(c.balance)-Number(tx.amount));}
    });
  };

  const addPmt=()=>{
    if(!pmtF.amount)return;
    upd(d=>{
      const pmt={...pmtF,month,id:uid()};
      if(cd.isLiab){const l=d.liabilities.find(x=>x.id===cd.liabId);l.payments=[...(l.payments||[]),pmt];l.currentBalance=Math.max(0,Number(l.currentBalance||0)-Number(pmtF.amount));}
      else{d.cards[cd.id].payments=[...(c.payments||[]),pmt];d.cards[cd.id].balance=Math.max(0,Number(c.balance)-Number(pmtF.amount));}
    });
    setPmtF({amount:"",date:"",notes:""});
  };

  const delPmt=id=>{
    upd(d=>{
      if(cd.isLiab){const l=d.liabilities.find(x=>x.id===cd.liabId);const p=(l.payments||[]).find(x=>x.id===id);l.payments=(l.payments||[]).filter(x=>x.id!==id);if(p)l.currentBalance=Number(l.currentBalance||0)+Number(p.amount);}
      else{const p=(c.payments||[]).find(x=>x.id===id);d.cards[cd.id].payments=(c.payments||[]).filter(x=>x.id!==id);if(p)d.cards[cd.id].balance=Number(c.balance)+Number(p.amount);}
    });
  };

  const monthTx=(c.transactions||[]).filter(x=>x.month===month);
  const monthPmt=(c.payments||[]).filter(x=>x.month===month);
  const util=c.limit>0?Math.min((c.balance/c.limit)*100,100):0;
  const available=Math.max(0,Number(c.limit)-Number(c.balance));
  const utilColor=util>75?S.red:util>50?S.yellow:S.green;

  // ── delete entire card (built-in cards only) ──
  const deleteAllTransactions=()=>{
    if(!window.confirm(`Delete ALL transactions and payments for ${cd.name}? Balance will reset to 0.`))return;
    upd(d=>{d.cards[cd.id]={...mkCard(),limit:c.limit,dueDate:c.dueDate};});
  };

  return <div style={{...card,borderTop:`4px solid ${cd.color}`}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}}>
      <div style={{fontWeight:700,fontSize:16,color:cd.color}}>💳 {cd.name}{cd.isLiab&&<span style={{fontSize:10,background:"#f5f3ff",color:S.purple,padding:"2px 7px",borderRadius:5,marginLeft:8}}>Liability</span>}</div>
      <div style={{display:"flex",gap:6}}>
        {!cd.isLiab&&<button onClick={deleteAllTransactions} style={{background:"#fff0f0",border:`1px solid #fecaca`,color:S.red,padding:"5px 11px",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:600}}>🗑 Clear Card</button>}
        <Btn onClick={()=>{setEv({limit:c.limit||"",balance:c.balance||"",dueDate:c.dueDate||""});setEditing(!editing);}} outline small>{editing?"✕":"⚙ Settings"}</Btn>
      </div>
    </div>
    {editing&&<div style={{background:"#eff6ff",borderRadius:10,padding:14,marginBottom:14,border:`1px solid #bfdbfe`}}>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"flex-end"}}>
        <div style={{flex:1,minWidth:110}}><span style={lbl}>Credit Limit (₱)</span><input style={inp} type="number" value={ev.limit} onChange={e=>setEv({...ev,limit:e.target.value})}/></div>
        <div style={{flex:1,minWidth:110}}><span style={lbl}>Current Balance (₱)</span><input style={inp} type="number" value={ev.balance} onChange={e=>setEv({...ev,balance:e.target.value})}/></div>
        <div style={{flex:1,minWidth:110}}><span style={lbl}>Due Date</span><input style={inp} type="date" value={ev.dueDate} onChange={e=>setEv({...ev,dueDate:e.target.value})}/></div>
        <Btn onClick={saveSettings} color={cd.color} small>Save</Btn>
      </div>
    </div>}
    <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:14}}>
      {[["Limit",fmt(c.limit),S.text],["Balance",fmt(c.balance),S.red],["Available",fmt(available),S.green],c.dueDate&&["Due",c.dueDate,S.yellow]].filter(Boolean).map(([l,v,col])=>(
        <div key={l} style={{flex:1,minWidth:90,background:S.surf2,borderRadius:10,padding:"10px 12px",border:`1px solid ${S.border}`}}>
          <div style={{fontSize:10,color:S.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:0.4,marginBottom:3}}>{l}</div>
          <div style={{fontWeight:700,fontSize:14,color:col}}>{v}</div>
        </div>
      ))}
    </div>
    <div style={{marginBottom:14}}>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:4}}><span style={{color:S.muted}}>Utilization</span><span style={{fontWeight:700,color:utilColor}}>{util.toFixed(1)}%</span></div>
      <div style={{background:S.bg,borderRadius:6,height:8,border:`1px solid ${S.border}`}}><div style={{width:`${util}%`,background:utilColor,borderRadius:6,height:"100%"}}/></div>
    </div>
    {/* Add Charge */}
    <div style={{marginBottom:14}}>
      <div style={{fontSize:12,fontWeight:700,marginBottom:8}}>Add Charge</div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"flex-end"}}>
        <div style={{flex:2,minWidth:120}}><span style={lbl}>Description</span><input style={inp} placeholder="Online purchase..." value={txF.description} onChange={e=>setTxF({...txF,description:e.target.value})}/></div>
        <div style={{flex:1,minWidth:120}}><span style={lbl}>Category</span><CatSelect value={txF.category} onChange={v=>setTxF({...txF,category:v})} budgetCats={budgetCats}/></div>
        <div style={{flex:1,minWidth:80}}><span style={lbl}>Amount (₱)</span><input style={inp} type="number" placeholder="0" value={txF.amount} onChange={e=>setTxF({...txF,amount:e.target.value})}/></div>
        <div style={{flex:1,minWidth:100}}><span style={lbl}>Date</span><input style={inp} type="date" value={txF.date} onChange={e=>setTxF({...txF,date:e.target.value})}/></div>
        <Btn onClick={addTx} color={cd.color} small>+ Add</Btn>
      </div>
    </div>
    {/* This month's charges */}
    {monthTx.length>0&&<div style={{marginBottom:14}}>
      <div style={{fontSize:11,fontWeight:700,color:S.muted,textTransform:"uppercase",letterSpacing:0.5,marginBottom:6}}>{MONTH_FULL[month]} Charges</div>
      {monthTx.map(x=><div key={x.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderTop:`1px solid ${S.border}`,fontSize:13}}>
        <div style={{flex:1}}><div>{x.description}</div><div style={{fontSize:11,color:S.muted}}>{[x.category,x.date].filter(Boolean).join(" · ")}</div></div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <span style={{color:S.red,fontWeight:600}}>{fmt(x.amount)}</span>
          <button onClick={()=>delTx(x.id)} title="Delete transaction" style={{background:"#fff0f0",border:`1px solid #fecaca`,color:S.red,borderRadius:7,cursor:"pointer",fontSize:13,padding:"3px 9px",fontWeight:700}}>🗑</button>
        </div>
      </div>)}
      <div style={{paddingTop:8,display:"flex",justifyContent:"flex-end",fontSize:12,fontWeight:700,color:S.red}}>Month Total: {fmt(monthTx.reduce((s,x)=>s+Number(x.amount),0))}</div>
    </div>}
    {/* Repayment */}
    <div style={{background:"#f0fdf4",borderRadius:10,padding:14,border:`1px solid #bbf7d0`}}>
      <div style={{fontSize:13,fontWeight:700,marginBottom:10,color:S.green}}>💸 Log Repayment</div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"flex-end"}}>
        <div style={{flex:1,minWidth:100}}><span style={lbl}>Amount (₱)</span><input style={inp} type="number" placeholder="0" value={pmtF.amount} onChange={e=>setPmtF({...pmtF,amount:e.target.value})}/></div>
        <div style={{flex:1,minWidth:100}}><span style={lbl}>Date</span><input style={inp} type="date" value={pmtF.date} onChange={e=>setPmtF({...pmtF,date:e.target.value})}/></div>
        <div style={{flex:2,minWidth:130}}><span style={lbl}>Notes</span><input style={inp} placeholder="Full payment..." value={pmtF.notes} onChange={e=>setPmtF({...pmtF,notes:e.target.value})}/></div>
        <Btn onClick={addPmt} color={S.green} small>+ Pay</Btn>
      </div>
      {monthPmt.length>0&&<div style={{marginTop:10}}>
        {monthPmt.map(p=><div key={p.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderTop:`1px solid #bbf7d0`,fontSize:13}}>
          <div><span style={{color:S.green,fontWeight:600}}>{fmt(p.amount)}</span>{p.notes&&<span style={{fontSize:11,color:S.muted,marginLeft:8}}>{p.notes}</span>}{p.date&&<span style={{fontSize:11,color:S.muted,marginLeft:8}}>{p.date}</span>}</div>
          <button onClick={()=>delPmt(p.id)} title="Delete payment" style={{background:"#fff0f0",border:`1px solid #fecaca`,color:S.red,borderRadius:7,cursor:"pointer",fontSize:13,padding:"3px 9px",fontWeight:700}}>🗑</button>
        </div>)}
      </div>}
    </div>
  </div>;
}

// ─── LIABILITIES ─────────────────────────────────────────────
function Liabilities({data,save,month,md,budgetCats}){
  const [form,setForm]=useState({name:"",category:"Debt",totalAmount:"",currentBalance:"",interestRate:"",minPayment:"",dueDate:"",creditLimit:"",notes:""});
  const [snowballMode,setSnowballMode]=useState("avalanche");
  const [extraPayment,setExtraPayment]=useState(0);

  const liabs=data.liabilities||[];
  const totalDebt=liabs.reduce((s,l)=>s+Number(l.currentBalance||0),0);
  const liabPaid=md.liabPaid||{};
  const totalChecked=liabs.filter(l=>liabPaid[l.id]).reduce((s,l)=>s+Number(l.minPayment||0),0);

  const addLiab=()=>{
    if(!form.name||!form.currentBalance)return;
    const d=deepClone(data);
    d.liabilities=[...d.liabilities,{...form,id:uid(),transactions:[],payments:[],createdMonth:month}];
    save(d);
    setForm({name:"",category:"Debt",totalAmount:"",currentBalance:"",interestRate:"",minPayment:"",dueDate:"",creditLimit:"",notes:""});
  };
  const delLiab=id=>{const d=deepClone(data);d.liabilities=d.liabilities.filter(l=>l.id!==id);save(d);};
  const logPayment=(liab,amt)=>{
    if(!amt)return;
    const d=deepClone(data);
    const l=d.liabilities.find(x=>x.id===liab.id);
    l.currentBalance=Math.max(0,Number(l.currentBalance||0)-Number(amt));
    if(!l.payments)l.payments=[];
    l.payments.push({amount:amt,month,date:new Date().toISOString().slice(0,10),id:uid()});
    save(d);
  };

  // Toggle min payment checkbox — also auto-adds to variable expenses
  const toggleLiabPaid=(liab)=>{
    const d=deepClone(data);
    if(!d.months[month].liabPaid)d.months[month].liabPaid={};
    const wasPaid=d.months[month].liabPaid[liab.id];
    d.months[month].liabPaid[liab.id]=!wasPaid;
    if(!d.months[month].variable)d.months[month].variable=[];
    if(!wasPaid){
      // Add to variable expenses
      d.months[month].variable.push({
        id:`liab_auto_${liab.id}_${month}`,
        description:`${liab.name} min payment`,
        category:"Liability Payment",
        amount:Number(liab.minPayment||0),
        autoLiab:true,
        liabId:liab.id,
      });
      // Also reduce balance
      const l=d.liabilities.find(x=>x.id===liab.id);
      if(l){
        l.currentBalance=Math.max(0,Number(l.currentBalance||0)-Number(liab.minPayment||0));
        if(!l.payments)l.payments=[];
        l.payments.push({amount:liab.minPayment,month,date:new Date().toISOString().slice(0,10),id:uid(),auto:true,note:"Min payment (auto)"});
      }
    } else {
      // Remove from variable
      d.months[month].variable=d.months[month].variable.filter(x=>!(x.autoLiab&&x.liabId===liab.id));
      // Restore balance
      const l=d.liabilities.find(x=>x.id===liab.id);
      if(l){
        l.currentBalance=Number(l.currentBalance||0)+Number(liab.minPayment||0);
        l.payments=(l.payments||[]).filter(x=>!(x.auto&&x.month===month&&x.liabId!==undefined||x.auto&&x.month===month));
      }
    }
    save(d);
  };

  const calcPayoff=(method)=>{
    let debts=liabs.map(l=>({...l,bal:Number(l.currentBalance||0),rate:Number(l.interestRate||0)/100/12,min:Number(l.minPayment||0)})).filter(d=>d.bal>0);
    if(debts.length===0)return [];
    const extra=Number(extraPayment||0);
    debts=method==="snowball"?[...debts].sort((a,b)=>a.bal-b.bal):[...debts].sort((a,b)=>b.rate-a.rate);
    const schedule=[];let months=0;
    while(debts.some(d=>d.bal>0)&&months<360){
      months++;
      debts=debts.map(d=>{if(d.bal<=0)return d;d.bal+=d.bal*d.rate;return d;});
      let freed=0;
      debts=debts.map(d=>{if(d.bal<=0)return d;const pay=Math.min(d.min,d.bal);d.bal=Math.max(0,d.bal-pay);if(d.bal===0)freed+=d.min;return d;});
      let rem=extra+freed;
      debts=debts.map(d=>{if(d.bal<=0||rem<=0)return d;const pay=Math.min(rem,d.bal);d.bal=Math.max(0,d.bal-pay);rem-=pay;return d;});
      schedule.push({month:months,totalBal:debts.reduce((s,d)=>s+d.bal,0)});
      if(debts.every(d=>d.bal===0))break;
    }
    return schedule;
  };

  const sbData=liabs.length>0?calcPayoff(snowballMode):[];
  const payoffMonths=sbData.length;
  const payoffDate=payoffMonths>0?new Date(2026,month+payoffMonths):null;
  const COLOR={Debt:S.red,Loan:S.yellow,["Credit Card"]:S.purple};

  return <div>
    <div style={card}>
      <div style={{fontSize:13,fontWeight:700,marginBottom:4,color:S.red}}>🏦 Total Liabilities</div>
      <div style={{fontSize:26,fontWeight:700,color:S.red}}>{fmt(totalDebt)}</div>
      <div style={{display:"flex",gap:10,marginTop:6,flexWrap:"wrap"}}>
        <span style={{fontSize:12,color:S.muted}}>{liabs.length} active {liabs.length===1?"liability":"liabilities"}</span>
        {totalChecked>0&&<span style={{fontSize:12,color:S.red,fontWeight:600,background:"#fff0f0",padding:"2px 8px",borderRadius:6}}>📤 {fmt(totalChecked)} auto-added to expenses this month</span>}
      </div>
    </div>
    {/* Monthly checklist */}
    {liabs.length>0&&<div style={{...card,border:`2px solid ${S.red}`}}>
      <div style={{fontSize:13,fontWeight:700,marginBottom:4,color:S.red}}>📋 {MONTH_FULL[month]} Min Payment Checklist</div>
      <p style={{fontSize:12,color:S.muted,margin:"0 0 12px"}}>Check each liability when you make the minimum payment — it auto-adds to your monthly expenses under "Liability Payment" category.</p>
      {liabs.map(l=>{
        const paid=!!liabPaid[l.id];
        return <div key={l.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderTop:`1px solid ${S.border}`,flexWrap:"wrap"}}>
          <button onClick={()=>toggleLiabPaid(l)} style={{flexShrink:0,width:24,height:24,borderRadius:7,border:`2px solid ${paid?S.green:S.red}`,background:paid?S.green:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
            {paid&&<span style={{color:"#fff",fontSize:14,fontWeight:700}}>✓</span>}
          </button>
          <div style={{flex:1,minWidth:130}}>
            <div style={{fontSize:13,fontWeight:600,textDecoration:paid?"line-through":"none",color:paid?S.muted:S.text}}>{l.name}</div>
            <div style={{fontSize:11,color:S.muted}}>{l.category}{l.interestRate?` · ${l.interestRate}% p.a.`:""}{l.dueDate?` · Due: ${l.dueDate}`:""}</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontWeight:700,fontSize:14,color:paid?S.green:S.red}}>{fmt(l.minPayment)}<span style={{fontSize:10,color:S.muted,fontWeight:400}}>/mo</span></div>
            <div style={{fontSize:11,color:S.muted}}>Balance: {fmt(l.currentBalance)}</div>
          </div>
          {paid&&<span style={{fontSize:10,background:"#dcfce7",color:S.green,padding:"2px 8px",borderRadius:6,fontWeight:700}}>✓ Added to expenses</span>}
        </div>;
      })}
      <div style={{borderTop:`1px solid ${S.border}`,marginTop:8,paddingTop:10,display:"flex",justifyContent:"space-between",fontSize:13,fontWeight:700}}>
        <span style={{color:S.muted}}>Checked ({liabs.filter(l=>liabPaid[l.id]).length}/{liabs.length})</span>
        <span style={{color:S.red}}>{fmt(totalChecked)}</span>
      </div>
    </div>}
    {/* Add Form */}
    <div style={card}>
      <div style={{fontSize:13,fontWeight:700,marginBottom:12,color:S.accent}}>➕ Add Liability</div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        <div style={{flex:2,minWidth:130}}><span style={lbl}>Name</span><input style={inp} placeholder="BDO Card, SSS Loan..." value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></div>
        <div style={{flex:1,minWidth:130}}><span style={lbl}>Category</span>
          <select style={sel} value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>
            {LIABILITY_CATS.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div style={{flex:1,minWidth:110}}><span style={lbl}>Current Balance (₱)</span><input style={inp} type="number" placeholder="0" value={form.currentBalance} onChange={e=>setForm({...form,currentBalance:e.target.value})}/></div>
        <div style={{flex:1,minWidth:100}}><span style={lbl}>Original Amount (₱)</span><input style={inp} type="number" placeholder="0" value={form.totalAmount} onChange={e=>setForm({...form,totalAmount:e.target.value})}/></div>
        <div style={{flex:1,minWidth:90}}><span style={lbl}>Interest Rate (%)</span><input style={inp} type="number" placeholder="0" value={form.interestRate} onChange={e=>setForm({...form,interestRate:e.target.value})}/></div>
        <div style={{flex:1,minWidth:100}}><span style={lbl}>Min Payment (₱)</span><input style={inp} type="number" placeholder="0" value={form.minPayment} onChange={e=>setForm({...form,minPayment:e.target.value})}/></div>
        {form.category==="Credit Card"&&<div style={{flex:1,minWidth:100}}><span style={lbl}>Credit Limit (₱)</span><input style={inp} type="number" placeholder="0" value={form.creditLimit} onChange={e=>setForm({...form,creditLimit:e.target.value})}/></div>}
        <div style={{flex:1,minWidth:100}}><span style={lbl}>Due Date</span><input style={inp} type="date" value={form.dueDate} onChange={e=>setForm({...form,dueDate:e.target.value})}/></div>
        <div style={{flex:2,minWidth:150}}><span style={lbl}>Notes</span><input style={inp} placeholder="Optional notes" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></div>
      </div>
      <div style={{marginTop:14}}><Btn onClick={addLiab} full>+ Add Liability</Btn></div>
    </div>
    {liabs.map(l=><LiabCard key={l.id} l={l} onDelete={()=>delLiab(l.id)} onPay={amt=>logPayment(l,amt)} month={month} color={COLOR[l.category]||S.muted}/>)}
    {/* Payoff Calculator */}
    {liabs.length>0&&<div style={{...card,border:`1px solid #fde68a`}}>
      <div style={{fontSize:13,fontWeight:700,marginBottom:4,color:S.yellow}}>⚡ Debt Payoff Calculator</div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"flex-end",marginBottom:14}}>
        <div style={{flex:1,minWidth:170}}><span style={lbl}>Strategy</span>
          <select style={sel} value={snowballMode} onChange={e=>setSnowballMode(e.target.value)}>
            <option value="snowball">❄️ Snowball (lowest balance first)</option>
            <option value="avalanche">🏔 Avalanche (highest rate first)</option>
          </select>
        </div>
        <div style={{flex:1,minWidth:130}}><span style={lbl}>Extra Monthly Payment (₱)</span><input style={inp} type="number" placeholder="0" value={extraPayment} onChange={e=>setExtraPayment(e.target.value)}/></div>
      </div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:14}}>
        <MiniStat label="Months to payoff" value={payoffMonths>0?`${payoffMonths} mo`:"—"} color={S.yellow}/>
        <MiniStat label="Debt-free date" value={payoffDate?payoffDate.toLocaleDateString("en-PH",{month:"short",year:"numeric"}):"—"} color={S.green}/>
        <MiniStat label="Min payments total" value={fmt(liabs.reduce((s,l)=>s+Number(l.minPayment||0),0))} sub="/mo"/>
      </div>
      {sbData.length>0&&<ResponsiveContainer width="100%" height={160}>
        <LineChart data={sbData.filter((_,i)=>i%Math.max(1,Math.floor(sbData.length/20))===0||i===sbData.length-1)}>
          <XAxis dataKey="month" tick={{fontSize:10}}/>
          <YAxis tickFormatter={v=>v>=1000?`₱${(v/1000).toFixed(0)}k`:fmt(v)} tick={{fontSize:10}}/>
          <Tooltip formatter={v=>fmt(v)}/>
          <Line type="monotone" dataKey="totalBal" stroke={S.yellow} strokeWidth={2} dot={false} name="Remaining Debt"/>
        </LineChart>
      </ResponsiveContainer>}
    </div>}
  </div>;
}

function LiabCard({l,onDelete,onPay,month,color}){
  const [payAmt,setPayAmt]=useState("");
  const [show,setShow]=useState(false);
  const pct=l.totalAmount>0?Math.min((1-(Number(l.currentBalance)/Number(l.totalAmount)))*100,100):0;
  return <div style={{...card,borderLeft:`4px solid ${color}`}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
      <div>
        <div style={{fontWeight:700,fontSize:14}}>{l.name}</div>
        <div style={{display:"flex",gap:6,marginTop:4,flexWrap:"wrap"}}>
          <span style={{fontSize:11,background:color+"22",color,padding:"2px 8px",borderRadius:5,fontWeight:600}}>{l.category}</span>
          {l.interestRate&&<span style={{fontSize:11,color:S.muted}}>{l.interestRate}% p.a.</span>}
          {l.dueDate&&<span style={{fontSize:11,color:S.muted}}>Due: {l.dueDate}</span>}
        </div>
      </div>
      <div style={{textAlign:"right"}}>
        <div style={{fontSize:20,fontWeight:700,color}}>{fmt(l.currentBalance)}</div>
        {l.totalAmount&&<div style={{fontSize:11,color:S.muted}}>of {fmt(l.totalAmount)}</div>}
      </div>
    </div>
    {l.totalAmount>0&&<div style={{marginBottom:10}}>
      <div style={{background:S.bg,borderRadius:6,height:8,border:`1px solid ${S.border}`}}><div style={{width:`${pct}%`,background:S.green,borderRadius:6,height:"100%"}}/></div>
      <div style={{fontSize:10,color:S.muted,marginTop:3}}>{pct.toFixed(1)}% paid off</div>
    </div>}
    {l.minPayment&&<div style={{fontSize:12,color:S.muted,marginBottom:10}}>Min payment: <b style={{color:S.text}}>{fmt(l.minPayment)}</b>/mo</div>}
    {l.notes&&<div style={{fontSize:12,color:S.muted,marginBottom:10,fontStyle:"italic"}}>{l.notes}</div>}
    <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
      <input type="number" style={{...inp,flex:1,minWidth:110}} placeholder="Extra payment (₱)" value={payAmt} onChange={e=>setPayAmt(e.target.value)}/>
      <Btn onClick={()=>{onPay(payAmt);setPayAmt("");}} color={S.green} small>💸 Extra Payment</Btn>
      <button onClick={()=>setShow(!show)} style={{background:"none",border:`1px solid ${S.border}`,color:S.muted,padding:"5px 10px",borderRadius:8,cursor:"pointer",fontSize:12}}>{show?"Hide":"History"}</button>
      <button onClick={onDelete} style={{background:"#fff0f0",border:`1px solid #fecaca`,color:S.red,padding:"5px 10px",borderRadius:8,cursor:"pointer",fontSize:12}}>🗑</button>
    </div>
    {show&&(l.payments||[]).length>0&&<div style={{marginTop:10}}>
      <div style={{fontSize:11,fontWeight:700,color:S.muted,textTransform:"uppercase",letterSpacing:0.5,marginBottom:6}}>Payment History</div>
      {(l.payments||[]).slice().reverse().map(p=><div key={p.id} style={{display:"flex",justifyContent:"space-between",fontSize:12,padding:"5px 0",borderTop:`1px solid ${S.border}`,color:S.muted}}>
        <span>{MONTHS[p.month??month]} {p.date}{p.note?` · ${p.note}`:""}</span>
        <span style={{color:S.green,fontWeight:600}}>{fmt(p.amount)}</span>
      </div>)}
    </div>}
  </div>;
}

// ─── RECEIVABLES ─────────────────────────────────────────────
function Receivables({data,save,month,md}){
  const [form,setForm]=useState({name:"",amount:"",dueDate:"",notes:"",category:""});
  const recs=data.receivables||[];
  const pending=recs.filter(r=>!r.received&&!r.cancelled);
  const received=recs.filter(r=>r.received);
  const cancelled=recs.filter(r=>r.cancelled);
  const totalPending=pending.reduce((s,r)=>s+Number(r.amount),0);
  const totalReceived=received.reduce((s,r)=>s+Number(r.amount),0);

  const upd=fn=>{const d=deepClone(data);fn(d);save(d);};

  const addRec=()=>{
    if(!form.name||!form.amount)return;
    upd(d=>{d.receivables=[...d.receivables,{...form,id:uid(),createdMonth:month,received:false,cancelled:false}];});
    setForm({name:"",amount:"",dueDate:"",notes:"",category:""});
  };

  const markReceived=(r)=>{
    upd(d=>{
      // Mark as received
      d.receivables=d.receivables.map(x=>x.id===r.id?{...x,received:true,receivedMonth:month,receivedDate:new Date().toISOString().slice(0,10)}:x);
      // Auto-add to this month's income
      if(!d.months[month].income)d.months[month].income=[];
      d.months[month].income.push({id:uid(),source:`${r.name} (receivable)`,amount:r.amount,fromReceivable:true,receivableId:r.id});
    });
  };

  const unmarkReceived=(r)=>{
    upd(d=>{
      d.receivables=d.receivables.map(x=>x.id===r.id?{...x,received:false,receivedMonth:undefined,receivedDate:undefined}:x);
      // Remove from income
      d.months[month].income=(d.months[month].income||[]).filter(x=>!(x.fromReceivable&&x.receivableId===r.id));
    });
  };

  const markCancelled=id=>upd(d=>{d.receivables=d.receivables.map(x=>x.id===id?{...x,cancelled:true}:x);});
  const deleteRec=id=>upd(d=>{d.receivables=d.receivables.filter(x=>x.id!==id);});

  const CATEGORY_COLORS={Salary:S.green,Freelance:S.blue,Loan:S.yellow,Business:S.purple,Gift:S.accent,Other:S.muted};

  return <div>
    <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:14}}>
      <MiniStat label="Pending" value={fmt(totalPending)} color={S.teal}/>
      <MiniStat label="Received (all time)" value={fmt(totalReceived)} color={S.green}/>
      <MiniStat label="Count" value={`${pending.length} pending`} color={S.muted}/>
    </div>
    {/* Add */}
    <div style={card}>
      <div style={{fontSize:13,fontWeight:700,marginBottom:12,color:S.teal}}>📥 Add Receivable</div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"flex-end"}}>
        <div style={{flex:2,minWidth:140}}><span style={{...lbl,color:S.teal}}>From / Description</span><input style={inp} placeholder="Client name, loan from..." value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></div>
        <div style={{flex:1,minWidth:100}}><span style={{...lbl,color:S.teal}}>Amount (₱)</span><input style={inp} type="number" placeholder="0" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})}/></div>
        <div style={{flex:1,minWidth:130}}><span style={{...lbl,color:S.teal}}>Category</span>
          <select style={sel} value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>
            <option value="">Select...</option>
            {["Salary","Freelance","Loan","Business","Gift","Other"].map(c=><option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div style={{flex:1,minWidth:110}}><span style={{...lbl,color:S.teal}}>Expected Date</span><input style={inp} type="date" value={form.dueDate} onChange={e=>setForm({...form,dueDate:e.target.value})}/></div>
        <div style={{flex:2,minWidth:150}}><span style={{...lbl,color:S.teal}}>Notes</span><input style={inp} placeholder="Invoice #, reason..." value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></div>
        <Btn onClick={addRec} color={S.teal}>+ Add</Btn>
      </div>
    </div>
    {/* Pending */}
    {pending.length>0&&<div style={{...card,border:`2px solid ${S.teal}`}}>
      <div style={{fontSize:13,fontWeight:700,marginBottom:12,color:S.teal}}>⏳ Pending Receivables</div>
      {pending.map(r=><RecRow key={r.id} r={r} onReceive={()=>markReceived(r)} onCancel={()=>markCancelled(r.id)} onDelete={()=>deleteRec(r.id)} catColor={CATEGORY_COLORS[r.category]||S.muted} mode="pending"/>)}
      <div style={{borderTop:`1px solid #99f6e4`,marginTop:8,paddingTop:10,display:"flex",justifyContent:"space-between",fontWeight:700,fontSize:13}}>
        <span style={{color:S.muted}}>Total Pending</span><span style={{color:S.teal}}>{fmt(totalPending)}</span>
      </div>
    </div>}
    {/* Received */}
    {received.length>0&&<div style={card}>
      <div style={{fontSize:13,fontWeight:700,marginBottom:12,color:S.green}}>✅ Received (transferred to income)</div>
      {received.map(r=><RecRow key={r.id} r={r} onUnreceive={()=>unmarkReceived(r)} onDelete={()=>deleteRec(r.id)} catColor={CATEGORY_COLORS[r.category]||S.muted} mode="received" month={month}/>)}
    </div>}
    {/* Cancelled */}
    {cancelled.length>0&&<div style={card}>
      <div style={{fontSize:13,fontWeight:700,marginBottom:12,color:S.muted}}>❌ Cancelled</div>
      {cancelled.map(r=><RecRow key={r.id} r={r} onDelete={()=>deleteRec(r.id)} catColor={CATEGORY_COLORS[r.category]||S.muted} mode="cancelled"/>)}
    </div>}
    {recs.length===0&&<div style={{...card,textAlign:"center",color:S.muted,padding:40}}>No receivables yet. Add money owed to you above.</div>}
  </div>;
}

function RecRow({r,onReceive,onUnreceive,onCancel,onDelete,catColor,mode,month}){
  return <div style={{display:"flex",alignItems:"flex-start",gap:10,padding:"12px 0",borderTop:`1px solid ${S.border}`,flexWrap:"wrap"}}>
    <div style={{flex:1,minWidth:150}}>
      <div style={{fontSize:13,fontWeight:600,color:mode==="cancelled"?S.muted:S.text,textDecoration:mode==="cancelled"?"line-through":"none"}}>{r.name}</div>
      <div style={{display:"flex",gap:6,marginTop:4,flexWrap:"wrap"}}>
        {r.category&&<span style={{fontSize:10,background:catColor+"22",color:catColor,padding:"1px 7px",borderRadius:5,fontWeight:600}}>{r.category}</span>}
        {r.dueDate&&<span style={{fontSize:11,color:S.muted}}>Expected: {r.dueDate}</span>}
        {r.receivedDate&&<span style={{fontSize:11,color:S.green}}>Received: {r.receivedDate}</span>}
        {r.receivedMonth!==undefined&&<span style={{fontSize:11,color:S.green}}>→ {MONTHS[r.receivedMonth]} income</span>}
      </div>
      {r.notes&&<div style={{fontSize:11,color:S.muted,marginTop:3,fontStyle:"italic"}}>{r.notes}</div>}
    </div>
    <div style={{fontWeight:700,fontSize:16,color:mode==="received"?S.green:mode==="cancelled"?S.muted:S.teal,minWidth:90,textAlign:"right"}}>{fmt(r.amount)}</div>
    <div style={{display:"flex",gap:6,flexWrap:"wrap",alignSelf:"center"}}>
      {mode==="pending"&&<>
        <button onClick={onReceive} title="Mark as received — transfers to income" style={{background:"#dcfce7",border:`1px solid #86efac`,color:S.green,padding:"5px 11px",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:600}}>✓ Received</button>
        <button onClick={onCancel} style={{background:"#fff7ed",border:`1px solid #fed7aa`,color:S.yellow,padding:"5px 11px",borderRadius:8,cursor:"pointer",fontSize:12}}>Cancel</button>
      </>}
      {mode==="received"&&r.receivedMonth===month&&<button onClick={onUnreceive} style={{background:"#fff0f0",border:`1px solid #fecaca`,color:S.red,padding:"5px 11px",borderRadius:8,cursor:"pointer",fontSize:12}}>↩ Undo</button>}
      <button onClick={onDelete} style={{background:"#fff0f0",border:`1px solid #fecaca`,color:S.red,padding:"5px 11px",borderRadius:8,cursor:"pointer",fontSize:12}}>🗑</button>
    </div>
  </div>;
}

// ─── SUMMARY ─────────────────────────────────────────────────
function Summary({data,save,month}){
  const [adviceLoading,setAdviceLoading]=useState(false);
  const [targetMonth,setTargetMonth]=useState(month<11?month+1:0);

  const chartData=MONTHS.map((m,i)=>{
    const md=data.months[i]||mkMonth();
    const bc=getMonthBudget(data,i);
    const income=(md.income||[]).reduce((s,x)=>s+Number(x.amount),0);
    const expenses=bc.reduce((s,c)=>s+Number(md.fixedActual?.[c.id]||0),0)+(md.variable||[]).reduce((s,x)=>s+Number(x.amount),0)+(data.subscriptions||[]).reduce((s,x)=>s+Number(x.amount),0);
    const savings=(md.savings||[]).reduce((s,x)=>s+Number(x.amount),0);
    return {month:m,Income:income,Expenses:expenses,Savings:savings,Net:income-expenses-savings};
  });

  const totI=chartData.reduce((s,x)=>s+x.Income,0);
  const totE=chartData.reduce((s,x)=>s+x.Expenses,0);
  const totS=chartData.reduce((s,x)=>s+x.Savings,0);
  const totN=totI-totE-totS;
  const advice=data.financialAdvice?.[month]||"";

  const generateAdvice=async()=>{
    setAdviceLoading(true);
    const md=data.months[month]||mkMonth();
    const bc=getMonthBudget(data,month);
    const income=(md.income||[]).reduce((s,x)=>s+Number(x.amount),0);
    const expenses=bc.reduce((s,c)=>s+Number(md.fixedActual?.[c.id]||0),0)+(md.variable||[]).reduce((s,x)=>s+Number(x.amount),0);
    const savings=(md.savings||[]).reduce((s,x)=>s+Number(x.amount),0);
    const subs=(data.subscriptions||[]).reduce((s,x)=>s+Number(x.amount),0);
    const liabTotal=(data.liabilities||[]).reduce((s,l)=>s+Number(l.currentBalance||0),0);
    const pendingRec=(data.receivables||[]).filter(r=>!r.received&&!r.cancelled).reduce((s,r)=>s+Number(r.amount),0);
    const prompt=`You are a friendly personal finance advisor for a Filipino named Gera. Give concise, warm, actionable advice for ${MONTH_FULL[targetMonth]} based on ${MONTH_FULL[month]} data.

${MONTH_FULL[month]} summary:
- Income: ₱${income} | Expenses: ₱${expenses+subs} | Savings: ₱${savings} | Net: ₱${income-expenses-subs-savings}
- Liabilities: ₱${liabTotal} | Pending receivables: ₱${pendingRec}
- Goals: ${GOALS.map(g=>`${g.name} (₱${data.goals?.[g.id]||0} / ₱${g.target})`).join(", ")}

Give 4-5 specific bullet points for ${MONTH_FULL[targetMonth]}. End with one motivational sentence.`;
    try{
      const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,messages:[{role:"user",content:prompt}]})});
      const resp=await res.json();
      const text=resp.content?.[0]?.text||"Unable to generate advice.";
      const d=deepClone(data);
      if(!d.financialAdvice)d.financialAdvice={};
      d.financialAdvice[month]=text;
      save(d);
    }catch(e){console.error(e);}
    setAdviceLoading(false);
  };

  return <div>
    <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:14}}>
      <MiniStat label="YTD Income" value={fmt(totI)} color={S.green}/>
      <MiniStat label="YTD Expenses" value={fmt(totE)} color={S.red}/>
      <MiniStat label="YTD Savings" value={fmt(totS)} color={S.purple}/>
      <MiniStat label="YTD Net" value={fmt(totN)} color={totN>=0?S.green:S.red}/>
    </div>
    <div style={card}>
      <div style={{fontSize:13,fontWeight:700,marginBottom:12,color:S.accent}}>📊 Monthly Overview — 2026</div>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={chartData} margin={{top:5,right:10,left:10,bottom:5}}>
          <XAxis dataKey="month" tick={{fill:S.muted,fontSize:11}}/>
          <YAxis tick={{fill:S.muted,fontSize:10}} tickFormatter={v=>v>=1000?`₱${(v/1000).toFixed(0)}k`:`₱${v}`}/>
          <Tooltip formatter={v=>fmt(v)} contentStyle={{background:"#fff",border:`1px solid ${S.border}`,fontSize:12}}/>
          <Legend wrapperStyle={{fontSize:12}}/>
          <Bar dataKey="Income" fill={S.green} radius={[4,4,0,0]}/>
          <Bar dataKey="Expenses" fill={S.red} radius={[4,4,0,0]}/>
          <Bar dataKey="Savings" fill={S.purple} radius={[4,4,0,0]}/>
        </BarChart>
      </ResponsiveContainer>
    </div>
    <div style={card}>
      <div style={{fontSize:13,fontWeight:700,marginBottom:12,color:S.accent}}>📋 Month-by-month Table</div>
      <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
          <thead><tr>{["Month","Income","Expenses","Savings","Net","Status"].map(h=><th key={h} style={{textAlign:"left",padding:"7px 10px",color:S.muted,borderBottom:`1px solid ${S.border}`,fontWeight:600}}>{h}</th>)}</tr></thead>
          <tbody>{chartData.map((row,i)=>{const net=row.Net;return <tr key={i} style={{background:i%2===0?"transparent":S.bg}}>
            <td style={{padding:"9px 10px",borderBottom:`1px solid ${S.border}`}}>{row.month}</td>
            <td style={{padding:"9px 10px",borderBottom:`1px solid ${S.border}`,color:S.green}}>{fmt(row.Income)}</td>
            <td style={{padding:"9px 10px",borderBottom:`1px solid ${S.border}`,color:S.red}}>{fmt(row.Expenses)}</td>
            <td style={{padding:"9px 10px",borderBottom:`1px solid ${S.border}`,color:S.purple}}>{fmt(row.Savings)}</td>
            <td style={{padding:"9px 10px",borderBottom:`1px solid ${S.border}`,color:net>=0?S.green:S.red}}>{fmt(Math.abs(net))}</td>
            <td style={{padding:"9px 10px",borderBottom:`1px solid ${S.border}`}}>{row.Income===0?<span style={{color:S.muted}}>—</span>:net>=0?<span style={{color:S.green}}>✓ Surplus</span>:<span style={{color:S.red}}>⚠ Deficit</span>}</td>
          </tr>;})}
          </tbody>
        </table>
      </div>
    </div>
    <div style={{...card,border:`1px solid #a7f3d0`}}>
      <div style={{fontSize:13,fontWeight:700,marginBottom:4,color:S.green}}>🤖 AI Financial Advice</div>
      <p style={{fontSize:12,color:S.muted,margin:"0 0 12px"}}>Based on <b>{MONTH_FULL[month]}</b>'s data, generate advice for:</p>
      <div style={{display:"flex",gap:8,alignItems:"flex-end",marginBottom:14,flexWrap:"wrap"}}>
        <div style={{flex:1,minWidth:160}}><span style={lbl}>Target month</span>
          <select style={sel} value={targetMonth} onChange={e=>setTargetMonth(Number(e.target.value))}>
            {MONTHS.map((m,i)=><option key={i} value={i}>{MONTH_FULL[i]}</option>)}
          </select>
        </div>
        <Btn onClick={generateAdvice} color={S.green} disabled={adviceLoading}>{adviceLoading?"⏳ Generating...":"✨ Generate Advice"}</Btn>
      </div>
      {advice&&<div style={{background:"#f0fdf4",borderRadius:10,padding:16,border:`1px solid #bbf7d0`,fontSize:13,lineHeight:1.7,whiteSpace:"pre-wrap",marginBottom:12}}>{advice}</div>}
      {advice&&<div style={{display:"flex",gap:8}}>
        <Btn onClick={()=>{const d=deepClone(data);if(!d.financialAdvice)d.financialAdvice={};d.financialAdvice[targetMonth]=(d.financialAdvice[targetMonth]||"")+"\n\n---\n"+advice;save(d);alert(`Advice pushed to ${MONTH_FULL[targetMonth]}! ✅`);}} color={S.purple}>📌 Push to {MONTH_FULL[targetMonth]}</Btn>
        <Btn onClick={()=>{const d=deepClone(data);d.financialAdvice[month]="";save(d);}} outline small>Clear</Btn>
      </div>}
    </div>
  </div>;
}