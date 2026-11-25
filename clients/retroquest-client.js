import {Monitor} from "../src/achievement-engine.js";
export class RetroQuestClient {
 constructor({token,base="https://retroquest.jthekax21.workers.dev",onStatus=()=>{},onAchievement=()=>{}}){if(!/^[a-f0-9]{64}$/.test(token))throw Error("Invalid token");const url=new URL(base);if(url.protocol!=="https:")throw Error("HTTPS required");this.base=url.origin;this.token=token;this.onStatus=onStatus;this.onAchievement=onAchievement;this.monitor=null;this.generation=0}
 async request(path){const r=await fetch(this.base+"/api/emulator/v1/"+path,{headers:{Authorization:"Bearer "+this.token},redirect:"error",cache:"no-store"});if(!r.ok)throw Error("RetroQuest request failed: "+r.status);return r.json()}
 async connect(){try{const me=await this.request("me");this.onStatus({state:"connected",username:me.username});return me}catch(e){this.onStatus({state:"error",message:e.message});throw e}}
 async loadROM(bytes){this.monitor=null;const generation=++this.generation;this.onStatus({state:"identifying"});try{const hash=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",bytes)),b=>b.toString(16).padStart(2,"0")).join("");const data=await this.request("game?sha256="+hash);if(generation!==this.generation)return null;if(data.game)this.monitor=new Monitor(data.achievements);this.onStatus({state:data.game?"practice":"unknown-game",game:data.game});return data}catch(e){if(generation===this.generation)this.onStatus({state:"error",message:e.message});throw e}}
 frame(readMemory){const events=this.monitor?.tick(readMemory)||[];for(const event of events)this.onAchievement(event);return events}
 unload(){++this.generation;this.monitor=null;this.onStatus({state:"idle"})}
}
// Host must supply ARM9 bus byte reads; this is not a melonDS/DeSmuME binding.
export function ndsMemoryAdapter(readByte){return (address,bytes)=>{if(![1,2,4].includes(bytes)||!Number.isInteger(address)||address<0||address+bytes>4294967296)throw Error("Invalid read");let value=0;for(let i=0;i<bytes;i++){const b=readByte(address+i);if(!Number.isInteger(b)||b<0||b>255)throw Error("Unavailable memory");value+=b*256**i}return value}}
