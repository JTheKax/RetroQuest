#pragma once
#include "retroquest_bridge.h"
#include <QJsonDocument>
#include <QJsonObject>
#include <QJsonArray>
#include <cmath>
namespace retroquest {
inline std::vector<Achievement> decodeGame(const QByteArray& payload){
 std::vector<Achievement> out;
 if(payload.size()>4*1024*1024)return out;
 QJsonParseError err;auto doc=QJsonDocument::fromJson(payload,&err);
 if(err.error!=QJsonParseError::NoError||!doc.isObject())return out;
 auto root=doc.object();if(!root.value("game").isObject())return out;
 auto rows=root.value("achievements").toArray();if(rows.size()>2000)return out;
 for(auto row:rows){auto a=row.toObject();auto d=a.value("definition").toObject();if(d.value("version").toInt()!=1)continue;
 Achievement item{a.value("id").toString().toStdString(),a.value("title").toString().toStdString(),a.value("unlocked").toBool()||a.value("unlocked").toInt()==1,{}};
 auto conditions=d.value("conditions").toArray();if(item.id.empty()||conditions.empty()||conditions.size()>32)continue;
 bool valid=true;for(auto entry:conditions){auto c=entry.toObject();double addr=c.value("address").toDouble(-1),value=c.value("value").toDouble(-1),size=c.value("bytes").toDouble(-1);auto op=c.value("op").toString().toStdString();
 if((size!=1&&size!=2&&size!=4)||!std::isfinite(addr)||!std::isfinite(value)||std::floor(addr)!=addr||std::floor(value)!=value||addr<0x02000000||addr+size>0x02400000||value<0||value>=std::pow(256,size)||(op!="eq"&&op!="ne"&&op!="gt"&&op!="gte"&&op!="lt"&&op!="lte")){valid=false;break;}
 item.conditions.push_back({uint32_t(addr),unsigned(size),op,uint32_t(value)});}
 if(valid)out.push_back(std::move(item));}
 return out;
}
}
