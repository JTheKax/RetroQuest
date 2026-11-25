#pragma once
#include <cstdint>
#include <functional>
#include <optional>
#include <string>
#include <vector>
#include <unordered_set>
namespace retroquest {
struct Condition { uint32_t address; unsigned bytes; std::string op; uint32_t value; };
struct Achievement { std::string id,title; bool unlocked; std::vector<Condition> conditions; };
using ReadByte=std::function<std::optional<uint8_t>(uint32_t)>;
class Bridge {
 std::vector<Achievement> achievements;
 std::unordered_set<std::string> seen;
public:
 void load(std::vector<Achievement> set){ achievements=std::move(set);seen.clear();for(const auto& a:achievements)if(a.unlocked)seen.insert(a.id); }
 void unload(){achievements.clear();seen.clear();}
 void frame(const ReadByte& read,const std::function<void(const Achievement&)>& notify){
 for(const auto& a:achievements){
 if(seen.count(a.id)||a.conditions.empty()||a.conditions.size()>32)continue;
 bool match=true;
 for(const auto& c:a.conditions){
 if((c.bytes!=1&&c.bytes!=2&&c.bytes!=4)||uint64_t(c.address)+c.bytes>0x100000000ULL||uint64_t(c.value)>=(1ULL<<(8*c.bytes))){match=false;break;}
 uint32_t v=0;for(unsigned i=0;i<c.bytes;++i){auto b=read(c.address+i);if(!b){match=false;break;}v|=uint32_t(*b)<<(8*i);}
 if(!match)break;
 match=c.op=="eq"?v==c.value:c.op=="ne"?v!=c.value:c.op=="gt"?v>c.value:c.op=="gte"?v>=c.value:c.op=="lt"?v<c.value:c.op=="lte"?v<=c.value:false;
 if(!match)break;
 }
 if(match){seen.insert(a.id);notify(a);}
 }
 }
};
}
