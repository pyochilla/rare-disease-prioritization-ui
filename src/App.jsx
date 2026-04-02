import { useMemo, useState } from "react";

const diseaseProfiles = [
  {
    id: "npc",
    name: "Niemann-Pick disease type C",
    short: "NPC",
    genes: ["NPC1", "NPC2"],
    phenotypeKeywords: [
      "vertical gaze palsy",
      "ataxia",
      "cognitive decline",
      "white matter",
      "hepatosplenomegaly",
      "lysosomal",
      "cholesterol trafficking",
      "sphingolipid",
    ],
    neighborhood: ["Tay-Sachs", "Gaucher"],
    family: "Lysosomal / neurodegenerative overlap",
    expansion:
      "Optional targeted expansion from NPC1/NPC2-centered neighborhood",
    description:
      "Anchor calibration disease with strong lysosomal and neurological context.",
  },
  {
    id: "taysachs",
    name: "Tay-Sachs disease",
    short: "Tay-Sachs",
    genes: ["HEXA"],
    phenotypeKeywords: [
      "gm2",
      "ganglioside",
      "neurodegeneration",
      "developmental regression",
      "seizures",
      "lysosomal",
    ],
    neighborhood: ["NPC"],
    family: "Family-level lysosomal comparator",
    expansion:
      "Optional refinement only if expansion clarifies family-level separation",
    description:
      "Family-level comparator to NPC in lysosomal and neurodegenerative profiles.",
  },
  {
    id: "gaucher",
    name: "Gaucher disease",
    short: "Gaucher",
    genes: ["GBA"],
    phenotypeKeywords: [
      "organomegaly",
      "hepatosplenomegaly",
      "extrapyramidal",
      "neurodegeneration",
      "lysosomal",
      "glucosylceramide",
    ],
    neighborhood: ["NPC"],
    family: "Neurological-overlap comparator",
    expansion: "Optional GBA-centered lysosomal metabolism context",
    description:
      "Neurological-overlap comparator when organomegaly and lysosomal evidence are present.",
  },
  {
    id: "krabbe",
    name: "Krabbe disease",
    short: "Krabbe",
    genes: ["GALC"],
    phenotypeKeywords: [
      "white matter",
      "demyelination",
      "motor decline",
      "developmental regression",
      "leukodystrophy",
      "myelin",
    ],
    neighborhood: ["MLD"],
    family: "White-matter comparator",
    expansion:
      "Expansion optional; use only if network signal remains coherent",
    description:
      "White-matter ambiguity comparator for demyelination or leukodystrophy-heavy cases.",
  },
  {
    id: "mld",
    name: "Metachromatic leukodystrophy",
    short: "MLD",
    genes: ["ARSA"],
    phenotypeKeywords: [
      "white matter",
      "demyelination",
      "motor decline",
      "cognitive decline",
      "leukodystrophy",
      "sulfatide",
    ],
    neighborhood: ["Krabbe"],
    family: "White-matter comparator paired with Krabbe",
    expansion:
      "Expansion optional; use only if network signal remains coherent",
    description:
      "Paired white-matter comparator that preserves interpretable leukodystrophy neighborhood structure.",
  },
];

const phenotypeSuggestions = [
  "vertical gaze palsy",
  "ataxia",
  "cognitive decline",
  "white matter",
  "hepatosplenomegaly",
  "developmental regression",
  "seizures",
  "organomegaly",
  "demyelination",
  "leukodystrophy",
];

const geneSuggestions = ["NPC1", "NPC2", "HEXA", "GBA", "GALC", "ARSA"];

function normalizeTokens(text) {
  return text
    .toUpperCase()
    .split(/[\n,;|/ ]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function scoreDisease(
  { genesInput, phenotypesInput, contextInput, networkEnabled },
  disease
) {
  const geneTokens = normalizeTokens(genesInput);
  const phenotypeText = phenotypesInput.toLowerCase();
  const contextText = contextInput.toLowerCase();

  const matchedGenes = disease.genes.filter((g) => geneTokens.includes(g));
  const phenotypeMatches = disease.phenotypeKeywords.filter((k) =>
    phenotypeText.includes(k)
  );
  const contextMatches = disease.phenotypeKeywords.filter((k) =>
    contextText.includes(k)
  );

  let score = 0;
  score += matchedGenes.length * 12;
  score += phenotypeMatches.length * 8;
  score += contextMatches.length * 3;

  if (disease.short === "NPC" && phenotypeText.includes("lysosomal")) score += 6;
  if (
    (disease.short === "Krabbe" || disease.short === "MLD") &&
    phenotypeText.includes("white matter")
  ) {
    score += 7;
  }

  const rawSignal =
    score +
    (matchedGenes.length > 0 ? 4 : 0) +
    (phenotypeMatches.length > 1 ? 5 : 0) +
    (networkEnabled
      ? matchedGenes.length > 0 || phenotypeMatches.length >= 2
        ? 3
        : -6
      : 0);

  const confidence = 1 - Math.exp(-rawSignal / 55);

  return {
    ...disease,
    score,
    confidence,
    matchedGenes,
    phenotypeMatches,
  };
}

function getEligibility(top, second, networkEnabled) {
  const margin = top.confidence - (second?.confidence ?? 0);

  if (top.confidence >= 0.74 && margin >= 0.14) {
    return {
      label: "Eligible for ranked interpretation",
      color: "#dcfce7",
      border: "#16a34a",
      message: networkEnabled
        ? "Downstream biological expansion can proceed if supporting network evidence remains stable."
        : "Expansion is disabled, but ranked interpretation is acceptable.",
    };
  }

  if (top.confidence >= 0.56 && margin >= 0.06) {
    return {
      label: "Eligible, but requires careful neighborhood reading",
      color: "#fef3c7",
      border: "#d97706",
      message:
        "Neighborhood structure is interpretable, but separation is not strong enough to justify automatic downstream expansion.",
    };
  }

  return {
    label: "Not eligible for downstream biological refinement",
    color: "#fee2e2",
    border: "#dc2626",
    message:
      "Stop and issue a warning rather than forcing network expansion. Upstream prioritization is too weak or unstable.",
    };
}

export default function App() {
  const [genesInput, setGenesInput] = useState("NPC1, NPC2");
  const [phenotypesInput, setPhenotypesInput] = useState(
    "vertical gaze palsy, ataxia, white matter changes, hepatosplenomegaly, lysosomal"
  );
  const [contextInput, setContextInput] = useState(
    "cholesterol trafficking / sphingolipid context"
  );
  const [networkEnabled, setNetworkEnabled] = useState(true);

  const ranked = useMemo(() => {
    return diseaseProfiles
      .map((d) =>
        scoreDisease(
          { genesInput, phenotypesInput, contextInput, networkEnabled },
          d
        )
      )
      .sort((a, b) => b.confidence - a.confidence);
  }, [genesInput, phenotypesInput, contextInput, networkEnabled]);

  const top = ranked[0];
  const second = ranked[1];
  const eligibility = getEligibility(top, second, networkEnabled);
  const topPct = Math.round(top.confidence * 100);
  const marginPct = Math.round((top.confidence - (second?.confidence ?? 0)) * 100);

  const styles = {
    page: {
      fontFamily:
        'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      background: "#f8fafc",
      minHeight: "100vh",
      padding: "28px",
      color: "#0f172a",
    },
    container: {
      maxWidth: "1380px",
      margin: "0 auto",
    },
    heading: {
      fontSize: "34px",
      fontWeight: 800,
      marginBottom: "8px",
      letterSpacing: "-0.02em",
    },
    subtitle: {
      color: "#475569",
      lineHeight: 1.7,
      marginBottom: "24px",
      maxWidth: "980px",
      fontSize: "16px",
    },
    topGrid: {
      display: "grid",
      gridTemplateColumns: "1.08fr 0.92fr",
      gap: "22px",
      alignItems: "start",
      marginBottom: "22px",
    },
    card: {
      background: "#ffffff",
      border: "1px solid #dbe2ea",
      borderRadius: "20px",
      padding: "24px",
      boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
    },
    sectionTitle: {
      fontSize: "18px",
      fontWeight: 700,
      marginBottom: "10px",
      color: "#0f172a",
    },
    label: {
      display: "block",
      fontSize: "16px",
      fontWeight: 700,
      marginBottom: "10px",
      marginTop: "14px",
      color: "#0f172a",
    },
    textarea: {
      width: "100%",
      minHeight: "118px",
      padding: "14px 16px",
      borderRadius: "14px",
      border: "1px solid #94a3b8",
      background: "#3f3f46",
      color: "#ffffff",
      fontSize: "15px",
      lineHeight: 1.6,
      boxSizing: "border-box",
      outline: "none",
    },
    input: {
      width: "100%",
      padding: "14px 16px",
      borderRadius: "14px",
      border: "1px solid #94a3b8",
      background: "#3f3f46",
      color: "#ffffff",
      fontSize: "15px",
      boxSizing: "border-box",
      outline: "none",
    },
    suggestionWrap: {
      display: "flex",
      flexWrap: "wrap",
      gap: "10px",
      marginTop: "16px",
      marginBottom: "8px",
    },
    suggestionButton: {
      padding: "10px 14px",
      borderRadius: "999px",
      border: "1px solid #cbd5e1",
      background: "#ffffff",
      color: "#334155",
      fontSize: "14px",
      fontWeight: 600,
      cursor: "pointer",
      lineHeight: 1.2,
      boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
    },
    checkboxRow: {
      display: "flex",
      alignItems: "center",
      gap: "12px",
      marginTop: "18px",
      fontSize: "15px",
      fontWeight: 600,
    },
    outputTitle: {
      fontSize: "20px",
      fontWeight: 800,
      marginBottom: "14px",
      color: "#0f172a",
    },
    primaryBox: {
      background: "#ffffff",
      border: "1px solid #dbe2ea",
      borderRadius: "18px",
      padding: "20px",
      marginBottom: "16px",
    },
    muted: {
      color: "#64748b",
      fontSize: "14px",
    },
    mainDisease: {
      fontSize: "28px",
      fontWeight: 800,
      marginTop: "8px",
      lineHeight: 1.2,
      letterSpacing: "-0.02em",
    },
    description: {
      marginTop: "10px",
      color: "#475569",
      lineHeight: 1.7,
      fontSize: "16px",
    },
    strength: {
      marginTop: "18px",
      fontSize: "18px",
      fontWeight: 800,
    },
    meterBg: {
      width: "100%",
      height: "12px",
      background: "#e2e8f0",
      borderRadius: "999px",
      overflow: "hidden",
      marginTop: "10px",
    },
    meterFill: (pct) => ({
      width: `${pct}%`,
      height: "100%",
      background: "#4361ee",
      borderRadius: "999px",
    }),
    badgeRow: {
      marginTop: "12px",
      display: "flex",
      flexWrap: "wrap",
      gap: "10px",
    },
    badge: {
      display: "inline-flex",
      alignItems: "center",
      padding: "8px 12px",
      borderRadius: "999px",
      background: "#eef2ff",
      color: "#4338ca",
      fontSize: "13px",
      fontWeight: 600,
    },
    alert: {
      borderRadius: "18px",
      padding: "18px",
      marginBottom: "16px",
      borderLeft: "6px solid",
    },
    alertTitle: {
      fontSize: "16px",
      fontWeight: 800,
      marginBottom: "6px",
    },
    alertMessage: {
      fontSize: "15px",
      lineHeight: 1.7,
      color: "#1e293b",
    },
    miniGrid: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "16px",
    },
    rankCard: {
      marginTop: "6px",
    },
    rankItem: {
      background: "#ffffff",
      border: "1px solid #e2e8f0",
      borderRadius: "16px",
      padding: "18px",
      marginBottom: "12px",
    },
    rankHeader: {
      display: "flex",
      justifyContent: "space-between",
      gap: "16px",
      alignItems: "center",
    },
    rankName: {
      fontSize: "18px",
      fontWeight: 800,
      lineHeight: 1.3,
    },
    familyText: {
      color: "#64748b",
      marginTop: "4px",
      fontSize: "14px",
    },
    rightBlock: {
      minWidth: "240px",
    },
    exportButton: {
      marginTop: "10px",
      padding: "12px 16px",
      borderRadius: "12px",
      border: "1px solid #cbd5e1",
      background: "#0f172a",
      color: "#ffffff",
      fontWeight: 700,
      fontSize: "14px",
      cursor: "pointer",
    },
  };

  const addSuggestion = (item) => {
  if (!phenotypesInput.toLowerCase().includes(item.toLowerCase())) {
    setPhenotypesInput((prev) => (prev.trim() ? `${prev}, ${item}` : item));
  }
};

  const addGeneSuggestion = (gene, replace = false) => {
  if (replace) {
    setGenesInput(gene);
    return;
  }

  const tokens = normalizeTokens(genesInput);
  if (!tokens.includes(gene.toUpperCase())) {
    setGenesInput((prev) => (prev.trim() ? `${prev}, ${gene}` : gene));
  }
};

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.heading}>Rare-Disease Prioritization Workflow</div>
        <div style={styles.subtitle}>
          Conservative workflow prototype for interpretable rare-disease prioritization
          from compressed gene-phenotype cues. This interface emphasizes ranked
          disease output, diagnostic neighborhood structure, eligibility gating,
          and warning-based control of downstream biological expansion.
        </div>

        <div style={styles.topGrid}>
          <div style={styles.card}>
            <div style={styles.sectionTitle}>Case input</div>

            <label style={styles.label}>Input gene set</label>
            <textarea
              style={styles.textarea}
              value={genesInput}
              onChange={(e) => setGenesInput(e.target.value)}
            />
            
            <div style={styles.suggestionWrap}>
              {geneSuggestions.map((gene) => (
                <div key={gene} style={{ display: "flex", gap: "6px" }}>
                  <button
                  type="button"
                  style={styles.suggestionButton}
                  onClick={() => addGeneSuggestion(gene, false)}
                  >
                    + {gene}
                    </button>
                    <button
                    type="button"
                    style={{ ...styles.suggestionButton, background: "#0f172a", color: "#fff" }}
                  onClick={() => addGeneSuggestion(gene, true)}
                  >
                only
                </button>
              </div>
            ))}
          </div>

            <label style={styles.label}>Phenotype cues / HPO-like hints</label>
            <textarea
              style={styles.textarea}
              value={phenotypesInput}
              onChange={(e) => setPhenotypesInput(e.target.value)}
            />

            <label style={styles.label}>
              Optional transcriptomic or disease-context hint
            </label>
            <input
              style={styles.input}
              value={contextInput}
              onChange={(e) => setContextInput(e.target.value)}
            />

            <div style={styles.suggestionWrap}>
              {phenotypeSuggestions.map((item) => (
                <button
                  key={item}
                  type="button"
                  style={styles.suggestionButton}
                  onClick={() => addSuggestion(item)}
                >
                  {item}
                </button>
              ))}
            </div>

            <div style={styles.checkboxRow}>
              <input
                id="networkEnabled"
                type="checkbox"
                checked={networkEnabled}
                onChange={(e) => setNetworkEnabled(e.target.checked)}
              />
              <label htmlFor="networkEnabled">
                Enable conditional network expansion
              </label>
            </div>
          </div>

          <div style={styles.card}>
            <div style={styles.outputTitle}>Primary output</div>

            <div style={styles.primaryBox}>
              <div style={styles.muted}>Primary prioritized disease</div>
              <div style={styles.mainDisease}>{top.name}</div>
              <div style={styles.description}>{top.description}</div>

              <div style={styles.strength}>
                Relative prioritization strength: {topPct}%
              </div>
              <div style={styles.meterBg}>
                <div style={styles.meterFill(topPct)} />
              </div>

              <div style={styles.badgeRow}>
                {top.matchedGenes.length > 0 ? (
                  top.matchedGenes.map((g) => (
                    <span key={g} style={styles.badge}>
                      Gene match: {g}
                    </span>
                  ))
                ) : (
                  <span style={styles.badge}>No direct anchor-gene match detected</span>
                )}

                {top.phenotypeMatches.slice(0, 3).map((p) => (
                  <span key={p} style={styles.badge}>
                    Phenotype: {p}
                  </span>
                ))}
              </div>
            </div>

            <div
              style={{
                ...styles.alert,
                background: eligibility.color,
                borderColor: eligibility.border,
              }}
            >
              <div style={styles.alertTitle}>{eligibility.label}</div>
              <div style={styles.alertMessage}>{eligibility.message}</div>
            </div>

            <div style={styles.miniGrid}>
              <div style={styles.primaryBox}>
                <div style={styles.muted}>Secondary diagnostic neighborhood</div>
                <div style={styles.badgeRow}>
                  {[top.short, ...(top.neighborhood || [])].map((n) => (
                    <span key={n} style={styles.badge}>
                      {n}
                    </span>
                  ))}
                </div>
                <div style={{ marginTop: "12px", color: "#475569", lineHeight: 1.6 }}>
                  Margin to second-ranked disease: {marginPct}%
                </div>
              </div>

              <div style={styles.primaryBox}>
                <div style={styles.muted}>Conditional biological expansion</div>
                <div style={{ marginTop: "12px", color: "#475569", lineHeight: 1.7 }}>
                  {eligibility.label === "Eligible for ranked interpretation"
                    ? top.expansion
                    : "Expansion withheld until upstream signal becomes more coherent."}
                </div>
              </div>
            </div>

            <button
              type="button"
              style={styles.exportButton}
              onClick={() => window.alert("Prototype only: export function can be added next.")}
            >
              Export summary report
            </button>
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.outputTitle}>Ranked disease table</div>

          <div style={styles.rankCard}>
            {ranked.map((row, idx) => {
              const pct = Math.round(row.confidence * 100);

              return (
                <div key={row.id} style={styles.rankItem}>
                  <div style={styles.rankHeader}>
                    <div>
                      <div style={styles.rankName}>
                        Rank {idx + 1}: {row.name}
                      </div>
                      <div style={styles.familyText}>{row.family}</div>

                      <div style={styles.badgeRow}>
                        {row.genes.map((g) => (
                          <span key={g} style={styles.badge}>
                            {g}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div style={styles.rightBlock}>
                      <div style={{ fontSize: "15px", fontWeight: 700 }}>
                        Relative prioritization strength: {pct}%
                      </div>
                      <div style={styles.meterBg}>
                        <div style={styles.meterFill(pct)} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}