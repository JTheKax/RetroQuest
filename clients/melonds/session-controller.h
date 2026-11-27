#pragma once
#include "retroquest-network.h"
#include <QInputDialog>
#include <QLineEdit>
#include <QMessageBox>
#include <QMetaObject>
#include <mutex>
#include <atomic>
namespace retroquest {
class SessionController : public QObject {
 Network network;
 Bridge bridge;
 std::mutex mutex;
 QByteArray rom;
 bool connected=false;
 std::atomic<quint64> sessionEpoch{0};
 std::function<void(QString)> status;
public:
 explicit SessionController(std::function<void(QString)> onStatus,QObject* parent=nullptr):QObject(parent),network(this),status(std::move(onStatus)){}
 // Account and ROM lifecycle methods must run on the Qt GUI thread.
 void login(QWidget* parent){
 bool ok=false;auto value=QInputDialog::getText(parent,"RetroQuest Connect","Private emulator token:",QLineEdit::Password,{},&ok);
 if(!ok)return;
 disconnectAccount();
 if(!network.setToken(value.toLatin1())){status("Invalid token");return;}
 status("Connecting...");
 network.connectAccount([this](QByteArray data,QString error){
 if(!error.isEmpty()){network.clear();status(error);return;}
 auto user=QJsonDocument::fromJson(data).object().value("username").toString();
 if(user.isEmpty()){network.clear();status("Invalid account response");return;}
 connected=true;status("Connected: "+user);lookup();
 });
 }
 void disconnectAccount(){network.clear();connected=false;{std::lock_guard<std::mutex> lock(mutex);++sessionEpoch;bridge.unload();}status("Disconnected");}
 void loadROM(QByteArray bytes){if(connected)network.unload();rom=std::move(bytes);{std::lock_guard<std::mutex> lock(mutex);++sessionEpoch;bridge.unload();}if(connected){if(rom.isEmpty())status("Connected; no ROM");else lookup();}}
 void unloadROM(){rom.clear();if(connected)network.unload();{std::lock_guard<std::mutex> lock(mutex);++sessionEpoch;bridge.unload();}status(connected?"Connected; no ROM":"Disconnected");}
 void lookup(){if(!connected||rom.isEmpty())return;status("Identifying ROM...");network.loadROM(rom,[this](QByteArray data,QString error){
 if(!error.isEmpty()){status(error);return;}
 auto game=QJsonDocument::fromJson(data).object().value("game").toObject();
 if(game.isEmpty()){status("Unknown ROM");return;}
 auto set=decodeGame(data);auto count=set.size();{std::lock_guard<std::mutex> lock(mutex);bridge.load(std::move(set));}
 status(game.value("title").toString()+" — "+QString::number(qulonglong(count))+" practice achievements");
 });}
 // Host must stop the emulation thread before destroying this controller.
 void frame(const ReadByte& read,const std::function<void(QString)>& notify){
 std::vector<QString> events;quint64 epoch;{std::lock_guard<std::mutex> lock(mutex);epoch=sessionEpoch.load();bridge.frame(read,[&](const Achievement& a){events.push_back(QString::fromStdString(a.title));});}
 for(const auto& title:events)QMetaObject::invokeMethod(this,[this,notify,title,epoch](){if(epoch!=sessionEpoch.load())return;notify("RetroQuest practice: "+title);},Qt::QueuedConnection);
 }
};
}
