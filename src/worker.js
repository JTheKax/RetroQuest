const enc=new TextEncoder();
const hex=b=>Array.from(new Uint8Array(b),x=>x.toString(16).padStart(2,"0")).join("");
const random=()=>hex(crypto.getRandomValues(new Uint8Array(32)));
const digest=async s=>hex(await crypto.subtle.digest("SHA-256",enc.encode(s)));
async function passwordHash(p,s){const k=await crypto.subtle.importKey("raw",enc.encode(p),"PBKDF2",false,["deriveBits"]);return hex(await crypto.subtle.deriveBits({name:"PBKDF2",salt:enc.encode(s),iterations:100000,hash:"SHA-256"},k,256));}
function equal(a,b){let d=a.length^b.length;for(let i=0;i<a.length;i++)d|=a.charCodeAt(i)^(b.charCodeAt(i)||0);return d===0;}
const json=(data,status=200,headers={})=>Response.json(data,{status,headers:{"Cache-Control":"no-store",...headers}});
const cookie=(token,age)=>"__Host-rq="+token+"; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age="+age;
async function session(req,db){const t=(req.headers.get("Cookie")||"").match(/(?:^|;\s*)__Host-rq=([a-f0-9]{64})(?:;|$)/)?.[1];return t?db.prepare("SELECT p.id,p.username,p.created_at FROM sessions s JOIN players p ON p.id=s.player_id WHERE s.token_hash=? AND s.expires_at>?").bind(await digest(t),Date.now()).first():null;}
async function issue(db,id){const t=random();await db.prepare("INSERT INTO sessions VALUES (?,?,?)").bind(await digest(t),id,Date.now()+604800000).run();return cookie(t,604800);}
export default {async fetch(req,env){const u=new URL(req.url),p=u.pathname,db=env.DB;
if(p==="/api/health"){let database="unconfigured";if(db){try{await db.prepare("SELECT 1").first();database="connected";}catch{database="unavailable";}}return json({service:"RetroQuest",database});}
if(!p.startsWith("/api/"))return env.ASSETS.fetch(req);
if(!db)return json({error:"Database unavailable"},503);
try{
if(p==="/api/status"&&req.method==="GET"){const row=await db.prepare("SELECT value FROM site_settings WHERE key='maintenance'").first();return json({maintenance:row?.value==="1"});}
if(p==="/api/owner/maintenance"&&req.method==="POST"){if(req.headers.get("Origin")!==u.origin)return json({error:"Invalid origin"},403);const player=await session(req,db);if(!player||!env.OWNER_PLAYER_ID||player.id!==env.OWNER_PLAYER_ID)return json({error:"Forbidden"},403);const b=await req.json();if(typeof b.maintenance!=="boolean")return json({error:"Invalid setting"},400);await db.prepare("UPDATE site_settings SET value=? WHERE key='maintenance'").bind(b.maintenance?"1":"0").run();return json({maintenance:b.maintenance});}
if(p==="/api/me"&&req.method==="GET"){const player=await session(req,db);return json({player:player?{...player,owner:!!env.OWNER_PLAYER_ID&&player.id===env.OWNER_PLAYER_ID}:null});}
if(p==="/api/owner/overview"&&req.method==="GET"){const player=await session(req,db);if(!player||!env.OWNER_PLAYER_ID||player.id!==env.OWNER_PLAYER_ID)return json({error:"Forbidden"},403);const counts=await db.prepare("SELECT (SELECT COUNT(*) FROM players) AS players,(SELECT COUNT(*) FROM games) AS games,(SELECT COUNT(*) FROM achievements) AS achievements,(SELECT COUNT(*) FROM unlocks) AS unlocks").first();const users=await db.prepare("SELECT id,username,created_at FROM players ORDER BY created_at DESC,id LIMIT 100").all();const setting=await db.prepare("SELECT value FROM site_settings WHERE key='maintenance'").first();return json({counts,players:users.results,maintenance:setting?.value==="1"});}
if(req.method!=="POST")return json({error:"Not found"},404);
if(req.headers.get("Origin")!==u.origin)return json({error:"Invalid origin"},403);
if(p==="/api/logout"){const t=(req.headers.get("Cookie")||"").match(/(?:^|;\s*)__Host-rq=([a-f0-9]{64})(?:;|$)/)?.[1];if(t)await db.prepare("DELETE FROM sessions WHERE token_hash=?").bind(await digest(t)).run();return json({ok:true},200,{"Set-Cookie":cookie("",0)});}
if(!["/api/register","/api/login"].includes(p))return json({error:"Not found"},404);if(p==="/api/register"){const setting=await db.prepare("SELECT value FROM site_settings WHERE key='maintenance'").first();if(setting?.value==="1")return json({error:"Registration is temporarily closed for maintenance"},503);}
const bucket=await digest((req.headers.get("CF-Connecting-IP")||"unknown")+p);const now=Date.now();
const limit=await db.prepare("INSERT INTO auth_limits VALUES (?,1,?) ON CONFLICT(bucket) DO UPDATE SET attempts=CASE WHEN expires_at<=? THEN 1 ELSE attempts+1 END,expires_at=CASE WHEN expires_at<=? THEN excluded.expires_at ELSE expires_at END RETURNING attempts").bind(bucket,now+900000,now,now).first();
if(limit.attempts>10)return json({error:"Too many attempts. Try again later."},429);
if(!req.headers.get("Content-Type")?.startsWith("application/json"))return json({error:"JSON required"},415);
const raw=await req.text();if(raw.length>4096)return json({error:"Request too large"},413);let b;try{b=JSON.parse(raw)}catch{return json({error:"Invalid request"},400)}
if(!b||typeof b.email!=="string"||typeof b.password!=="string")return json({error:"Invalid credentials"},400);
const email=b.email.trim().toLowerCase(),pw=b.password;if(email.length>254||!/^\S+@\S+\.\S+$/.test(email)||pw.length<12||pw.length>128)return json({error:"Valid email and 12–128 character password required"},400);
if(p==="/api/register"){const name=typeof b.username==="string"?b.username.trim():"";if(!/^[A-Za-z0-9_]{3,24}$/.test(name))return json({error:"Username must be 3–24 letters, numbers or underscores"},400);const id=crypto.randomUUID(),salt=random(),hash=await passwordHash(pw,salt);try{await db.batch([db.prepare("INSERT INTO players(id,username,email) VALUES (?,?,?)").bind(id,name,email),db.prepare("INSERT INTO credentials VALUES (?,?,?)").bind(id,salt,hash)]);}catch(e){if(String(e).includes("UNIQUE"))return json({error:"Username or email unavailable"},409);throw e;}return json({ok:true},201,{"Set-Cookie":await issue(db,id)});}
const row=await db.prepare("SELECT p.id,c.salt,c.password_hash FROM players p JOIN credentials c ON p.id=c.player_id WHERE p.email=?").bind(email).first();const hash=await passwordHash(pw,row?.salt||"0".repeat(64));if(!row||!equal(hash,row.password_hash))return json({error:"Invalid credentials"},401);return json({ok:true},200,{"Set-Cookie":await issue(db,row.id)});
}catch(e){console.error("RetroQuest API error",e);return json({error:"Service temporarily unavailable"},503);}
}};