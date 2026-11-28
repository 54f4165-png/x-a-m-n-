(()=>{
const tabs=[['overview','Tổng quan',['v9-dashboard']],['chat','Tin nhắn',['xoaip-chat-admin-root']],['accounts','Tài khoản',['account-panel','registered-users-panel']],['history','Lịch sử LIVE',['v11-history']],['analytics','Thống kê',['analytics-panel']],['bot','Auto BOT',['xoaip-bot-panel']]];
const nav=document.createElement('nav');nav.id='v11-nav';nav.setAttribute('aria-label','Điều hướng quản trị');const management=document.getElementById('management');const logout=document.getElementById('logout');nav.hidden=true;document.getElementById('v9-dashboard').before(nav);nav.append(logout);let active='overview';
function select(key){active=key;document.body.dataset.v11Tab=key;for(const b of nav.querySelectorAll('[data-tab]'))b.setAttribute('aria-pressed',String(b.dataset.tab===key));}
for(const [key,label,ids] of tabs){const b=document.createElement('button');b.type='button';b.dataset.tab=key;b.textContent=label;b.onclick=()=>select(key);nav.insertBefore(b,logout);for(const id of ids)document.getElementById(id)?.setAttribute('data-v11-page',key);}
function sync(){const allowed=management.style.display==='grid';nav.hidden=!allowed;if(!allowed)select('overview');}
new MutationObserver(sync).observe(management,{attributes:true,attributeFilter:['style']});select(active);sync();
})();
