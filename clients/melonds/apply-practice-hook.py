"""Apply a narrowly scoped practice-only frame hook to an audited melonDS checkout."""
import pathlib, sys, shutil
root=pathlib.Path(sys.argv[1])
target=root/"src/frontend/qt_sdl/EmuThread.cpp"
source=target.read_text(encoding="utf-8")
anchor="nlines = emuInstance->nds->RunFrame();"
if source.count(anchor)!=1 or "retroquest_bridge.h" in source:
    raise SystemExit("Unexpected upstream source or already patched")
# No synthetic achievements or game entries. The bridge remains empty until
# authenticated ROM lifecycle integration supplies a validated achievement set.
source=source.replace('#include "EmuInstance.h"', '#include "EmuInstance.h"\n#include "retroquest_bridge.h"')
source=source.replace("void EmuThread::run()\n{","void EmuThread::run()\n{\n    retroquest::Bridge rqPractice;")
source=source.replace(anchor,anchor+'''
            rqPractice.frame(
                [&](uint32_t address) -> std::optional<uint8_t> {
                    if (address < 0x02000000u || address >= 0x02400000u) return std::nullopt;
                    return emuInstance->nds->MainRAM[address - 0x02000000u];
                },
                [&](const retroquest::Achievement& a) {
                    emuInstance->osdAddMessage(0xFFC040, "RetroQuest practice: %s", a.title.c_str());
                });
''')
if source.count("retroquest::Bridge rqPractice;")!=1 or source.count('#include "retroquest_bridge.h"')!=1:
    raise SystemExit("Unexpected upstream function or include")
shutil.copyfile(pathlib.Path(__file__).with_name("retroquest_bridge.h"),target.with_name("retroquest_bridge.h"))
target.write_text(source,encoding="utf-8")
print("Practice frame hook applied. Restricted main RAM reads enabled; authenticated game loading remains disabled.")
