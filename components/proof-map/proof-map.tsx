import type { ProofMapEdge, ProofMapNode } from "../../lib/proof-map/derive";
import styles from "./proof-map.module.css";

export function ProofMap({ nodes, edges, activeId, onOpenPaper, onOpenLean }: {
  nodes: ProofMapNode[]; edges: ProofMapEdge[]; activeId: string;
  onOpenPaper: (node: ProofMapNode) => void; onOpenLean: (node: ProofMapNode) => void;
}) {
  return (
    <section className={styles.map} aria-labelledby="proof-map-heading">
      <div className={styles.intro}>
        <h2 id="proof-map-heading">Proof map</h2>
        <p>Follow the argument in a stable dependency order. Correspondence labels are curator judgments, not verification claims.</p>
      </div>
      <ol className={styles.nodes}>
        {nodes.map((node) => {
          const incoming = edges.filter((edge) => edge.to === node.id);
          const outgoing = edges.filter((edge) => edge.from === node.id);
          return (
            <li key={node.id} className={styles.node} aria-current={node.id === activeId ? "step" : undefined}>
              <div className={styles.nodeMeta}>
                <span>Layer {node.depth + 1}</span><span>{node.correspondence} correspondence</span>
              </div>
              <h3>{node.label}</h3>
              <p>Paper page {node.paper.page} · {node.lean.length} Lean {node.lean.length === 1 ? "declaration" : "declarations"}</p>
              <p className={styles.edges}>
                Depends on: {incoming.length ? incoming.map((edge) => nodes.find((item) => item.id === edge.from)?.label).join(", ") : "starting context"}<br />
                Used by: {outgoing.length ? outgoing.map((edge) => nodes.find((item) => item.id === edge.to)?.label).join(", ") : "proof endpoint"}
              </p>
              <div className={styles.actions}>
                <button type="button" onClick={() => onOpenPaper(node)}>Open paper</button>
                {node.lean[0] ? <button type="button" onClick={() => onOpenLean(node)}>Open Lean</button> : null}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
