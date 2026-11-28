 'use strict';
const admin=require('firebase-admin');
const URL='https://gg88-web-default-rtdb.asia-southeast1.firebasedatabase.app';
function getApp(){if(admin.apps.length)return admin.app();const c=JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON||'{}');if(c.project_id!=='gg88-web'||!c.private_key)throw Error('Thiếu GOOGLE_SERVICE_ACCOUNT_JSON');c.private_key=c.private_key.replace(/\\n/g,'\n');return admin.initializeApp({credential:admin.credential.cert(c),databaseURL:URL})}
const MSG="Xin chào bạn! 👋\n\nHiện tại kỹ thuật web đang tạm vắng mặt nên chưa thể hỗ trợ trực tiếp.\n\nBạn vui lòng để lại nội dung cần hỗ trợ. Kỹ thuật sẽ kiểm tra và phản hồi sớm nhất khi quay lại.\n\nCảm ơn bạn đã kiên nhẫn chờ đợi! ❤️\n\n🕐 Khung giờ kỹ thuật làm việc: 13h – 23h";
module.exports=async(req,res)=>{
 const origin=req.headers.origin; if(['https://xoaip.online','https://www.xoaip.online'].includes(origin))res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');res.setHeader('Access-Control-Allow-Methods','POST,OPTIONS');res.setHeader('Access-Control-Allow-Headers','Authorization,Content-Type');res.setHeader('Cache-Control','no-store');
 if(req.method==='OPTIONS')return res.status(204).end();if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
 try{const token=(req.headers.authorization||'').replace(/^Bearer /,'');if(!token)return res.status(401).json({error:'Thiếu token'});const app=getApp();const auth=await app.auth().verifyIdToken(token);const db=app.database();const adminGrant=(await db.ref('adminUids/'+auth.uid).get()).val()===true;
 if(req.body?.action==='toggle'){
  if(!adminGrant)return res.status(403).json({error:'Không có quyền ADMIN'});
  const enabled=req.body.enabled===true;const current=(await db.ref('autoBot/config').get()).val()||{};
  await db.ref('autoBot/config').set({enabled,activation:enabled?(current.enabled?current.activation||Date.now():Date.now()):current.activation||0,updatedAt:admin.database.ServerValue.TIMESTAMP});return res.json({enabled});
 }
 if(req.body?.action!=='reply')return res.status(400).json({error:'Action không hợp lệ'});
 if(adminGrant)return res.status(403).json({error:'Chỉ dành cho khách'});
 const room=auth.uid;const cfg=(await db.ref('autoBot/config').get()).val();if(!cfg?.enabled||!cfg.activation)return res.json({sent:false,reason:'disabled'});
 const msgs=db.ref('chatRooms/'+room+'/messages');const latest=(await msgs.orderByChild('createdAt').limitToLast(8).get()).val()||{};
 const hasUser=Object.values(latest).some(m=>m?.senderRole==='user');if(!hasUser)return res.json({sent:false,reason:'empty'});
 const marker=db.ref('autoBot/replied/'+cfg.activation+'/'+room);
 const claim=await marker.transaction(v=>v===null?{at:admin.database.ServerValue.TIMESTAMP}:undefined,undefined,false);
 if(!claim.committed)return res.json({sent:false,reason:'already-replied'});
 try{await msgs.push().set({text:MSG,senderUid:'auto-bot',senderRole:'admin',createdAt:admin.database.ServerValue.TIMESTAMP,autoBot:true});await db.ref('chatRooms/'+room+'/meta').update({lastMessage:'🤖 BOT: Kỹ thuật đang tạm vắng mặt',updatedAt:admin.database.ServerValue.TIMESTAMP});return res.json({sent:true})}catch(e){await marker.remove();throw e}
 }catch(e){return res.status(500).json({error:e.message||'Lỗi máy chủ'})}
};
