"""Legenerálja a notebooks/elemzes.ipynb-t (utána nbconvert-tel futtatjuk)."""
from pathlib import Path

import nbformat as nbf

cells = []
md = lambda s: cells.append(nbf.v4.new_markdown_cell(s.strip()))
code = lambda s: cells.append(nbf.v4.new_code_cell(s.strip()))

md("""
# Csődöt megelőző pénzügyi mutatók – elemzés
Adat: Polish companies bankruptcy data (UCI #365), tisztítva: `data_clean/polish_clean.csv` (`scripts/prep.py`).

`ev_a_csodig` = hány évvel a státusz megállapítása előtt mértük a mutatókat (1 = utolsó év a csőd előtt, 5 = 5 évvel előtte).

Részek:
1. Leíró elemzés – figyelmeztető jelek (A)
2. Melyik mutatócsoport jelez legjobban, és mikortól? (A)
3. Előrejelző modellek (B)
4. Altman Z-score viszonyítás + bukási profilok klaszterezéssel (C)
""")

code("""
import warnings; warnings.filterwarnings("ignore")
from pathlib import Path
import numpy as np, pandas as pd, matplotlib.pyplot as plt, seaborn as sns
from scipy.stats import mannwhitneyu
from sklearn.base import BaseEstimator, TransformerMixin
from sklearn.pipeline import make_pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import StratifiedKFold, cross_validate
from sklearn.metrics import roc_auc_score
from sklearn.cluster import KMeans
from xgboost import XGBClassifier

ROOT = Path.cwd().parent if Path.cwd().name == "notebooks" else Path.cwd()
FIG = ROOT / "abrak"; FIG.mkdir(exist_ok=True)
df = pd.read_csv(ROOT / "data_clean/polish_clean.csv")
szotar = pd.read_csv(ROOT / "data_clean/mutato_szotar.csv")
X_COLS = [f"X{i}" for i in range(1, 65)]
CSOPORT = dict(zip(szotar.mutato, szotar.csoport))
sns.set_theme(style="whitegrid", context="notebook")
SZINEK = {"Működő": "#4C78A8", "Csődbe ment": "#E45756"}
df["statusz"] = df.csod.map({0: "Működő", 1: "Csődbe ment"})
df.groupby("ev_a_csodig").csod.agg(megfigyeles="count", csod="sum", arany="mean").round(3)
""")

md("## 1. Kulcsmutatók mediánja a csőd előtti években")
code("""
KULCS = {
    "X1": "ROA (nettó eredmény / eszközök)",
    "X7": "EBIT / eszközök",
    "X6": "Eredménytartalék / eszközök",
    "X2": "Kötelezettségek / eszközök",
    "X10": "Saját tőke / eszközök",
    "X4": "Likviditási ráta",
    "X46": "Gyorsráta",
    "X40": "Pénzeszköz-ráta",
    "X3": "Forgótőke / eszközök",
}
med = df.groupby(["ev_a_csodig", "statusz"])[list(KULCS)].median().reset_index()
fig, axes = plt.subplots(3, 3, figsize=(13, 10), sharex=True)
for ax, (col, nev) in zip(axes.flat, KULCS.items()):
    for st, c in SZINEK.items():
        s = med[med.statusz == st]
        ax.plot(s.ev_a_csodig, s[col], marker="o", color=c, label=st, lw=2)
    ax.set_title(f"{nev} ({col}) – {CSOPORT[col]}", fontsize=10)
    ax.invert_xaxis(); ax.set_xticks([5, 4, 3, 2, 1])
for ax in axes[-1]: ax.set_xlabel("Évek a csődig")
axes[0, 0].legend()
fig.suptitle("Kulcsmutatók mediánja: csődbe ment vs. működő cégek", fontsize=13)
fig.tight_layout(); fig.savefig(FIG / "01_kulcsmutatok_median.png", dpi=200)
med.round(3)
""")

md("""
## 2. Melyik mutatócsoport különít el legjobban, és hány évvel előre?
Minden mutatóra és horizontra: Mann–Whitney U-próba + egyváltozós AUC (|AUC − 0,5| = elkülönítő erő, iránytól függetlenül).
""")
code("""
rows = []
for h, g in df.groupby("ev_a_csodig"):
    for col in X_COLS:
        s = g[[col, "csod"]].dropna()
        a, b = s[s.csod == 1][col], s[s.csod == 0][col]
        p = mannwhitneyu(a, b).pvalue
        auc = roc_auc_score(s.csod, s[col])
        rows.append(dict(ev_a_csodig=h, mutato=col, csoport=CSOPORT[col], auc=auc,
                         ero=abs(auc - 0.5) * 2, p=p, med_csod=a.median(), med_mukodo=b.median()))
uni = pd.DataFrame(rows)
fokusz = uni[uni.csoport.isin(["likviditás", "eladósodottság", "jövedelmezőség"])]
cs = fokusz.groupby(["csoport", "ev_a_csodig"]).ero.median().unstack()
fig, ax = plt.subplots(figsize=(8, 4.5))
for csop, row in cs.iterrows():
    ax.plot(row.index, row.values, marker="o", lw=2, label=csop)
ax.invert_xaxis(); ax.set_xticks([5, 4, 3, 2, 1])
ax.set_xlabel("Évek a csődig"); ax.set_ylabel("Elkülönítő erő (medián, 2·|AUC−0,5|)")
ax.set_title("Mutatócsoportok elkülönítő ereje a csődig hátralévő idő szerint"); ax.legend()
fig.tight_layout(); fig.savefig(FIG / "02_csoport_ero.png", dpi=200)
cs.round(3)
""")
code("""
# Top 10 mutató horizontonként (1 = legközelebb a csődhöz)
top = (uni.sort_values("ero", ascending=False).groupby("ev_a_csodig").head(10)
         .merge(szotar[["mutato", "leiras"]], on="mutato")
         .sort_values(["ev_a_csodig", "ero"], ascending=[True, False]))
top[["ev_a_csodig", "mutato", "csoport", "leiras", "auc", "p", "med_csod", "med_mukodo"]].round(3)
""")
code("""
piv = uni.pivot(index="mutato", columns="ev_a_csodig", values="ero")
piv = piv.loc[piv[1].sort_values(ascending=False).index[:20]]
piv.index = [f"{m} ({CSOPORT[m]})" for m in piv.index]
fig, ax = plt.subplots(figsize=(7, 8))
sns.heatmap(piv[[5, 4, 3, 2, 1]], annot=True, fmt=".2f", cmap="Reds", ax=ax, cbar_kws={"label": "elkülönítő erő"})
ax.set_xlabel("Évek a csődig"); ax.set_ylabel("")
ax.set_title("A 20 legerősebb mutató elkülönítő ereje")
fig.tight_layout(); fig.savefig(FIG / "03_top20_heatmap.png", dpi=200)
""")

md("""
## 3. Előrejelző modellek horizontonként
Rétegzett 5-szörös keresztvalidáció. Kiegyensúlyozatlan osztályok → osztálysúlyozás; metrikák: ROC-AUC, recall, precízió, F1 (accuracy félrevezető lenne ~95% működő cégnél).
""")
code("""
class Winsorizer(BaseEstimator, TransformerMixin):
    \"\"\"1. és 99. percentilisre vágja a szélsőértékeket (a tanító halmazon tanulva).\"\"\"
    def __init__(self, q=0.01): self.q = q
    def fit(self, X, y=None):
        X = np.asarray(X, float)
        self.lo_, self.hi_ = np.nanquantile(X, self.q, axis=0), np.nanquantile(X, 1 - self.q, axis=0)
        return self
    def transform(self, X): return np.clip(np.asarray(X, float), self.lo_, self.hi_)

def modellek(pos_weight):
    return {
        "Logisztikus regresszió": make_pipeline(SimpleImputer(strategy="median"), Winsorizer(), StandardScaler(),
                                                LogisticRegression(class_weight="balanced", max_iter=2000)),
        "Döntési fa": make_pipeline(SimpleImputer(strategy="median"),
                                    DecisionTreeClassifier(max_depth=5, class_weight="balanced", random_state=42)),
        "Random Forest": make_pipeline(SimpleImputer(strategy="median"),
                                       RandomForestClassifier(n_estimators=300, min_samples_leaf=3, class_weight="balanced_subsample",
                                                              n_jobs=-1, random_state=42)),
        "XGBoost": XGBClassifier(n_estimators=400, max_depth=4, learning_rate=0.05, subsample=0.8, colsample_bytree=0.8,
                                 scale_pos_weight=pos_weight, eval_metric="auc", n_jobs=-1, random_state=42),
    }

cv = StratifiedKFold(5, shuffle=True, random_state=42)
eredm = []
for h, g in df.groupby("ev_a_csodig"):
    X, y = g[X_COLS], g.csod
    for nev, m in modellek((y == 0).sum() / (y == 1).sum()).items():
        r = cross_validate(m, X, y, cv=cv, scoring=["roc_auc", "recall", "precision", "f1"], n_jobs=1)
        eredm.append(dict(ev_a_csodig=h, modell=nev, **{k[5:]: v.mean() for k, v in r.items() if k.startswith("test_")}))
eredm = pd.DataFrame(eredm)
eredm.pivot(index="modell", columns="ev_a_csodig", values="roc_auc").round(3)
""")
code("""
eredm.round(3)
""")
code("""
fig, ax = plt.subplots(figsize=(8, 4.5))
for nev, s in eredm.groupby("modell"):
    ax.plot(s.ev_a_csodig, s.roc_auc, marker="o", lw=2, label=nev)
ax.invert_xaxis(); ax.set_xticks([5, 4, 3, 2, 1]); ax.set_ylim(0.5, 1)
ax.set_xlabel("Évek a csődig"); ax.set_ylabel("ROC-AUC (5-szörös CV)")
ax.set_title("Előrejelző pontosság a csődig hátralévő idő szerint"); ax.legend()
fig.tight_layout(); fig.savefig(FIG / "04_modell_auc.png", dpi=200)
""")
code("""
# XGBoost változófontosság (gain) – 1 évvel a csőd előtt, csoportokra is összesítve
fontos = []
for h, g in df.groupby("ev_a_csodig"):
    y = g.csod
    m = XGBClassifier(n_estimators=400, max_depth=4, learning_rate=0.05, subsample=0.8, colsample_bytree=0.8,
                      scale_pos_weight=(y == 0).sum() / (y == 1).sum(), n_jobs=-1, random_state=42).fit(g[X_COLS], y)
    imp = pd.Series(m.get_booster().get_score(importance_type="gain")).reindex(X_COLS).fillna(0)
    fontos.append(pd.DataFrame({"ev_a_csodig": h, "mutato": X_COLS, "fontossag": imp.values / imp.sum()}))
fontos = pd.concat(fontos)
fontos["csoport"] = fontos.mutato.map(CSOPORT)
t1 = fontos[fontos.ev_a_csodig == 1].nlargest(15, "fontossag").merge(szotar[["mutato", "leiras"]], on="mutato")
fig, ax = plt.subplots(figsize=(9, 6))
sns.barplot(data=t1, y="mutato", x="fontossag", hue="csoport", dodge=False, ax=ax)
ax.set_title("XGBoost: 15 legfontosabb mutató (1 évvel a csőd előtt)"); ax.set_xlabel("relatív fontosság (gain)")
fig.tight_layout(); fig.savefig(FIG / "05_xgb_fontossag.png", dpi=200)
display(t1.round(3))
fontos.groupby(["csoport", "ev_a_csodig"]).fontossag.sum().unstack().round(3)
""")

md("""
## 4a. Viszonyítás: Altman Z''-score (Altman, 1983/2000 – nem tőzsdei cégekre)
Z' = 0,717·X3 + 0,847·X6 + 3,107·X7 + 0,420·X8 + 0,998·X9; zónák: < 1,23 veszély, > 2,9 biztonságos.
""")
code("""
z = 0.717*df.X3 + 0.847*df.X6 + 3.107*df.X7 + 0.420*df.X8 + 0.998*df.X9
df["altman_z"] = z
df["altman_zona"] = pd.cut(z, [-np.inf, 1.23, 2.9, np.inf], labels=["veszély", "szürke", "biztonságos"])
alt = []
for h, g in df.dropna(subset=["altman_z"]).groupby("ev_a_csodig"):
    alt.append(dict(ev_a_csodig=h, auc=roc_auc_score(g.csod, -g.altman_z),
                    recall_veszely=(g[g.csod == 1].altman_zona == "veszély").mean(),
                    tevesen_veszely=(g[g.csod == 0].altman_zona == "veszély").mean()))
pd.DataFrame(alt).round(3)
""")

md("""
## 4b. Bukási profilok: klaszterezés a csődbe ment cégeken (1 évvel a csőd előtt)
K-közép a winsorizált, standardizált kulcsmutatókon.
""")
code("""
PROFIL = ["X1", "X2", "X4", "X40", "X10", "X9", "X21"]
b = df[(df.csod == 1) & (df.ev_a_csodig == 1)][PROFIL]
prep = make_pipeline(SimpleImputer(strategy="median"), Winsorizer(0.05), StandardScaler())
Z = prep.fit_transform(b)
from sklearn.metrics import silhouette_score
sil = {k: silhouette_score(Z, KMeans(k, n_init=20, random_state=42).fit_predict(Z)) for k in range(2, 7)}
print("Sziluett-érték k szerint:", {k: round(v, 3) for k, v in sil.items()})
""")
code("""
K = 3  # sziluett + értelmezhetőség alapján; szükség esetén módosítani
km = KMeans(K, n_init=20, random_state=42).fit(Z)
b = b.assign(klaszter=km.labels_)
mukodo_med = df[(df.csod == 0) & (df.ev_a_csodig == 1)][PROFIL].median()
profil = b.groupby("klaszter")[PROFIL].median()
profil.loc["működő cégek (medián)"] = mukodo_med
profil["db"] = list(b.klaszter.value_counts().sort_index()) + [np.nan]
profil.columns = [f"{c} {KULCS.get(c, szotar.set_index('mutato').leiras.get(c))}" if c != "db" else c for c in profil.columns]
profil.round(3)
""")
code("""
fig, ax = plt.subplots(figsize=(9, 4))
cent = pd.DataFrame(km.cluster_centers_, columns=PROFIL)
sns.heatmap(cent, annot=True, fmt=".2f", cmap="RdBu_r", center=0, ax=ax)
ax.set_ylabel("klaszter"); ax.set_title("Bukási profilok – klaszterközéppontok (standardizált)")
fig.tight_layout(); fig.savefig(FIG / "06_bukasi_profilok.png", dpi=200)
""")

nb = nbf.v4.new_notebook(cells=cells, metadata={"kernelspec": {"name": "python3", "display_name": "Python 3"}})
out = Path(__file__).resolve().parent.parent / "notebooks" / "elemzes.ipynb"
out.parent.mkdir(exist_ok=True)
nbf.write(nb, out)
print(out)
