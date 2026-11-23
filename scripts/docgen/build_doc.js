// Adatelőkészítés + kutatási kérdések rész (Word) – node build_doc.js <kimenet.docx>
const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell,
  WidthType, ShadingType, BorderStyle, ImageRun, TableOfContents, SimpleField, Header, Footer,
  PageNumber, PageBreak, LevelFormat,
} = require("docx");

const ROOT = path.resolve(__dirname, "..", "..");
const FONT = "Calibri";
const W = 9026; // A4, 1" margók → szövegszélesség DXA-ban

// ---------- segédek ----------
const runs = (s) =>
  // **félkövér** és *dőlt* jelölés egyszerű feldolgozása
  s.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/).filter(Boolean).map((t) =>
    t.startsWith("**") ? new TextRun({ text: t.slice(2, -2), bold: true })
      : t.startsWith("*") ? new TextRun({ text: t.slice(1, -1), italics: true })
      : new TextRun(t));
const P = (s, o = {}) => new Paragraph({ children: runs(s), alignment: AlignmentType.JUSTIFIED, ...o });
const H1 = (s) => new Paragraph({ text: s, heading: HeadingLevel.HEADING_1 });
const H2 = (s) => new Paragraph({ text: s, heading: HeadingLevel.HEADING_2 });
const B = (s, level = 0) => new Paragraph({ children: runs(s), numbering: { reference: "pont", level }, alignment: AlignmentType.JUSTIFIED });
const N = (s) => new Paragraph({ children: runs(s), numbering: { reference: "szam", level: 0 }, alignment: AlignmentType.JUSTIFIED });

const caption = (label, title) => new Paragraph({
  style: "Caption", keepNext: label === "táblázat",
  children: [new SimpleField(`SEQ ${label} \\* ARABIC`, "1"), new TextRun(`. ${label}: ${title}`)],
});
const forras = (s) => new Paragraph({ style: "Forras", children: runs(`Forrás: ${s}`) });

const img = (file, wPx, hPx) => new Paragraph({
  alignment: AlignmentType.CENTER, keepNext: true,
  children: [new ImageRun({ type: "png", data: fs.readFileSync(path.join(ROOT, "abrak", file)),
    transformation: { width: wPx, height: hPx } })],
});

const border = { style: BorderStyle.SINGLE, size: 4, color: "A6A6A6" };
const borders = { top: border, bottom: border, left: border, right: border };
function table(widths, header, rows) {
  const cell = (t, w, head, right, keep) => new TableCell({
    borders, width: { size: w, type: WidthType.DXA },
    shading: head ? { fill: "DCE6F1", type: ShadingType.CLEAR, color: "auto" } : undefined,
    margins: { top: 50, bottom: 50, left: 90, right: 90 },
    children: [new Paragraph({ keepNext: keep, alignment: right ? AlignmentType.RIGHT : AlignmentType.LEFT,
      children: [new TextRun({ text: t, bold: head, size: 19 })] })],
  });
  const isNum = (t) => /^[-−\d\s.,%]+$/.test(t);
  return new Table({
    width: { size: widths.reduce((a, b) => a + b), type: WidthType.DXA }, columnWidths: widths,
    rows: [
      new TableRow({ tableHeader: true, children: header.map((t, i) => cell(t, widths[i], true, false, true)) }),
      ...rows.map((r, ri) => new TableRow({ cantSplit: true, children: r.map((t, i) => cell(t, widths[i], false, i > 0 && isNum(t), ri < rows.length - 1)) })),
    ],
  });
}

// ---------- tartalom ----------
const body = [];
const add = (...x) => body.push(...x);

// Címlap
add(
  new Paragraph({ spacing: { before: 2400 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "A csődöt megelőző időszak pénzügyi mutatóinak elemzése", bold: true, size: 40 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 240 },
    children: [new TextRun({ text: "Adatbányászat (Data Mining) – beadandó dolgozat", size: 28 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120 },
    children: [new TextRun({ text: "Részanyag: adatmegértés, adatelőkészítés és kutatási kérdések", italics: true, size: 24 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 2400 },
    children: [new TextRun({ text: "Szerzők: [Név 1, NEPTUN] · [Név 2, NEPTUN] · [Név 3, NEPTUN]", size: 24 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120 },
    children: [new TextRun({ text: "2026", size: 24 })] }),
  new Paragraph({ children: [new PageBreak()] }),
);

// Jegyzékek
add(
  new Paragraph({ style: "JegyzekCim", text: "Tartalomjegyzék" }),
  new TableOfContents("Tartalomjegyzék", { hyperlink: true, headingStyleRange: "1-2" }),
  new Paragraph({ style: "JegyzekCim", text: "Ábrajegyzék", spacing: { before: 360 } }),
  new TableOfContents("Ábrajegyzék", { hyperlink: true, captionLabelIncludingNumbers: "ábra" }),
  new Paragraph({ style: "JegyzekCim", text: "Táblázatjegyzék", spacing: { before: 360 } }),
  new TableOfContents("Táblázatjegyzék", { hyperlink: true, captionLabelIncludingNumbers: "táblázat" }),
  new Paragraph({ children: [new PageBreak()] }),
);

// 1. Bevezetés
add(
  H1("1. A rész célja és a CRISP-DM keretezés"),
  P("A csődelőrejelzés a pénzügyi adatbányászat egyik legrégebbi alkalmazási területe: már az első vizsgálatok is azt mutatták, hogy a csődbe menő vállalatok pénzügyi mutatói évekkel a megszűnés előtt eltérnek az életképes cégekétől (Beaver, 1966; Altman, 1968). A szakirodalmi áttekintések szerint a legtöbbször használt előrejelző változók a jövedelmezőségi, az eladósodottsági és a likviditási mutatók (Bellovary, Giacomino and Akers, 2007), és a hazai csődmodellek is ugyanezekre a mutatócsoportokra épülnek (Virág és Kristóf, 2005)."),
  P("Ez a rész a CRISP-DM módszertan első három fázisát fedi le: az üzleti probléma megértését, az adatmegértést és az adatelőkészítést (Chapman et al., 2000). A módszertan szerint a projekt idejének jelentős részét az adatok megismerése és előkészítése teszi ki, és a későbbi modellek megbízhatósága nagymértékben ezen múlik (Wirth and Hipp, 2000; Han, Kamber and Pei, 2012). A fejezet eredménye egy tisztított, dokumentált és a csoport által közösen elérhető adatbázis, valamint a további elemzést irányító kutatási kérdések."),
);

// 2. Adatforrás
add(
  H1("2. Az adatforrás bemutatása"),
  H2("2.1. Az adatsor eredete"),
  P("A vizsgálat adatforrása a UCI Machine Learning Repository nyilvános *Polish companies bankruptcy data* adatsora (Tomczak, 2016). Az adatok lengyel feldolgozóipari vállalatok pénzügyi beszámolóiból származnak, az EMIS adatbázisból; a csődbe ment cégek adatai a 2000–2012, a működő cégeké a 2007–2013 közötti időszakot fedik le (Zięba, Tomczak and Tomczak, 2016). Az adatsort eredetileg egy boosting alapú csődelőrejelző modell tesztelésére állították össze, ezért a nemzetközi szakirodalomban gyakran használt referenciaadatnak számít."),
  H2("2.2. Az adatsor szerkezete"),
  P("Az adatsor öt külön fájlból áll. Mindegyik fájl ugyanazt a 64 pénzügyi mutatót (Attr1–Attr64) és egy bináris osztálycímkét tartalmazza, a különbség az előrejelzési távban van: az *1year* fájl a megfigyelés utáni ötödik évben megállapított státuszt, az *5year* fájl a következő évi státuszt tartalmazza (Tomczak, 2016). Az elemzéshez ezt egy egységes **ev_a_csodig** változóvá alakítottuk (1 = a státusz előtti utolsó év, 5 = öt évvel korábbi állapot), így a fájlok egyetlen táblában, a csődig hátralévő idő szerint összehasonlíthatók. Az 1. táblázat a horizontonkénti megoszlást mutatja."),
  caption("táblázat", "A megfigyelések és a csődarány megoszlása előrejelzési táv szerint"),
  table([1500, 1900, 1900, 1800, 1926],
    ["Forrásfájl", "Évek a státuszig", "Megfigyelés (db)", "Csődbe ment (db)", "Csődarány"],
    [["1year", "5", "6 945", "271", "3,9%"],
     ["2year", "4", "10 083", "398", "3,9%"],
     ["3year", "3", "10 416", "493", "4,7%"],
     ["4year", "2", "9 710", "513", "5,3%"],
     ["5year", "1", "5 850", "408", "7,0%"],
     ["Összesen", "–", "43 004", "2 083", "4,8%"]]),
  forras("Tomczak, 2016 alapján saját szerkesztés (duplikátumok eltávolítása után)"),
  P("Fontos módszertani sajátosság, hogy az adatsor nem tartalmaz cégazonosítót, így ugyanazt a vállalatot nem lehet évről évre követni; a horizontok közötti összehasonlítás ezért keresztmetszeti jellegű, a csődbe ment és a működő cégcsoportok mutatóinak eltérését vizsgálja (Zięba, Tomczak and Tomczak, 2016). Az adatsor a cégek alapítási évét sem tartalmazza, ezért a „korai szakaszban” tönkrement vállalkozások szűkítése ebből az adatból nem végezhető el; ezt a 6. fejezetben korlátként kezeljük."),
  H2("2.3. A pénzügyi mutatók csoportosítása"),
  P("A 64 mutatót a pénzügyi elemzés szokásos mutatócsoportjaiba soroltuk (2. táblázat), mivel a kutatási kérdések a csoportok összehasonlítására épülnek. A besorolás a mutatók képletén alapul, és követi a csődmodellek szakirodalmában használt felosztást (Altman, 1968; Ohlson, 1980; Virág és Kristóf, 2005). A teljes, mutatónkénti szótár (képlet, csoport, hiányarány) a közös adatbázis *mutato_szotar* táblájában érhető el."),
  caption("táblázat", "A pénzügyi mutatók csoportosítása"),
  table([1900, 900, 6226],
    ["Mutatócsoport", "Db", "Jellemző mutatók (példák)"],
    [["Jövedelmezőség", "20", "X1 nettó eredmény / összes eszköz (ROA); X7 EBIT / összes eszköz; X6 eredménytartalék / összes eszköz"],
     ["Eladósodottság", "18", "X2 kötelezettségek / összes eszköz; X10 saját tőke / összes eszköz; X27 üzemi eredmény / pénzügyi ráfordítás"],
     ["Likviditás", "15", "X4 forgóeszközök / rövid lejáratú kötelezettségek; X46 gyorsráta; X40 pénzeszköz-ráta; X3 forgótőke / összes eszköz"],
     ["Hatékonyság", "9", "X9 árbevétel / összes eszköz; X44 vevők forgási ideje; X47 készletek forgási ideje"],
     ["Méret", "1", "X29 az összes eszköz logaritmusa"],
     ["Növekedés", "1", "X21 árbevétel (n) / árbevétel (n−1)"]]),
  forras("Tomczak, 2016 mutatóleírásai alapján saját csoportosítás"),
);

// 3. Adatelőkészítés
add(
  H1("3. Adatelőkészítés és adattisztítás"),
  P("Az adatelőkészítés lépéseit Python környezetben (pandas) végeztük, reprodukálható szkriptként; a lépések a szakirodalomban javasolt sorrendet követik: beolvasás és egységesítés, duplikátumok kezelése, hiányzó értékek, kiugró értékek, végül az osztályeloszlás vizsgálata (García, Luengo and Herrera, 2015). A döntéseket a 3. táblázat foglalja össze."),
  H2("3.1. Beolvasás, egységesítés és duplikátumok"),
  P("Az öt ARFF formátumú fájlt egy közös táblába fűztük, a mutatókat X1–X64 néven egységesítettük, és minden sorhoz hozzárendeltük a forrásfájlt és az **ev_a_csodig** változót. A hiányzó értékeket jelölő „?” karaktereket és a nullával való osztásból eredő végtelen értékeket egységesen hiányzó értékké (NaN) alakítottuk. A 43 405 eredeti rekordból 401 teljesen azonos sort töröltünk, mivel a duplikált megfigyelések torzítják a leíró statisztikákat és a modellek kiértékelését (Han, Kamber and Pei, 2012); így 43 004 megfigyelés maradt."),
  H2("3.2. Hiányzó értékek"),
  P("Mind a 64 mutatóban előfordul hiányzó érték, és a sorok 54%-ában legalább egy mutató hiányzik, ezért a hiányos sorok elhagyása (listwise deletion) az adatok több mint felének elvesztésével járna. A hiány nagyrészt kis mértékű, de néhány mutatónál jelentős (1. ábra): az X37 mutató ((forgóeszközök − készletek) / hosszú lejáratú kötelezettségek) 44%-ban hiányzik, valószínűleg azért, mert sok cégnek nincs hosszú lejáratú kötelezettsége, így a hányados nem értelmezhető."),
  img("p2_hianyzo.png", 560, 288),
  caption("ábra", "A tíz leghiányosabb mutató hiányaránya cégstátusz szerint"),
  forras("Tomczak, 2016 alapján saját szerkesztés"),
  P("Az ábra lényeges megállapítása, hogy a hiány nem véletlenszerű: az X27 (üzemi eredmény / pénzügyi ráfordítás) a csődbe ment cégeknél 34%-ban, a működőknél csak 5%-ban hiányzik, az X21 (árbevétel-növekedés) esetén ez az arány 29% és 13%. A hiány tehát maga is információt hordoz a cég helyzetéről (pl. nincs előző évi árbevétel vagy nincs pénzügyi ráfordítás), ezért a szakirodalom ilyen esetben a hiányt jelző bináris változó bevezetését javasolja (Little and Rubin, 2019). Ennek alapján a kész adattáblában (*adatok*) az X37 mutatót elhagytuk; a többi mutató hiányzó értékeit mediánnal pótoltuk, amely a ferde eloszlású pénzügyi mutatóknál robusztusabb az átlagnál; az X21 és X27 mellé pedig bináris hiányjelző változót (*hiany_x21*, *hiany_x27*) képeztünk. A pótlás a teljes adaton számított mediánnal történt; szigorú modellkiértékelésnél a pótlást a tanító halmazon érdemes újraszámolni, hogy a tesztadatokból ne szivárogjon információ (García, Luengo and Herrera, 2015), ezt a nyers adatból a projekt szkriptjei reprodukálni tudják."),
  H2("3.3. Kiugró értékek"),
  P("A pénzügyi mutatók eloszlása erősen ferde, és sok szélsőséges értéket tartalmaz, amelyek jellemzően kis nevezőből (pl. közel nulla kötelezettség vagy eszközállomány) adódnak (4. táblázat). A likviditási ráta (X4) mediánja 1,57, de a maximuma 53 433, ami gazdaságilag nem értelmezhető. Az ilyen értékek törlése a csődbe ment cégek egy részét is eltávolítaná, mivel a válságban lévő vállalatoknál gyakoriak a szélsőséges mutatók, ezért törlés helyett **winsorizálást** alkalmaztunk: a kész táblában az értékeket mutatónként az 1. és 99. percentilisre vágtuk (Han, Kamber and Pei, 2012); a likviditási ráta maximuma így 53 433-ról 32,5-re csökkent. A leíró elemzésben a mediánt használjuk, amelyre a kiugró értékek nincsenek hatással."),
  caption("táblázat", "Kiválasztott mutatók szélsőértékei"),
  table([2826, 1240, 1240, 1240, 1240, 1240],
    ["Mutató", "Minimum", "1. percentilis", "Medián", "99. percentilis", "Maximum"],
    [["X1 ROA", "−463,89", "−0,58", "0,05", "0,61", "94,28"],
     ["X2 kötelezettség / eszköz", "−430,87", "0,02", "0,47", "2,07", "480,96"],
     ["X10 saját tőke / eszköz", "−479,91", "−1,13", "0,51", "0,98", "1 099,50"],
     ["X4 likviditási ráta", "−0,40", "0,20", "1,57", "32,52", "53 433,00"],
     ["X46 gyorsráta", "−101,26", "0,08", "1,03", "26,58", "53 433,00"]]),
  forras("Tomczak, 2016 alapján saját számítás"),
  H2("3.4. Az osztályok kiegyensúlyozatlansága"),
  P("A megfigyeléseknek csak 4,8%-a csődbe ment cég, és ez az arány a horizonttól függően 3,9% és 7,0% között mozog (2. ábra). Ilyen kiegyensúlyozatlan adatoknál a hagyományos pontosság (accuracy) félrevezető: egy modell, amely minden céget működőnek minősít, 95% körüli pontosságot érne el, miközben egyetlen csődöt sem jelez (He and Garcia, 2009). Ezt nem az adattáblában, hanem a modellezési fázisban kell kezelni: rétegzett mintavételt, osztálysúlyozást vagy – kizárólag a tanító halmazon – szintetikus túlmintavételezést (SMOTE) (Chawla et al., 2002), a kiértékelésre pedig ROC-AUC, visszahívás (recall) és F1 mutatókat javaslunk."),
  img("p1_osztalyeloszlas.png", 560, 272),
  caption("ábra", "A működő és csődbe ment cégek megoszlása előrejelzési táv szerint"),
  forras("Tomczak, 2016 alapján saját szerkesztés"),
  H2("3.5. Az előkészítési döntések összefoglalása és az adatok tárolása"),
  caption("táblázat", "Az adatelőkészítési lépések összefoglalása"),
  table([2000, 3626, 3400],
    ["Lépés", "Döntés", "Indoklás / hatás"],
    [["Egységesítés", "5 fájl összefűzése, X1–X64 elnevezés, ev_a_csodig változó", "A horizontok egy táblában összehasonlíthatók"],
     ["Duplikátumok", "401 azonos sor törlése", "43 405 → 43 004 megfigyelés"],
     ["Hiányzó értékek", "X37 elhagyása; mediánpótlás; hiány_x21 és hiany_x27 jelzőváltozó", "Nem véletlenszerű hiány; nincs adatvesztés"],
     ["Kiugró értékek", "Winsorizálás az 1. és 99. percentilisen", "A csődös cégek megmaradnak; X4 max.: 53 433 → 32,5"],
     ["Kiegyensúlyozatlanság", "Modellezéskor: rétegzett mintavétel, osztálysúlyozás / SMOTE", "Nem az adatban, hanem a modellben kezelendő"],
     ["Tárolás", "Neon Postgres: egyetlen kész tábla (adatok) + mutatószótár", "Egységes, közösen elérhető adat"]]),
  forras("Saját szerkesztés"),
  P("A tisztított adatokat a reprodukálhatóság és a közös munka érdekében egy felhőalapú PostgreSQL adatbázisba (Neon) töltöttük fel. Az adatbázis egyetlen kész adattáblát (*adatok*, 43 004 sor, 63 mutató és 2 hiányjelző, hiányzó érték nélkül) és egy mutatószótárt (*mutato_szotar*, 64 sor) tartalmaz, valamint előre definiált nézeteket a csődarányra és a kulcsmutatók horizontonkénti mediánjára. A csoport tagjai csak olvasási jogosultsággal érik el, így az elemzések ugyanabból a változatlan adatból indulnak. Ez megfelel a KDD-folyamat integrációs és telepítési lépésének, amely az adatok egységes, ellenőrzött tárolását írja elő (Fayyad, Piatetsky-Shapiro and Smyth, 1996)."),
);

// 4. Első leíró eredmények
add(
  H1("4. Első leíró megfigyelések"),
  P("Az előkészített adatokon végzett első leíró vizsgálat már jelzi, merre érdemes továbblépni (3. ábra). A csődbe ment cégek eszközarányos jövedelmezősége (ROA) már öt évvel a státusz előtt is jóval alacsonyabb (medián 2,1%, a működő cégeknél 7,8%), az utolsó évben pedig negatívvá válik (−6,7%). Az eladósodottság hasonlóan korán eltér: a kötelezettségek az eszközök 64–72%-át teszik ki a csődbe ment, és 44–48%-át a működő cégeknél. A likviditási mutatók különbsége ezzel szemben főként a csődöt megelőző utolsó egy-két évben erősödik fel. Ez összhangban van Beaver (1966) megfigyelésével, amely szerint a mutatók romlása a csőd közeledtével gyorsul."),
  img("01_kulcsmutatok_median.png", 600, 462),
  caption("ábra", "Kulcsmutatók mediánja a csődbe ment és a működő cégeknél a csődig hátralévő évek szerint"),
  forras("Tomczak, 2016 alapján saját szerkesztés"),
);

// 5. Kutatási kérdések
add(
  H1("5. Kutatási kérdések"),
  P("Az adatmegértés és a leíró eredmények alapján a dolgozat a következő három kutatási kérdésre keres választ. A kérdések a szakirodalom három visszatérő témáját követik: melyik mutatócsoport a legerősebb előrejelző (Altman, 1968; Bellovary, Giacomino and Akers, 2007), mennyi idővel előre jelentkeznek a figyelmeztető jelek (Beaver, 1966), és mennyire pontos a gépi tanulási modellek előrejelzése a klasszikus modellekhez képest (Zięba, Tomczak and Tomczak, 2016)."),
  N("**K1:** Melyik mutatócsoport – likviditás, eladósodottság vagy jövedelmezőség – különíti el legjobban a csődbe ment cégeket a működőktől?"),
  N("**K2:** Hány évvel a csőd előtt jelennek meg szignifikáns eltérések, és mely mutatók jeleznek a legkorábban?"),
  N("**K3:** Mennyire pontosan jelezhető előre a csőd a pénzügyi mutatók alapján, és hogyan teljesítenek a gépi tanulási modellek a klasszikus Altman-féle Z-score-hoz képest?"),
  H2("5.1. Továbbbontható alkérdések"),
  P("A kérdéseket a csoporttagok között az alábbi alkérdések mentén javasoljuk felosztani; mindegyikhez megadjuk a javasolt adatbányászati módszert (Han, Kamber and Pei, 2012)."),
  B("**Figyelmeztető jelek (K1, K2) – leíró elemzés és statisztikai próbák:**"),
  B("Mutatócsoportonként és horizontonként hogyan alakul a két cégcsoport mediánja? (Mann–Whitney U-próba, egyváltozós AUC)", 1),
  B("Melyik mutató különbsége jelenik meg már 4–5 évvel a csőd előtt, és melyik csak az utolsó évben?", 1),
  B("Informatív-e maga a hiányzó adat (pl. X21, X27) a csődre nézve?", 1),
  B("**Előrejelzés (K3) – osztályozás:**"),
  B("Milyen ROC-AUC, recall és F1 érhető el logisztikus regresszióval, döntési fával, Random Foresttel és XGBoosttal horizontonként?", 1),
  B("Mely mutatók a legfontosabbak a modellekben, és ezek melyik mutatócsoportba tartoznak?", 1),
  B("Hogyan romlik az előrejelzés pontossága, ahogy távolodunk a csődtől?", 1),
  B("**Bukási profilok és viszonyítás – klaszterezés:**"),
  B("Elkülöníthetők-e jellegzetes bukási típusok a csődbe ment cégeken belül (pl. likviditási válság, túladósodás, tartós veszteség)? (k-közép klaszterezés)", 1),
  B("Mennyire jelzi előre a csődöt az Altman-féle Z-score ezen az adatsoron? (Altman, 1968)", 1),
);

// 6. Korlátok
add(
  H1("6. Az adatok korlátai"),
  P("Az eredmények értelmezésénél a következő korlátokat kell figyelembe venni. Először, az adatsor nem tartalmazza a vállalatok életkorát, így az alapítást követő első öt évben megszűnt cégek nem választhatók le; az elemzés ehelyett a csődöt megelőző öt év mutatóit vizsgálja. Másodszor, cégazonosító hiányában a vállalatok nem követhetők évről évre, ezért az idősoros következtetések csoportszintűek. Harmadszor, az adatok lengyel feldolgozóipari cégekre vonatkoznak, így az eredmények más ágazatokra vagy a magyar gazdaságra csak óvatosan általánosíthatók (Zięba, Tomczak and Tomczak, 2016; Virág és Kristóf, 2005). Végül, a csődbe ment és a működő cégek megfigyelési időszaka eltér (2000–2012, illetve 2007–2013), ami a makrogazdasági környezet miatt torzíthatja az összehasonlítást."),
);

// Irodalomjegyzék
const refs = [
  "Altman, E.I. (1968) 'Financial ratios, discriminant analysis and the prediction of corporate bankruptcy', *The Journal of Finance*, 23(4), pp. 589–609.",
  "Beaver, W.H. (1966) 'Financial ratios as predictors of failure', *Journal of Accounting Research*, 4, pp. 71–111.",
  "Bellovary, J.L., Giacomino, D.E. and Akers, M.D. (2007) 'A review of bankruptcy prediction studies: 1930 to present', *Journal of Financial Education*, 33, pp. 1–42.",
  "Chapman, P., Clinton, J., Kerber, R., Khabaza, T., Reinartz, T., Shearer, C. and Wirth, R. (2000) *CRISP-DM 1.0: Step-by-step data mining guide*, SPSS Inc.",
  "Chawla, N.V., Bowyer, K.W., Hall, L.O. and Kegelmeyer, W.P. (2002) 'SMOTE: Synthetic minority over-sampling technique', *Journal of Artificial Intelligence Research*, 16, pp. 321–357.",
  "Fayyad, U., Piatetsky-Shapiro, G. and Smyth, P. (1996) 'From data mining to knowledge discovery in databases', *AI Magazine*, 17(3), pp. 37–54.",
  "García, S., Luengo, J. and Herrera, F. (2015) *Data Preprocessing in Data Mining*, Springer, Cham.",
  "Han, J., Kamber, M. and Pei, J. (2012) *Data Mining: Concepts and Techniques*, 3rd edn, Morgan Kaufmann, Waltham.",
  "He, H. and Garcia, E.A. (2009) 'Learning from imbalanced data', *IEEE Transactions on Knowledge and Data Engineering*, 21(9), pp. 1263–1284.",
  "Little, R.J.A. and Rubin, D.B. (2019) *Statistical Analysis with Missing Data*, 3rd edn, Wiley, Hoboken.",
  "Ohlson, J.A. (1980) 'Financial ratios and the probabilistic prediction of bankruptcy', *Journal of Accounting Research*, 18(1), pp. 109–131.",
  "Tomczak, S. (2016) Polish companies bankruptcy data, UCI Machine Learning Repository, Letöltés helye: [https://archive.ics.uci.edu/dataset/365/polish+companies+bankruptcy+data] (Letöltés ideje: 2026.11.23.).",
  "Virág, M. és Kristóf, T. (2005) 'Az első hazai csődmodell újraszámítása neurális hálók segítségével', *Közgazdasági Szemle*, 52(2), pp. 144–162.",
  "Wirth, R. and Hipp, J. (2000) 'CRISP-DM: Towards a standard process model for data mining', *Proceedings of the 4th International Conference on the Practical Applications of Knowledge Discovery and Data Mining*, pp. 29–39.",
  "Zięba, M., Tomczak, S.K. and Tomczak, J.M. (2016) 'Ensemble boosted trees with synthetic features generation in application to bankruptcy prediction', *Expert Systems with Applications*, 58, pp. 93–101.",
];
add(H1("Irodalomjegyzék"), ...refs.map((r) => new Paragraph({ children: runs(r), indent: { left: 360, hanging: 360 }, spacing: { after: 100 } })));

// ---------- dokumentum ----------
const doc = new Document({
  features: { updateFields: true },
  creator: "Adatbányászat beadandó",
  title: "A csődöt megelőző időszak pénzügyi mutatóinak elemzése – adatelőkészítés",
  styles: {
    default: { document: { run: { font: FONT, size: 22 }, paragraph: { spacing: { after: 120, line: 276 } } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { font: FONT, size: 30, bold: true, color: "1F3864" },
        paragraph: { spacing: { before: 360, after: 160 }, keepNext: true, keepLines: true, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { font: FONT, size: 25, bold: true, color: "2F5496" },
        paragraph: { spacing: { before: 240, after: 100 }, keepNext: true, keepLines: true, outlineLevel: 1 } },
      { id: "Caption", name: "caption", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { font: FONT, size: 19, bold: true, color: "1F3864" },
        paragraph: { alignment: AlignmentType.CENTER, spacing: { before: 120, after: 20 } } },
      { id: "Forras", name: "Forrás", basedOn: "Normal", next: "Normal",
        run: { font: FONT, size: 18, italics: true, color: "595959" },
        paragraph: { alignment: AlignmentType.CENTER, spacing: { before: 40, after: 200 } } },
      { id: "JegyzekCim", name: "Jegyzék cím", basedOn: "Normal", next: "Normal",
        run: { font: FONT, size: 28, bold: true, color: "1F3864" },
        paragraph: { spacing: { before: 0, after: 160 } } },
    ],
  },
  numbering: {
    config: [
      { reference: "pont", levels: [
        { level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 360, hanging: 360 } } } },
        { level: 1, format: LevelFormat.BULLET, text: "–", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 900, hanging: 360 } } } },
      ] },
      { reference: "szam", levels: [
        { level: 0, format: LevelFormat.NONE, text: "", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 360 } } } },
      ] },
    ],
  },
  sections: [{
    properties: { page: { margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } }, titlePage: true },
    headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT,
      children: [new TextRun({ text: "[Név 1, NEPTUN] · [Név 2, NEPTUN] · [Név 3, NEPTUN] – Adatbányászat beadandó", size: 16, color: "808080" })] })] }) },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER,
      children: [new TextRun({ children: [PageNumber.CURRENT], size: 18 })] })] }) },
    children: body,
  }],
});

Packer.toBuffer(doc).then((buf) => { fs.writeFileSync(process.argv[2], buf); console.log("OK", process.argv[2]); });
