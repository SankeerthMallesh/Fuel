// Run: node tests/fuzz.mjs [rounds]   (default 1000 rounds of every suite)
import fs from "fs";import vm from "vm";
const src=fs.readFileSync(new URL("../public/index.html",import.meta.url),"utf8").split("\n");
const grab=(a,b)=>{const i=src.findIndex(l=>l.startsWith(a));if(i<0)throw Error("missing "+a);let j=i;if(b){j=src.findIndex((l,k)=>k>=i&&l.startsWith(b));if(j<0)throw Error("missing end "+b)}return src.slice(i,j+1).join("\n")};
const code=[grab("const tot=").split("\n")[0],grab("function parseFractionalInches","}"),grab("function normalizeWeight"),grab("function calc","return{cal"),
"const NUM={type:'NUMBER'};",grab("function norm(",'const BAND'),grab("const MEAT="),grab("function checkPlan","return{plan:")].join("\n").replace(/^const BAND.*$/m,"");
const ctx={};vm.createContext(ctx);vm.runInContext(code+";this.X={calc,norm,checkPlan,parseFractionalInches,tot}",ctx);const {calc,norm,checkPlan,parseFractionalInches}=ctx.X;
let seed=12345;const rnd=()=>(seed=(seed*1664525+1013904223)>>>0)/4294967296,ri=(a,b)=>a+Math.floor(rnd()*(b-a+1)),pick=a=>a[ri(0,a.length-1)];
const N=+process.argv[2]||1000;let fails=0,checks=0;const cats={};const ok=(c,m)=>{checks++;if(!c){fails++;const k=m.split(" {")[0];cats[k]=(cats[k]||0)+1;if(cats[k]<=2)console.log("FAIL",m)}};
// 1. calc
for(let n=0;n<N*20;n++){const sex=pick(["m","f"]),goal=pick(["lose","maintain","gain"]),kg=ri(40,180)+rnd(),cm=ri(140,210),age=ri(13,85),act=pick([1.2,1.375,1.55,1.725]),pace=pick([.25,.5,.75]),days=ri(0,6);
const base={sex,goal,age,act,pace,days},a=calc({...base,wu:"kg",w:kg,hu:"cm",cm}),tin=cm/2.54,b=calc({...base,wu:"lb",w:kg*2.2046226218,hu:"ft",ft:Math.floor(tin/12),in:tin%12,cm});
const t=JSON.stringify({sex,goal,age,kg:+kg.toFixed(1),cm,act,pace,days,a});
ok(Object.values(a).every(Number.isFinite),"finite "+t);ok(Math.abs(a.cal-b.cal)<=1&&a.pro===b.pro,"unit invariance "+t);
const fl=sex==="m"?1500:1200;
if(goal==="lose"){ok(a.cal<=a.tdee,"lose<=tdee "+t);ok(a.cal>=Math.min(a.tdee,Math.max(fl,a.tdee*(age<18?.9:.75)))-1,"lose floor "+t)}
if(goal==="gain")ok(a.cal>a.tdee,"gain>tdee "+t);if(goal==="maintain")ok(a.cal===a.tdee,"maint "+t);
const m2=(cm/100)**2,ideal=25*m2;ok(a.pro<=2.3*kg&&a.pro>=(kg/m2>27?1.2*ideal:1.0*kg),"protein range "+t);ok(a.carb>=40,"carb floor "+t);
ok(Math.abs(a.pro*4+a.carb*4+a.fat*9-a.cal)/a.cal<=.015,"macros sum "+t);ok(a.fat*9/a.cal>=.18&&a.fat*9/a.cal<=.45,"fat share "+t)}
// 2. height parsing
for(let n=0;n<N*5;n++){const w=ri(0,11),[d,t]=pick([[2,1],[4,1],[4,3],[8,5],[3,1],[3,2]]),v=parseFractionalInches(`${w} ${t}/${d}`);ok(Math.abs(v-(w+t/d))<1e-9,"frac "+w+" "+t+"/"+d);
ok(Number.isNaN(parseFractionalInches(pick(["abc","1/0","5/4","-3","",". 5","6 7/3"]))),"bad frac rejected")}
// 3. norm on messy AI output
const junk=()=>pick([undefined,null,"",NaN,-5,"abc","12","3e2",0,rnd()*1e4,ri(0,900)]);
for(let n=0;n<N*5;n++){const items=Array.from({length:ri(0,6)},()=>({name:pick(["white rice","Cooked White Rice (1 cup)","chicken breast","banana","pizza",null,"x".repeat(200)]),basis:junk(),grams:junk(),protein:junk(),carbs:junk(),fat:junk(),fiber:junk(),alcohol:junk(),kcal:junk()}));
const lab=rnd()<.3,r=norm(pick([{items},{items:"bad"},null,undefined,"x",{}]===null?0:{items}),lab);
for(const i of r){const t=JSON.stringify(i);ok(["grams","kcal","protein","carbs","fat"].every(k=>Number.isFinite(i[k])&&i[k]>=0),"norm finite "+t);ok(i.name.length<=80&&i.m===1,"norm shape "+t);
if(!lab&&i.grams>0)ok(i.kcal<=9.1*i.grams+1,"density "+t);
if(!lab){const d=4*i.protein+4*i.carbs+9*i.fat;ok(d<1||Math.abs(i.kcal-d)/d<=.12||i.kcal<=9.1*i.grams,"kcal vs macros "+t)}}
for(const bad of [null,undefined,{items:"x"},{},[],"s",7])ok(norm(bad,false).length===0,"norm garbage input")}
const rr=norm({items:[{name:"Cooked white rice",grams:200,protein:4,carbs:40,fat:1,kcal:500}]},false)[0];ok(Math.abs(rr.kcal-260)<=1&&rr.carbs===56,"USDA rice correction "+JSON.stringify(rr));
const ok2=norm({items:[{name:"Fried rice",grams:200,protein:10,carbs:60,fat:12,kcal:388}]},false)[0];ok(ok2.kcal===388,"no false reference match");
// 4. plan validation
const T={cal:2000,pro:150,carb:200,fat:60},P={days:3,diet:"vegan",avoid:"peanuts, shellfish"};
const meal=(it,p,c,f)=>({name:"M",items:it,protein:p,carbs:c,fat:f,kcal:0}),wk=n=>Array.from({length:n},(_,i)=>({day:"Day "+(i+1),focus:"x",exercises:["a","b","c","d","e"]}));
const good={meals:[meal("tofu scramble",40,40,13),meal("lentils and rice",40,60,10),meal("tempeh stir fry",40,60,15),meal("soy yogurt",30,40,22)],workouts:wk(3),tips:["a"]};
ok(checkPlan(good,T,P).bad.length===0,"good plan passes: "+checkPlan(good,T,P).bad);
ok(checkPlan({...good,meals:[meal("grilled chicken",40,40,13),...good.meals.slice(1)]},T,P).bad.some(x=>/vegan/.test(x)),"vegan catches chicken");
ok(!checkPlan({...good,meals:[meal("peanut butter toast",40,40,13),...good.meals.slice(1)]},T,{...P,diet:"anything",avoid:"peanuts"}).bad.length===false,"avoid catches peanut");
ok(checkPlan({...good,meals:[meal("almond milk oats, eggplant, butternut squash",40,40,13),...good.meals.slice(1)]},T,P).bad.length===0,"no vegan false positives");
ok(checkPlan({...good,workouts:wk(2)},T,P).bad.some(x=>/exactly 3/.test(x)),"workout count");
ok(checkPlan({...good,meals:good.meals.map(m=>({...m,carbs:m.carbs*2}))},T,P).bad.some(x=>/kcal/.test(x)),"kcal off");
for(let n=0;n<N*3;n++){const g=()=>pick([undefined,null,"x",-3,1e9,[],{},{items:5},"12"]),c=checkPlan(pick([g(),{meals:g(),workouts:g(),tips:g()},{meals:[g(),good.meals[0]],workouts:[g()],tips:[g()]}]),T,P);
ok(Array.isArray(c.plan.meals)&&Array.isArray(c.plan.workouts)&&Array.isArray(c.plan.tips)&&Number.isFinite(c.score),"plan garbage safe");
ok(c.plan.meals.every(m=>m.kcal===Math.round(4*m.protein+4*m.carbs+9*m.fat)||Math.abs(m.kcal-(4*m.protein+4*m.carbs+9*m.fat))<=2),"plan kcal derived")}
console.log(cats);console.log(`${checks} checks, ${fails} failures`);process.exit(fails?1:0);
