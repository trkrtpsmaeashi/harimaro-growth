
import './style.css';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl=import.meta.env.VITE_SUPABASE_URL;
const supabaseKey=import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase=createClient(supabaseUrl,supabaseKey);
const app=document.querySelector('#app');
let user=null, records=[];

const esc=(s='')=>String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const today=()=>new Date().toISOString().slice(0,10);

function loginView(){
 app.innerHTML=`<main class="login"><section class="card"><h1>🐹 はりまろ成長記録</h1><p class="muted">メールアドレスでログインして、写真と体重をクラウド保存します。</p>
 <label>メールアドレス</label><input id="email" type="email" autocomplete="email">
 <label style="margin-top:10px">パスワード</label><input id="password" type="password" autocomplete="current-password">
 <div class="actions"><button id="login">ログイン</button><button class="secondary" id="signup">新規登録</button></div><p id="msg"></p></section></main>`;
 document.querySelector('#login').onclick=()=>auth('login');
 document.querySelector('#signup').onclick=()=>auth('signup');
}
async function auth(mode){
 const email=document.querySelector('#email').value.trim(),password=document.querySelector('#password').value;
 const msg=document.querySelector('#msg');msg.textContent='';
 const {error}=mode==='login'?await supabase.auth.signInWithPassword({email,password}):await supabase.auth.signUp({email,password});
 msg.className=error?'error':'success';msg.textContent=error?error.message:(mode==='signup'?'登録しました。確認メールが届いた場合は認証してください。':'ログインしました。');
}
async function load(){
 const {data,error}=await supabase.from('hedgehog_records').select('*').order('recorded_on',{ascending:false}).order('created_at',{ascending:false});
 if(error) throw error; records=data||[];
}
function drawChart(){
 const c=document.querySelector('#chart'); if(!c)return;
 const ctx=c.getContext('2d'), data=[...records].sort((a,b)=>a.recorded_on.localeCompare(b.recorded_on));
 ctx.clearRect(0,0,c.width,c.height);
 if(data.length<2){ctx.fillStyle='#6b7280';ctx.font='15px sans-serif';ctx.fillText('2件以上で体重グラフが表示されます',24,42);return}
 const weights=data.map(x=>x.weight_g),min=Math.min(...weights)-10,max=Math.max(...weights)+10,p=36,w=c.width-p*2,h=c.height-p*2;
 ctx.strokeStyle='#e5e7eb';ctx.lineWidth=1;for(let i=0;i<5;i++){let y=p+h*i/4;ctx.beginPath();ctx.moveTo(p,y);ctx.lineTo(p+w,y);ctx.stroke()}
 ctx.strokeStyle='#6675ff';ctx.lineWidth=4;ctx.beginPath();data.forEach((d,i)=>{let x=p+w*i/(data.length-1),y=p+h*(1-(d.weight_g-min)/(max-min));i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.stroke();
 ctx.fillStyle='#6675ff';data.forEach((d,i)=>{let x=p+w*i/(data.length-1),y=p+h*(1-(d.weight_g-min)/(max-min));ctx.beginPath();ctx.arc(x,y,5,0,Math.PI*2);ctx.fill()});
}
function mainView(){
 const latest=records[0],prev=records[1],diff=latest&&prev?latest.weight_g-prev.weight_g:null;
 app.innerHTML=`<header><h1>🐹 はりまろ成長記録</h1><p>写真・体重・体調をクラウドで安全に保存</p></header><main>
 <section class="card"><div class="actions" style="justify-content:space-between;margin-top:0"><h2>新しい記録</h2><button class="secondary" id="logout">ログアウト</button></div>
 <div class="grid two"><div><label>日付</label><input id="date" type="date" value="${today()}"></div><div><label>体重（g）</label><input id="weight" type="number" min="0" placeholder="567"></div></div>
 <div style="margin-top:10px"><label>写真</label><input id="photo" type="file" accept="image/*" capture="environment"></div>
 <div style="margin-top:10px"><label>メモ</label><textarea id="memo" placeholder="ご飯、うんち、回し車、爪切りなど"></textarea></div>
 <div style="margin-top:10px"><label>タグ（カンマ区切り）</label><input id="tags" placeholder="爪切り, 緑便, 部屋んぽ"></div>
 <div class="actions"><button id="save">保存</button></div><p id="formMsg"></p></section>
 <section class="card"><h2>成長サマリー</h2><div class="stats"><div class="stat"><b>${latest?latest.weight_g+'g':'-'}</b><span>最新体重</span></div><div class="stat"><b>${diff===null?'-':(diff>=0?'+':'')+diff+'g'}</b><span>前回比</span></div><div class="stat"><b>${records.length}</b><span>記録件数</span></div></div><canvas id="chart" width="850" height="260"></canvas></section>
 <section class="card"><h2>記録一覧</h2>${records.length?records.map(r=>`<div class="item record">${r.photo_url?`<img class="thumb" src="${esc(r.photo_url)}">`:`<div class="thumb"></div>`}<div><b>${esc(r.recorded_on)} ・ ${r.weight_g}g</b><div class="muted">${esc(r.memo||'メモなし')}</div><div>${(r.tags||[]).map(t=>`<span class="tag">${esc(t)}</span>`).join('')}</div><div class="actions"><button class="danger" data-delete="${r.id}" data-path="${esc(r.photo_path||'')}">削除</button></div></div></div>`).join(''):'<p class="muted">まだ記録がありません。</p>'}</section></main>`;
 document.querySelector('#logout').onclick=()=>supabase.auth.signOut();
 document.querySelector('#save').onclick=saveRecord;
 document.querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>deleteRecord(b.dataset.delete,b.dataset.path));
 drawChart();
}
async function saveRecord(){
 const msg=document.querySelector('#formMsg'),date=document.querySelector('#date').value,weight=Number(document.querySelector('#weight').value);
 if(!date||!weight){msg.className='error';msg.textContent='日付と体重を入力してね。';return}
 msg.className='muted';msg.textContent='保存中…';
 let photo_url=null,photo_path=null; const file=document.querySelector('#photo').files[0];
 if(file){
   photo_path=`${user.id}/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]/g,'_')}`;
   const up=await supabase.storage.from('harimaro-photos').upload(photo_path,file,{upsert:false});
   if(up.error){msg.className='error';msg.textContent=up.error.message;return}
   photo_url=supabase.storage.from('harimaro-photos').getPublicUrl(photo_path).data.publicUrl;
 }
 const {error}=await supabase.from('hedgehog_records').insert({user_id:user.id,recorded_on:date,weight_g:weight,memo:document.querySelector('#memo').value.trim(),tags:document.querySelector('#tags').value.split(',').map(x=>x.trim()).filter(Boolean),photo_url,photo_path});
 if(error){msg.className='error';msg.textContent=error.message;return}
 await load();mainView();
}
async function deleteRecord(id,path){
 if(!confirm('この記録を削除する？'))return;
 if(path) await supabase.storage.from('harimaro-photos').remove([path]);
 await supabase.from('hedgehog_records').delete().eq('id',id);
 await load();mainView();
}
supabase.auth.onAuthStateChange(async(_event,session)=>{user=session?.user||null;if(user){try{await load();mainView()}catch(e){app.innerHTML=`<main><p class="error">${esc(e.message)}</p></main>`}}else loginView()});
