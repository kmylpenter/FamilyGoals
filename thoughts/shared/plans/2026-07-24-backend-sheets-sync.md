# Plan: Backend Arkusz Google + sync między urządzeniami (wzorzec KmylSales)

**Data:** 2026-07-24 · **Status:** ZREALIZOWANY tego samego dnia (fazy 1–4;
E2E 9/9 na mock backendzie; żywy GAS czeka tylko na 1-klik autoryzacji scope'ów
przez Kamila — link w logs/STATE.md)
**Cel:** dane FamilyGoals w arkuszu Google (podgląd/edycja z przeglądarki) i WSPÓLNE
między urządzeniami (tablet + telefony małżonków). Dziś localStorage = każdy ma swoje.

## Decyzja architektoniczna

**Zostawiamy front PWA + TWA APK bez zmian; dokładamy warstwę sync.**
- Przepisanie na natywny Android (jak KmylSales) = wyrzucenie ~12,4k linii
  ustabilizowanych w sesji 13 (48 testów) → ODRZUCONE.
- DataManager ma JEDEN punkt zapisu (`_setCached`) i jest singletonem
  (`window.dataManager`, fix B-M3) → idealny szew pod sync. UI nie wymaga zmian
  (renderAll już reaguje na `data:changed`).

## Komponenty

### 1. Arkusz „FamilyGoals-Data" (czytelny dla człowieka)
Karty per encja — kolumny = pola modelu + systemowe `Id, Updated_At, Deleted`:
`IncomeSources` (payments jako kolumna JSON), `Income`, `PlannedGoals`,
`BusinessCosts`, `Todos`, `Categories`, `Settings` (klucz-wartość),
`Achievements`, `Engagement`. GAS tworzy arkusz + nagłówki przy pierwszym
uruchomieniu (initSheet) — zero ręcznej roboty.

### 2. Backend GAS (`backend-gas/` w tym repo, deploy przez clasp)
Koperta IDENTYCZNA jak KmylSales (spójność między projektami):
`POST {action:'proxy_call', method, args, token}` → `{success, data|error}`.
- `getFamilyBootstrap()` → pełny snapshot + serverTime
- `getFamilyBootstrapDelta(sinceIso)` → rekordy z `Updated_At > since`
- `pushChanges(changes[])` → batch upsert/soft-delete, idempotentny
  (po id; starszy `updatedAt` niż w arkuszu = pomiń → last-write-wins)
- Auth: `FAMILY_TOKEN` w Script Properties; web app „execute as me / anyone";
  zły token → `{success:false,error:'auth'}`. (Model zagrożeń: rodzina, nie bank.)
- Lekcje z KmylSales wprost: follow redirects (302→googleusercontent),
  timeouty 20/30s (60s bootstrap), error-as-data (HTTP 200 + success:false
  = odrzut biznesowy ≠ błąd transportu).

### 3. Front: `js/sync-manager.js` (~250 linii) + mały patch DataManagera
- Mutatory DataManagera stemplują rekordy `updatedAt` (ISO) — mały diff,
  testowalny w harnessie.
- Hook w `_setCached` → wpis do TRWAŁEJ kolejki `familygoals_sync_queue`
  (localStorage), replay po nazwie metody jak OfflineQueue w KmylSales.
- Flush: przy starcie, po `online`, po każdej zmianie (debounce ~2 s).
- Pull: bootstrap przy starcie → potem delta co ~60 s i na `visibilitychange`;
  merge per-rekord LWW po `updatedAt`; po merge `_invalidateAllCache()` +
  `EventBus.emit('data:changed')` → UI sam się odświeża.
- Offline-first: brak sieci = wszystko działa jak dziś, kolejka czeka.
- Ustawienia: pole „Backend URL" + „Token rodziny" na ekranie Więcej
  (wzorzec SettingsActivity z KmylSales).

### 4. Migracja i drugie urządzenie
- Urządzenie A (dane istnieją, arkusz pusty): pełny push localStorage.
- Urządzenie B (świeże): bootstrap z arkusza NADPISUJE dane demo
  (initDemoDataIfEmpty odpala się tylko bez danych — bootstrap przed demo
  albo flaga `sync_enabled` wyłącza demo).
- Konflikt jednoczesnej edycji TEGO SAMEGO rekordu: LWW wystarcza
  (dwoje ludzi, rzadkie; przegrany wpis widać w arkuszu — nic nie ginie
  fizycznie przy soft-delete).

### 5. Bramka testowa (istniejący harness!)
- fetch-mock już jest w `tests/harness/browser-env.js` → testy sync:
  kolejka przeżywa restart, replay idempotentny, merge LWW (starszy przegrywa),
  delta aktualizuje cache, zły token nie czyści kolejki. Red→green jak w sesji 13.
- E2E: dwa profile chromium (istniejąca infrastruktura smoke) na jeden backend
  dev — zmiana na A widoczna na B po delcie.

### 6. Czego NIE robimy teraz
- Przepisania na natywny APK, kont/loginów per osoba (owner wife/husband już
  jest w danych), realtime push (delta 60 s wystarcza), szyfrowania E2E.

## Fazy (kolejność wykonania)
1. Backend GAS + initSheet + 3 metody + deploy testowy (clasp).
2. Patch `updatedAt` w DataManagerze + sync-manager + testy harness (red→green).
3. UI ustawień (URL+token) + wpięcie w init + migracja/demo-flaga.
4. E2E dwa profile + smoke + aktualizacja logów + commit(y) za zgodą.

## Otwarte do potwierdzenia przy starcie
- Konto Google, na którym stanie arkusz i skrypt (to samo co Terminator?).
- `clasp` zalogowany na tym urządzeniu? (jeśli nie: `clasp login` po Twojej stronie).
