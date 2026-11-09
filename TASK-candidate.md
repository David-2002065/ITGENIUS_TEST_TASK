# Test topshiriq — Frontend dasturchi

## Kontekst
Biz yuk tashish (logistika) kompaniyasimiz. Ichki CRM tizimida dispetcherlar, menejerlar va call-markaz xodimlari kuniga yuzlab
yozuv bilan ishlaydi. Ularning asosiy ish vositasi — jadval (tablitsa).

## Topshiriq
Quyidagi **uchta sahifa** uchun jadval ko'rinishidagi interfeys yarating. Har bir sahifa o'z JSON faylidan ma'lumot oladi
(`data/` papkasi). Backend (API) yo'q — fayllarni lokal o'qing.

| Sahifa | Fayl | Nima ko'rsatadi |
|---|---|---|
| Reyslar | `data/trips.json` | Yuk tashish reyslari |
| Kontragentlar | `data/counterparties.json` | Kompaniyalar va shaxslar |
| Litsenziyalar | `data/licenses.json` | Tashuvchilar litsenziyalari reestri |

Fayllarning tuzilishi (struktura) bir-biridan farq qiladi. Ma'lumotlar real hayotdagidek bo'lishi mumkin — to'liq bo'lmasligi ham mumkin.

## Talablar
1. Foydalanuvchi har bir sahifada ma'lumotni qulay ko'ra olishi, qidira olishi va saralay olishi kerak.
2. Jadval Excel bilan ishlashga o'rgangan odamga tanish bo'lishi kerak: ustunlar bilan ishlash imkoniyatlari bo'lsin
   (ustun bo'yicha filtr, saralash va h.k. — qaysilari kerakligini o'zingiz hal qiling).
3. Uchala sahifada jadvalning ko'rinishi va ishlash tartibi (ayniqsa filtrlar) bir xil bo'lsin.
4. Fayllardagi ma'lumot tuzilishi keyinchalik o'zgarishi mumkin. Ilova shunday holatda ham ishlashda davom etishi,
   ma'lumotlar ekranda yo'qolib qolmasligi kerak.
5. Texnik ТЗ berilmagan: bu bilan qaror qabul qilish qobiliyatingizni ko'rmoqchimiz. Ko'rsatilmagan joylarni o'zingiz
   foydalanuvchi nuqtai nazaridan hal qiling.

## Cheklovlar
- Texnologiya (framework, kutubxona) — o'zingiz tanlaysiz. Tanlovingizni qisqa asoslang.
- Tayyor "table" kutubxonalaridan (AG Grid, TanStack Table va shu kabilar) foydalansangiz — nima uchun ekanini yozing.
- Haqiqiy ma'lumotlar yo'q, barcha ismlar va telefon raqamlari to'qima.

## Nimani topshirasiz
1. Ishlaydigan loyiha (GitHub repo yoki zip) va ishga tushirish uchun yo'riqnoma (`README.md`).
2. `README.md` ichida: nimani qanday hal qilganingiz, qaysi qarorlar sizga qiyin bo'lgani, vaqtingiz yetsa nimani qo'shardingiz.
3. Qisqa (2–3 daqiqa) ekran yozuvi yoki skrinshotlar — ixtiyoriy.

## Vaqt
2–3 kun. Mukammallik shart emas — qarorlaringiz va ularning sababi muhimroq.
