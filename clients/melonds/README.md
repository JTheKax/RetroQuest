# melonDS integration scaffold

C++17 header-only practice evaluator. Not a patched melonDS build. Host must fetch authenticated game definitions using the documented HTTPS API, parse validated JSON, map the exact ROM hash, and call Bridge::load. Call Bridge::frame on the emulation thread with a side-effect-free ARM9 memory reader, and dispatch notification callbacks to the UI thread. Restrict reads to mapped safe RAM; return nullopt elsewhere. Call unload on ROM close, reset or state changes. Do not call memory-mapped I/O reads. Tokens must be stored securely outside logs and source. Notifications are practice-only. No client-supplied memory evidence can prove legitimate play by itself.

Smoke test: `c++ -std=c++17 bridge_test.cpp -o bridge_test && ./bridge_test`.

Actual melonDS source integration, network transport, GUI and official submission remain pending.
