#include "retroquest_bridge.h"
#include <cassert>
int main(){retroquest::Bridge b;b.load({{"test","Practice",false,{{16,1,"eq",42}}}});int n=0;auto read=[](uint32_t a)->std::optional<uint8_t>{return a==16?std::optional<uint8_t>(42):std::nullopt;};auto notify=[&](const auto&){++n;};b.frame(read,notify);b.frame(read,notify);assert(n==1);b.unload();b.frame(read,notify);assert(n==1);}
