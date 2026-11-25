#pragma once
#include <QObject>
#include <QNetworkAccessManager>
#include <QNetworkRequest>
#include <QNetworkReply>
#include <QCryptographicHash>
#include <QRegularExpression>
#include <QUrl>
#include <functional>
#include "achievement-loader.h"
namespace retroquest {
class Network : public QObject {
 QNetworkAccessManager manager;
 QByteArray token;
 quint64 generation=0;
public:
 explicit Network(QObject* parent=nullptr):QObject(parent),manager(this){}
 bool setToken(const QByteArray& value){++generation;token.clear();if(!QRegularExpression("^[a-f0-9]{64}$").match(QString::fromLatin1(value)).hasMatch())return false;token=value;return true;}
 void clear(){++generation;token.clear();}
 using Callback=std::function<void(QByteArray,QString)>;
 void request(const QString& path,Callback done){
 if(token.isEmpty()){done({},QStringLiteral("Not connected"));return;}
 auto epoch=generation;
 QNetworkRequest req(QUrl(QStringLiteral("https://retroquest.jthekax21.workers.dev/api/emulator/v1/")+path));
 req.setRawHeader("Authorization","Bearer "+token);
 req.setAttribute(QNetworkRequest::RedirectPolicyAttribute,QNetworkRequest::ManualRedirectPolicy);
 req.setTransferTimeout(15000);
 auto* reply=manager.get(req);
 QObject::connect(reply,&QNetworkReply::downloadProgress,reply,[reply](qint64 received,qint64){if(received>4*1024*1024)reply->abort();});
 QObject::connect(reply,&QNetworkReply::finished,this,[this,reply,epoch,done](){
 auto status=reply->attribute(QNetworkRequest::HttpStatusCodeAttribute).toInt();
 auto data=reply->readAll();auto error=reply->error();reply->deleteLater();
 if(epoch!=generation)return;
 if(error!=QNetworkReply::NoError||status!=200||data.size()>4*1024*1024){done({},QStringLiteral("RetroQuest request failed"));return;}
 done(data,{});
 });
 }
 void connectAccount(Callback done){request(QStringLiteral("me"),std::move(done));}
 void loadROM(const QByteArray& bytes,Callback done){++generation;auto hash=QCryptographicHash::hash(bytes,QCryptographicHash::Sha256).toHex();request(QStringLiteral("game?sha256=")+QString::fromLatin1(hash),std::move(done));}
 void unload(){++generation;}
};
}
