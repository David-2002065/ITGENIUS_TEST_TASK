# Yuk CRM — jadvallar (test topshiriq)

Logistika CRM uchun uchta sahifa: **Reyslar**, **Kontragentlar**, **Litsenziyalar**. Ma'lumotlar lokal JSON fayllardan o'qiladi (`public/data/`), backend yo'q.

## Ishga tushirish

```bash
npm install
npm run dev        # http://localhost:5173
# yoki production build:
npm run build && npm run preview
```

Node 18+ kerak. Ma'lumot fayllari `public/data/*.json` ichida. Ularni almashtirib, sahifadagi ⟳ tugmasini bossangiz bo'ldi, qayta build qilish shart emas. Toolbar'dagi ⤒ tugmasi orqali istalgan JSON faylni ochib, ilova boshqa tuzilmali ma'lumotga qanday chidashini tekshirish mumkin.

## Texnologiya va sabablari

| Tanlov | Nima uchun |
|---|---|
| **React 18 + TypeScript** | Komponentlar uchala sahifada bitta jadvalni qayta ishlatishga qulay. TS esa "noma'lum" JSON bilan ishlaganda xatolarni oldindan ushlaydi |
| **Vite** | Tez dev-server, sozlashga hojat yo'q |
| **Tayyor table kutubxonasi yo'q** | Asosiy qiymat jadvalning o'zida: Excel'ga o'xshash filtr, virtualizatsiya, sxemani avtomatik aniqlash. Bularni o'zim yozdim (~1000 qator). AG Grid juda og'ir va litsenziyali, TanStack esa baribir UI'ni to'liq yozishni talab qiladi |
| **lucide-react** | Faqat ikonlar uchun |
| **Oddiy CSS (CSS variables)** | Bitta mavzu (oq + binafsha), qo'shimcha bog'liqlik yo'q |

## Nimani qanday hal qildim

### 1. Bitta universal jadval (`src/table/`)
Uchala sahifa bitta `DataTable` komponentini ishlatadi. Sahifalar faqat **konfiguratsiya** bilan farq qiladi (`src/pages/configs.tsx`): ustun nomi, turi, rang/tarjima. Shuning uchun ko'rinish va filtrlar hamma joyda bir xil (talab №3).

### 2. Excel'ga o'xshash ustun imkoniyatlari
- **Ustun filtri** (sarlavhadagi ⧩ belgisi). Excel'dagi kabi bitta oyna:
  - saralash (A→Z / Z→A, kichik→katta, eski→yangi);
  - turga qarab shart: matn uchun "tarkibida", son/narx uchun "dan–gacha", sana uchun oraliq va tezkor tugmalar (7 kun / 30 kun / shu oy);
  - **qiymatlar ro'yxati** (checklist), har birining soni bilan; qidiruv, "Hammasini tanlash" va **"faqat"** tugmasi (bitta qiymatni tez tanlash) bor;
  - ro'yxatdagi sonlar boshqa filtrlar hisobga olingan holda chiqadi (Excel'dagi kabi kaskad);
  - `(Bo'sh)` qiymati bor, shu bilan "haydovchisi yo'q", "telefoni yo'q" qatorlarni topish oson.
- **Saralash**: sarlavhani bosish → ↑ → ↓ → o'chiq. **Shift + bosish** bilan bir nechta ustun bo'yicha saralanadi. Bo'sh qiymatlar har doim oxirida turadi.
- **Ustunlar paneli**: yashirish/ko'rsatish, sudrab tartibini o'zgartirish, chapga **mahkamlash (freeze)**. Tartibni sarlavhani sudrab ham o'zgartirsa bo'ladi.
- **Kenglik**: ustun chetidan sudrash, ikki marta bosilsa avtomatik kenglik.
- **Global qidiruv** barcha ustunlar bo'yicha ishlaydi. Topilgan so'zlar sariq rangda belgilanadi. Bo'sh joysiz ham qidirsa bo'ladi: `998900000001` telefonni, `01B101` davlat raqamini topadi. `o'`/`oʻ`/`o‘` farqi hisobga olinmaydi. `/` yoki `Ctrl+F` qidiruvga o'tkazadi.
- **Faol filtrlar** jadval tepasida chip ko'rinishida chiqadi. Bitta bosish bilan tahrirlash, ✕ bilan o'chirish mumkin.
- **Tezkor kartochkalar** (Yo'lda, Nizoli, Muddati o'tgan…) bosilganda shu filtr qo'llanadi.
- **Qator tanlash** va **CSV eksport** (Excel'da to'g'ri ochiladi: UTF-8 BOM, `;` ajratgich). Eksport filtrlangan yoki faqat tanlangan qatorlarni oladi.
- **Qator kartochkasi**: qatorni bosganda o'ng panelda barcha maydonlar (yashirinlari ham) va **asl JSON** chiqadi. ↑/↓ bilan qatorlar orasida yurish mumkin.
- **Zichlik** (oddiy/ixcham). Barcha sozlamalar (ustunlar, filtrlar, saralash) sahifa bo'yicha `localStorage`'da saqlanadi.

### 3. Virtualizatsiya
Sahifalash o'rniga qatorlar virtualizatsiya qilingan: DOM'da faqat ko'rinib turgan qatorlar (+8 ta zahira) chiziladi, qolgani bo'sh joy bilan to'ldiriladi. Qator balandligi qat'iy (matn bir qatorda, `…` bilan qisqaradi), shuning uchun hisob aniq chiqadi. 5000 qatorli fayl bilan tekshirildi: DOM'da ~30 ta `<tr>` bo'ladi, scroll silliq. Dispetcherlar uchun Excel'dagidek bitta uzluksiz ro'yxat sahifalashdan qulayroq.

### 4. Ma'lumot tuzilishi o'zgarsa ham ishlaydi (talab №4)
`src/lib/normalize.ts`:
- **Ildiz tuzilishini avtomatik topadi**: `[...]`, `{items: [...]}`, `{data: {licenses: [...]}}` va boshqalar (avval ma'lum kalitlar, bo'lmasa eng katta obyektlar massivi).
- Ichma-ich obyektlar `driver.name` ko'rinishidagi yo'llarga yoyiladi.
- **Konfiguratsiyada yo'q yangi maydonlar ham yo'qolmaydi**: ular avtomatik ustun bo'lib qo'shiladi, turi qiymatlardan aniqlanadi va "yangi" belgisi bilan chiqadi. Masalan, `counterparties.json` dagi `extra.note` / `extra.score`. Sahifa tepasida bu haqda xabar chiqadi.
- Konfiguratsiyada bor, lekin faylda yo'q maydonlar yashiriladi va xabarda aytiladi. Ularning saqlangan sozlamalari o'chmaydi.
- **Formati kutilganidek bo'lmagan qiymatlar tashlab yuborilmaydi**. Masalan, `"12,5"` (vergulli satr) son sifatida o'qiladi. `"26.10.2026"` va ISO sanalar bir xil ishlaydi. O'qib bo'lmaydigan qiymat ⚠ belgisi bilan matn holida ko'rsatiladi.
- **Noma'lum enum qiymatlari** (masalan, `ARCHIVED_V2`) kulrang belgida o'z nomi bilan chiqadi va filtrda ham bor.
- `null`, yo'q kalit, bo'sh massiv bir xil "bo'sh" deb qaraladi (`—`). Muhim joylarda ma'noli matn chiqadi: "Biriktirilmagan", "Fayl yo'q", "Muddat yo'q".
- Saqlangan sozlamalar yangi ustunlar ro'yxati bilan solishtiriladi (yangi ustun qo'shiladi, o'chganlari olib tashlanadi). Xatolik bo'lsa, sahifa darajasidagi ErrorBoundary "Sozlamalarni tiklash" tugmasini ko'rsatadi.

### 5. Sahifalar bo'yicha qarorlar
- **Reyslar**: statuslar o'zbekchaga tarjima qilingan va rangli. Yo'nalish shahar + davlat kodi ko'rinishida (davlat ko'rsatilmasa `?`). Narx valyuta bilan chiqadi. **Turli valyutalarni bir-biri bilan solishtirib bo'lmaydi**, shuning uchun narx avval valyuta, keyin summa bo'yicha saralanadi. Haydovchisiz reys qizil belgi bilan ajratiladi.
- **Kontragentlar**: yuridik va jismoniy shaxs ikonkasi, rollar tarjima qilingan, STIR va JSHSHIR alohida ustunlarda. Dublikati bor yozuv nom yonida belgi bilan ko'rsatiladi.
- **Litsenziyalar**: hisoblanadigan ustunlar qo'shilgan. Bular **Holat** (Amal qiladi / Tugayapti ≤30 kun / Muddati o'tgan / Muddat yo'q) va **Qolgan kun** (bugungi sanadan hisoblanadi). Muddati tugayotganlarni topish reestrning asosiy vazifasi deb hisobladim.

### 6. Interfeys: sidebar, dock va dark mode
- **Ikki xil navigatsiya** (Sozlamalar → Ko'rinish):
  - **Yon panel** — oyna chetidan 10px uzoqda turadigan suzuvchi panel. Bo'limlar guruhlangan, ikonlar rangli plitkalarda, faol bo'lim chap tomondagi chiziq bilan belgilanadi. Panel yig'iladi (68px), shunda bo'lim nomi tooltip bo'lib chiqadi. Mobilda chetdan chiqadigan menyuga aylanadi.
  - **Pastki dock** — macOS uslubida: kursor ostidagi ikonka kattalashadi, qo'shnilari biroz kattalashadi, ustida bo'lim nomi chiqadi.
- **Menyu badge'lari**: nizoli reyslar va muddati o'tgan litsenziyalar soni qizil rangda ko'rsatiladi. Ilova ochilganda uchala fayl ham sanab chiqiladi.
- **Mavzu**: yorug' / qorong'i / tizim. Barcha ranglar CSS tokenlarida (`:root` va `.dark`). Mavzu bosilgan nuqtadan aylana bo'lib almashadi (View Transitions API). Sahifa chizilishidan oldin mavzu `index.html` dagi skript orqali qo'yiladi, shuning uchun oq "chaqnash" bo'lmaydi.
- Sozlamalar `localStorage`'da saqlanadi (`crm-prefs`).

## Qiyin bo'lgan qarorlar
- **Sahifalash yoki virtualizatsiya.** Avval sahifalash qilgandim, keyin virtualizatsiyaga o'tdim. Excel foydalanuvchisi uzluksiz scroll'ga o'rgangan. Buning narxi: qatorlar bir xil balandlikda bo'lishi, uzun matn esa `…` bilan qisqarishi kerak. To'liq matn tooltip va qator kartochkasida ko'rinadi.
- **Aralash valyutadagi narxni saralash.** Kurs bo'lmagani uchun summalarni solishtirmadim, valyuta bo'yicha guruhladim.
- **Noma'lum maydonni qanday ko'rsatish.** Yashirsam, ma'lumot "yo'qoladi". Ko'rsatsam, jadval chalkashishi mumkin. Ko'rsatishni tanladim va "yangi" belgisi bilan ajratdim: foydalanuvchi uni bitta bosishda yashira oladi.
- **Checklist filtrini qanday saqlash** (tanlanganlar yoki chiqarilganlar). Excel'dagi kabi tanlanganlarni saqladim. Shuning uchun yangi faylda paydo bo'lgan qiymat filtrdan avtomatik o'tmaydi, bu esa kutilmagan holatni darhol ko'rsatadi.

## Vaqt bo'lsa nimani qo'shardim
- Klaviatura bilan katakdan katakka yurish va katakni nusxalash (Ctrl+C), Excel'dagidek
- Ustunlar bo'yicha guruhlash va pastki qatorda yig'indi/o'rtacha (masalan, valyuta bo'yicha jami narx)
- Saqlangan "ko'rinishlar" (masalan, "Mening nizoli reyslarim")
- Sahifalararo bog'lanish: reysdagi haydovchi → kontragent kartochkasi, davlat raqami → litsenziya
- Haqiqiy `.xlsx` eksport, ustunlarni virtualizatsiya qilish (100+ ustun uchun)
- Unit testlar (`normalize`, `cells`, `engine` toza funksiyalar, shuning uchun test yozish oson) va e2e (Playwright)
- i18n (rus tili)

## Tuzilma

```
public/data/              JSON fayllar
src/lib/normalize.ts      JSON → qatorlar, ustunlarni aniqlash, tur aniqlash, parse
src/lib/cells.ts          Qiymatni normallashtirish (matn, saralash kaliti, filtr kalitlari), format
src/table/engine.ts       Filtr, qidiruv, saralash (toza funksiyalar)
src/table/DataTable.tsx   Jadval: toolbar, sarlavhalar, virtualizatsiya, chip'lar
src/table/FilterPopover   Excel'ga o'xshash ustun filtri
src/table/ColumnsPanel    Ustunlarni boshqarish
src/table/RowDrawer       Qator kartochkasi + asl JSON
src/table/useTableState   Holat va localStorage, sxema bilan solishtirish
src/pages/configs.tsx     3 sahifa konfiguratsiyasi
src/pages/DataPage.tsx    Yuklash, xatolar, statistika kartochkalari
src/pages/SettingsPage    Ko'rinish, mavzu, jadval sozlamalari
src/layout/               Sidebar, Dock, mavzu va afzalliklar (prefs)
```
