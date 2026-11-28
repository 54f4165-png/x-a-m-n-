import {getApps} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {getDatabase,ref,onValue} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js';
import {getAuth} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
window.xoaipCheckApproval=async name=>{
 const app=getApps().find(a=>a.options.projectId==='gg88-web');
 if(!app||!getAuth(app).currentUser||!navigator.onLine)throw Error('Unavailable');
 const key=name.trim().toLowerCase().replace(/[^a-z0-9_-]/g,'_');
 if(!/[a-z0-9]/.test(key))return false;
 const token=await getAuth(app).currentUser.getIdToken();
 const url=app.options.databaseURL+'/approvedUsers/'+encodeURIComponent(key)+'.json?auth='+encodeURIComponent(token);
 const response=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(8000)});
 if(!response.ok)throw Error('Database request failed');
 const data=await response.json();return data?.approved===true;
};
