# Master prompt

Másold be az alábbi blokkot a saját Claude-od elejére, hogy egyből képben legyen a projekttel.
Az adatbázis linkjét (DATABASE_URL) privátban kapod, tedd egy `.env` fájlba, és ne commitold.

```
Egy egyetemi Adatbányászat beadandón dolgozom egy 3 fős csoportban. Ez a háttér, ehhez igazodj:

FELADAT (a tárgy kiírása)
- Egy adatsor elemzése a CRISP-DM módszertan szerint: adatelőkészítés, modellezés, kiértékelés, vizualizáció.
- 1–3 kutatási kérdés kell, a módszertan bemutatása, és MINDEN bekezdésben Harvard-stílusú hivatkozás (nemzetközi és hazai forrás is).
- Terjedelem: 7–10 oldal összesen (címlap, tartalomjegyzék, ábrák, irodalomjegyzék is beleszámít).
- Word formázás: Címsor 1/2, automatikus tartalomjegyzék, automatikus ábra- és táblázatfeliratok ábrajegyzékkel, a Word forráskezelője.
- Ábra- és táblázatfelirat mintája: „1. ábra: Cím”, alatta „Forrás: Tomczak, 2016 alapján saját szerkesztés”.
- Mellé egy 5–7 perces mini prezentáció.

TÉMA
A csődöt megelőző 1–5 év pénzügyi mutatóinak elemzése: milyen korai figyelmeztető jelek utalnak a cégek bukására (likviditás, eladósodottság, jövedelmezőség).

ADAT
- Polish companies bankruptcy data (UCI #365, Tomczak, 2016; Zięba, Tomczak és Tomczak, 2016). Lengyel feldolgozóipari cégek.
- 43 004 sor, ebből 2 083 csődbe ment (4,8%).
- ev_a_csodig (1–5): hány évvel a csőd vagy a működés megállapítása előtt mérték a mutatókat. 1 = az utolsó év a csőd előtt.
- Korlátok: nincs benne a cég kora és azonosítója, ezért az „első 5 év” nem vizsgálható, és ugyanaz a cég nem követhető évről évre.

AMI MÁR KÉSZ (adatelőkészítés)
- Az 5 fájl összefűzve, 401 duplikátum törölve.
- Az X37 kihagyva (44%-ban hiányzott).
- A hiányzó értékek mediánnal pótolva.
- 1–99%-os winsorizálás (a kiugró értékek levágása).
- Hiányjelző oszlopok: hiany_x21, hiany_x27. A hiány maga is jel: az X27 a bukott cégeknél 34%-ban, a működőknél 5%-ban hiányzik.
- A mutatók csoportokba sorolva: jövedelmezőség (20), eladósodottság (18), likviditás (15), hatékonyság (9), méret (1), növekedés (1).
- A SMOTE és az osztálysúlyozás NINCS az adatban, azt modellezéskor, csak a tanító adaton kell alkalmazni.

HOL VAN
- GitHub (publikus): https://github.com/Numm1th0r/csodelemzes-beadando
  - scripts/prep.py: a tisztítás
  - notebooks/elemzes.ipynb: első elemzések
  - abrak/: ábrák
  - data_clean/polish_modell_kesz.csv: a kész tábla
  - data_clean/mutato_szotar.csv: a mutatók leírása
- Neon Postgres, csak olvasási joggal. A DATABASE_URL a .env fájlomban van, olvasd onnan, és soha ne írd ki és ne commitold.
  - Tábla „adatok”: id, ev_a_csodig, forras_fajl, csod (bool), x1..x64 (x37 nélkül), hiany_x21, hiany_x27. Nincs benne hiányzó érték.
  - Tábla „mutato_szotar”: mutato, leiras, csoport, hiany_arany.
  - Nézetek: v_csodarany, v_kulcsmutatok_median.

ÖTLETEK (csak javaslatok, nincs kiosztva és nincs eldöntve)
Lehetséges kutatási kérdések:
- Melyik mutatócsoport választja el legjobban a csődös cégeket a működőktől?
- Hány évvel a csőd előtt jelennek meg az eltérések, és melyik mutatónál a legkorábban?
- Mennyire jelezhető előre a csőd? (Gépi tanulás összevetve az Altman Z-score-ral.)
Lehetséges irányok és módszerek:
- Figyelmeztető jelek: mediánok évenként, Mann–Whitney próba, egyváltozós AUC.
- Előrejelzés: logisztikus regresszió, döntési fa, Random Forest, XGBoost. Mérőszámok: AUC, recall, F1 (az accuracy félrevezető). Mely mutatók a legfontosabbak?
- Bukási típusok: k-közép klaszterezés a csődös cégeken, és az Altman Z'' összevetése.

ELSŐ EREDMÉNYEK
- A jövedelmezőség jelez a legerősebben: a ROA 5 évvel a csőd előtt 2% (a működőknél 8%), az utolsó évben negatív.
- Az eladósodottság a második: a kötelezettségek az eszközök kb. 65–72%-a, a működőknél kb. 45%.
- A likviditás csak az utolsó 1–2 évben romlik meg igazán.
- Az XGBoost AUC-ja 0,92–0,96, az Altman Z-score-é csak 0,61–0,71.
- Furcsaság: 5 évvel előre jobb az AUC, mint 2–4 évvel előre. Ezt még ellenőrizni kell.

HOGYAN DOLGOZZ
- Magyarul, röviden válaszolj.
- Python (pandas, scikit-learn, xgboost). A „adatok” táblából vagy a kész CSV-ből indulj.
- Minden állításhoz javasolj Harvard-hivatkozást.
```
