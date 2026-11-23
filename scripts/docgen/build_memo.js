// Rövid belső összefoglaló a csapatnak – node build_memo.js <kimenet.docx>
const fs = require("fs");
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, LevelFormat } = require("docx");

const FONT = "Calibri";
const runs = (s) => s.split(/(\*\*[^*]+\*\*)/).filter(Boolean)
  .map((t) => t.startsWith("**") ? new TextRun({ text: t.slice(2, -2), bold: true }) : new TextRun(t));
const P = (s) => new Paragraph({ children: runs(s) });
const H = (s) => new Paragraph({ text: s, heading: HeadingLevel.HEADING_1 });
const B = (s, level = 0) => new Paragraph({ children: runs(s), numbering: { reference: "pont", level } });

const body = [
  new Paragraph({ heading: HeadingLevel.TITLE, text: "Csődelemzés – adatelőkészítés kész, jöhettek ti" }),
  P("Röviden összefoglalom, mit csináltam az adatokkal, és milyen kérdéseket kéne kibontanotok."),

  H("1. Az adat"),
  B("**Forrás:** UCI – Polish companies bankruptcy data. Lengyel feldolgozóipari cégek, 64 pénzügyi mutató (X1–X64), és hogy csődbe mentek-e."),
  B("**5 fájl = 5 időtáv:** 1–5 évvel a csőd (vagy a működés megállapítása) előtti adatok. Ezt egy oszlopba tettem: **ev_a_csodig** (1 = utolsó év a csőd előtt, 5 = öt évvel előtte)."),
  B("**Méret:** 43 004 sor, ebből 2 083 csődbe ment cég (4,8%)."),
  B("**Fontos korlát:** a cégek kora és azonosítója nincs benne. Tehát az „első 5 év” nem vizsgálható, helyette a csőd előtti 5 évet nézzük. Ugyanazt a céget sem lehet évről évre követni."),

  H("2. Mit csináltam (adatelőkészítés)"),
  B("Összefűztem az 5 fájlt egy táblába, a mutatókat X1–X64-re neveztem át."),
  B("Kitöröltem 401 duplikált sort."),
  B("A 64 mutatót csoportokba soroltam: **jövedelmezőség** (20), **eladósodottság** (18), **likviditás** (15), hatékonyság (9), méret (1), növekedés (1)."),
  B("**Hiányzó adatok:** minden mutatóban van, a sorok felében legalább egy. Ezt csináltam:"),
  B("az X37-et kihagytam (44%-ban hiányzik),", 1),
  B("a többit mediánnal pótoltam,", 1),
  B("az X21 és X27 mellé hiányjelző oszlopot tettem (hiany_x21, hiany_x27), mert ezek a bukott cégeknél sokkal többször hiányoznak (pl. X27: 34% vs 5%), tehát a hiány maga is jel.", 1),
  B("**Kiugró értékek:** extrém számok voltak (pl. likviditási ráta max. 53 433). Nem töröltem őket, hanem levágtam az 1. és 99. percentilisnél (winsorizálás), így a max. már 32,5."),
  B("**Kevés csődös cég** (kb. 5%): ezt nem az adatban kell javítani, hanem modellezéskor. Az accuracy félrevezető, inkább AUC, recall, F1 kell, és osztálysúlyozás vagy SMOTE (csak a tanító adaton!)."),

  H("3. Hol éritek el"),
  B("**Adatbázis (Neon Postgres):** csak olvasási joggal. A belépési linket privátban küldöm, tegyétek egy .env fájlba (DATABASE_URL=...), és a Claude-otok le tudja kérdezni. Táblák:"),
  B("**adatok**: a kész tábla (tisztítva, pótolva, levágva, nincs benne hiányzó érték), **ebből dolgozzatok**,", 1),
  B("**mutato_szotar**: segédtábla, melyik mutató mit jelent és melyik csoportba tartozik.", 1),
  B("**GitHub:** https://github.com/Numm1th0r/csodelemzes-beadando – itt van minden (scriptek, notebook, ábrák, CSV-k). Hívjatok, és meghívlak titeket."),

  H("4. Kérdések, amiket ki kéne bontani"),
  P("A dolgozat 3 fő kérdése:"),
  B("**K1:** Melyik mutatócsoport (likviditás, eladósodottság, jövedelmezőség) választja el legjobban a csődös cégeket a működőktől?"),
  B("**K2:** Hány évvel a csőd előtt látszanak már a jelek, és melyik mutatónál a legkorábban?"),
  B("**K3:** Mennyire jól jelezhető előre a csőd? (gépi tanulás vs. a klasszikus Altman Z-score)"),
  P("Javasolt felosztás:"),
  B("**[Név A] – Figyelmeztető jelek (K1, K2):**"),
  B("Hogyan alakulnak a mutatók mediánjai csődös vs. működő cégeknél, évenként?", 1),
  B("Mely különbségek szignifikánsak? (Mann–Whitney próba)", 1),
  B("Mi látszik már 5 évvel előtte, és mi csak az utolsó évben?", 1),
  B("**[Név B] – Előrejelzés (K3):**"),
  B("Logisztikus regresszió, döntési fa, Random Forest, XGBoost összehasonlítása (AUC, recall, F1).", 1),
  B("Melyik mutatók a legfontosabbak a modellekben?", 1),
  B("Mennyit romlik az előrejelzés, ha 1 helyett 5 évvel előre jósolunk?", 1),
  B("**[Név C] – Bukási típusok + Altman:**"),
  B("Klaszterezéssel van-e jellegzetes bukási típus (pl. túladósodás, likviditási válság, veszteség)?", 1),
  B("Mennyire működik az Altman Z-score ezen az adaton?", 1),

  H("5. Amit már látok az adatból"),
  B("A **jövedelmezőség** jelez a legerősebben: már 5 évvel előtte is alacsonyabb a bukott cégeknél (ROA 2% vs 8%), az utolsó évben pedig veszteséges."),
  B("Az **eladósodottság** a második: a bukottaknál a kötelezettségek az eszközök kb. 65–72%-át teszik ki, a működőknél kb. 45%-ot."),
  B("A **likviditás** csak az utolsó 1–2 évben romlik meg igazán."),
  P("Kérdés esetén írjatok!"),
];

const doc = new Document({
  styles: {
    default: { document: { run: { font: FONT, size: 22 }, paragraph: { spacing: { after: 80 } } } },
    paragraphStyles: [
      { id: "Title", name: "Title", basedOn: "Normal", next: "Normal",
        run: { font: FONT, size: 34, bold: true, color: "1F3864" }, paragraph: { spacing: { before: 0, after: 160 }, keepNext: true } },
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { font: FONT, size: 26, bold: true, color: "2F5496" },
        paragraph: { spacing: { before: 220, after: 80 }, keepNext: true, outlineLevel: 0 } },
    ],
  },
  numbering: { config: [{ reference: "pont", levels: [
    { level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 360, hanging: 360 } } } },
    { level: 1, format: LevelFormat.BULLET, text: "–", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 900, hanging: 360 } } } },
  ] }] },
  sections: [{ properties: { page: { margin: { top: 1134, bottom: 1134, left: 1247, right: 1247 } } }, children: body }],
});
Packer.toBuffer(doc).then((b) => { fs.writeFileSync(process.argv[2], b); console.log("OK"); });
