import {getApps} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {getAuth} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {getDatabase,ref,push,set,serverTimestamp} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js';
window.xoaipRecordHistory=async(account,gateway,code)=>{const app=getApps().find(a=>a.options.projectId==='gg88-web');if(!app||!getAuth(app).currentUser)return;const db=getDatabase(app);await set(push(ref(db,'processingHistory')), {account:String(account).slice(0,100),gateway:String(gateway).slice(0,100),status:code==='ERR-NET-01'?'unavailable':code?'not_listed':'listed',createdAt:serverTimestamp()});};
const start=document.getElementById('start');if(start){const note=document.createElement('p');note.style.cssText='font-size:11px;color:#a9c9df';note.textContent='';start.before(note);}
