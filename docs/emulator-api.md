# RetroQuest emulator API v1

Generate a private token in Account settings. Send it over HTTPS in `Authorization: Bearer TOKEN`. Tokens expire after 30 days and can be revoked or replaced. Never embed tokens in distributed software.

- GET `/api/emulator/v1/me`: authenticated username and API version.
- GET `/api/emulator/v1/game?sha256=HEX`: SHA-256 of exact ROM bytes; returns published game and achievement metadata, or game null.

Owner assigns fingerprints in Catalog Manager. Different ROM revisions require separate fingerprints. No ROM uploads are needed. Unlock reporting is intentionally disabled until a trusted verification design and emulator client exist. This API is not compatible with RetroAchievements clients without adaptation.
