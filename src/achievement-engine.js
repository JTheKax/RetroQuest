export function evaluate(definition,readMemory){
 if(definition?.version!==1||!Array.isArray(definition.conditions)||!definition.conditions.length||definition.conditions.length>32)return false;
 return definition.conditions.every(c=>{
 if(!c||!Number.isInteger(c.address)||c.address<0||![1,2,4].includes(c.bytes)||c.address+c.bytes>4294967296||!Number.isInteger(c.value)||c.value<0||c.value>=2**(8*c.bytes))return false;
 let v;try{v=readMemory(c.address,c.bytes)}catch{return false}
 if(!Number.isInteger(v)||v<0||v>=2**(8*c.bytes))return false;
 switch(c.op){case "eq":return v===c.value;case "ne":return v!==c.value;case "gt":return v>c.value;case "gte":return v>=c.value;case "lt":return v<c.value;case "lte":return v<=c.value;default:return false}
 });
}
export class Monitor{
 constructor(achievements){this.achievements=achievements;this.seen=new Set(achievements.filter(a=>a.unlocked).map(a=>a.id))}
 tick(readMemory){const events=[];for(const a of this.achievements){if(!this.seen.has(a.id)&&evaluate(a.definition,readMemory)){this.seen.add(a.id);events.push({achievement_id:a.id,practice:true})}}return events}
}
