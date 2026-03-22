import React, { useState } from "react";

export interface MetricsData {
  latencyMs: number;
  nodeCount: number;
  circuit: string;
  gasCost: string;
  sessionId: string;
  computationId: string;
  demoMode: boolean;
}

interface ComputationMetricsProps {
  metrics: MetricsData;
}

interface MetricCardDef {
  label: string;
  value: string | number;
  unit?: string;
  mono?: boolean;
}

export const ComputationMetrics: React.FC<ComputationMetricsProps> = ({ metrics }) => {
  const [expanded, setExpanded] = useState(false);

  const cards: MetricCardDef[] = [
    { label: "MXE Latency", value: metrics.latencyMs, unit: "ms" },
    { label: "Node Count", value: metrics.nodeCount, unit: "nodes" },
    { label: "Circuit", value: metrics.circuit, mono: true },
    { label: "Gas Cost", value: metrics.gasCost, unit: "SOL" },
    { label: "Session ID", value: metrics.sessionId, mono: true },
    { label: "Computation ID", value: metrics.computationId, mono: true },
  ];

  return (
    <div className="comp-metrics">
      <button
        className="comp-metrics-toggle"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <span className="comp-metrics-toggle-icon">{expanded ? "\u25BC" : "\u25B6"}</span>
        <span>Computation Metrics</span>
        {metrics.demoMode && <span className="comp-metrics-demo-tag">Simulated</span>}
      </button>

      {expanded && (
        <div className="comp-metrics-grid">
          {cards.map((card) => (
            <div key={card.label} className="comp-metrics-card">
              <div className="comp-metrics-label">{card.label}</div>
              <div className={`comp-metrics-value${card.mono ? " mono" : ""}`}>
                {card.value}
                {card.unit && <span className="comp-metrics-unit">{card.unit}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export function generateDemoMetrics(totalChecked: number): MetricsData {
  const sessionHex = Array.from({ length: 8 }, () =>
    Math.floor(Math.random() * 256).toString(16).padStart(2, "0")
  ).join("");
  const compHex = Array.from({ length: 6 }, () =>
    Math.floor(Math.random() * 256).toString(16).padStart(2, "0")
  ).join("");

  return {
    latencyMs: 820 + Math.floor(Math.random() * 400),
    nodeCount: 3,
    circuit: "blind_link_psi",
    gasCost: (0.00042 + Math.random() * 0.0001).toFixed(5),
    sessionId: sessionHex,
    computationId: compHex,
    demoMode: true,
  };
}

export default ComputationMetrics;
