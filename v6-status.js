import {getApps} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {getDatabase,ref,onValue} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js';
const app=getApps().find(a=>a.options.projectId==='gg88-web');if(app)onValue(ref(getDatabase(app),'.info/connected'),s=>{document.getElementById('firebase-status').textContent=s.val()?'Firebase: Đã kết nối':'Firebase: Chưa kết nối';});
