"""Milestone 4: Combined Account Risk Report & Analyst Risk Cards.

Synthesizes GNN fraud predictions, multi-hop temporal chain motifs, and
GNNExplainer feature/edge attributions into human-readable compliance reports
and ego-network visualizations.
"""

import os
from typing import Dict, List, Optional, Tuple
import matplotlib.pyplot as plt
import networkx as nx
import pandas as pd


class AccountRiskReporter:
    """Generates human-readable compliance risk reports and subgraph plots."""

    def __init__(self, chain_detector, explainer):
        self.chain_detector = chain_detector
        self.explainer = explainer

    def analyze_account(self, account_id: str) -> Dict:
        """Runs both GNNExplainer and TemporalChainDetector for an account."""
        gnn_exp = self.explainer.explain_node(account_id)
        chain_prof = self.chain_detector.get_account_chain_profile(account_id)

        # Risk Tier calculation
        prob = gnn_exp["gnn_prob"]
        is_chain = chain_prof["is_in_chain"]

        if prob >= 0.75 and is_chain:
            tier = "CRITICAL RISK"
            action = "Immediate Account Freeze & Expedited SAR Filing"
        elif prob >= 0.5254 or is_chain:
            tier = "HIGH RISK"
            action = "Priority Compliance Queue -- Request Source of Funds & Counterparty Verification"
        elif prob >= 0.20:
            tier = "ELEVATED REVIEW"
            action = "Monitor Transaction Velocity (48-hour Watchlist)"
        else:
            tier = "STANDARD / LOW RISK"
            action = "Routine Monitoring -- No Investigative Action Required"

        return {
            "account_id": account_id,
            "risk_tier": tier,
            "recommended_action": action,
            "gnn_explanation": gnn_exp,
            "chain_profile": chain_prof,
        }

    def format_risk_card(self, report: Dict) -> str:
        """Formats the analysis into an AML Analyst Risk Card."""
        acc = report["account_id"]
        tier = report["risk_tier"]
        action = report["recommended_action"]
        gnn = report["gnn_explanation"]
        chain = report["chain_profile"]

        prob = gnn["gnn_prob"]
        is_flagged = gnn["is_flagged"]
        threshold = gnn["threshold"]

        lines = [
            "=" * 72,
            f"  CHAIN REACTION AML ANALYST RISK CARD -- ACCOUNT {acc}",
            "=" * 72,
            f"OVERALL RISK TIER:        {tier}",
            f"RECOMMENDED COMPLIANCE:   {action}",
            "-" * 72,
            "1. GRAPH NEURAL NETWORK ASSESSMENT (GraphSAGE):",
            f"   - Mule Probability:     {prob * 100:.2f}% (Threshold: {threshold * 100:.2f}%)",
            f"   - Decision Status:      {'FLAGGED AS MONEY MULE' if is_flagged else 'WITHIN NORMAL BOUNDS'}",
            f"   - Subgraph Complexity:  {gnn['subgraph_nodes_count']} local accounts, {gnn['subgraph_edges_count']} directed flows",
            "",
            "   Primary Feature Attributions (GNNExplainer):",
        ]

        for i, f in enumerate(gnn["top_features"], 1):
            pct = f["score"] * 100
            feat_name = f["feature"]
            lines.append(f"     {i}. {feat_name:<26} : {pct:5.1f}% contribution")

        lines.extend([
            "",
            "-" * 72,
            "2. MULTI-HOP TEMPORAL CHAIN DETECTION (Layering Motif):",
            f"   - Multi-Hop Membership: {'CONFIRMED IN ACTIVE CHAIN(S)' if chain['is_in_chain'] else 'No sequential chain detected'}",
            f"   - Topological Role:     {chain['role'].upper()}",
            f"   - Active Chains Found:  {chain['num_chains_found']} (Max Length: {chain['max_chain_hops']} hops)",
        ])

        if chain["is_in_chain"] and chain["sample_chains"]:
            sample = chain["sample_chains"][0]
            lines.extend([
                f"   - Primary Chain Path:   {' -> '.join(sample['accounts'])}",
                f"   - Inflow Amount:        ${sample['initial_amount']:,.2f}",
                f"   - Downstream Outflow:   ${sample['final_amount']:,.2f} ({sample['amount_retention'] * 100:.1f}% retained)",
                f"   - Chain Elapsed Time:   {sample['duration_hours']:.1f} hours",
            ])

        lines.extend([
            "",
            "-" * 72,
            "3. TOP SUSPICIOUS COUNTERPARTY FLOWS (GNN Attributed):",
        ])

        for i, e in enumerate(gnn["top_edges"][:4], 1):
            lines.append(
                f"   ({i}) {e['direction'].upper():<8} | Counterparty: {e['counterparty']:<12} "
                f"| Attribution Score: {e['importance_score']:.3f}"
            )

        lines.extend([
            "-" * 72,
            "4. SYNTHESIZED COMPLIANCE NARRATIVE (SAR Ready):",
            self._generate_sar_narrative(report),
            "=" * 72,
        ])

        return "\n".join(lines)

    def _generate_sar_narrative(self, report: Dict) -> str:
        """Produces a concise, investigator-ready narrative paragraph."""
        acc = report["account_id"]
        prob = report["gnn_explanation"]["gnn_prob"]
        chain = report["chain_profile"]
        top_f = report["gnn_explanation"]["top_features"]
        f_names = [f["feature"].replace("_", " ") for f in top_f[:2]]

        narrative = (
            f"Account {acc} is flagged with a high mule risk probability of {prob * 100:.1f}% "
            f"based on 2-hop graph topological message passing. GNN attribution identifies "
            f"'{f_names[0]}' and '{f_names[1]}' as the dominant behavioral drivers. "
        )

        if chain["is_in_chain"]:
            sample = chain["sample_chains"][0]
            narrative += (
                f"Topological motif matching confirms active participation as an "
                f"'{chain['role'].replace('_', ' ')}' within a {sample['hops']}-hop sequential laundering chain "
                f"spanning {sample['duration_hours']:.1f} hours ({' -> '.join(sample['accounts'])}), "
                f"forwarding ${sample['final_amount']:,.2f} of ${sample['initial_amount']:,.2f} deposited funds "
                f"({sample['amount_retention'] * 100:.1f}% fund preservation). "
                f"This pattern strongly aligns with rapid layered pass-through mule activity."
            )
        else:
            narrative += (
                f"No multi-hop linear chain was verified, but local fan-in/fan-out velocity and "
                f"counterparty concentration indicate suspicious hub activity requiring human review."
            )

        return narrative

    def plot_risk_subgraph(
        self,
        report: Dict,
        output_path: Optional[str] = None,
        figsize: Tuple[int, int] = (10, 8),
    ) -> str:
        """Plots the target account's ego-network with highlighted GNN / chain paths."""
        acc = report["account_id"]
        gnn = report["gnn_explanation"]
        chain = report["chain_profile"]

        # Collect chain accounts for coloring
        chain_accs = set()
        for c in chain.get("sample_chains", []):
            chain_accs.update(c["accounts"])

        # Build local directed graph from incident edges
        G = nx.DiGraph()
        G.add_node(acc, role="target")

        for e in gnn["all_incident_edges"]:
            u, v = e["from_account"], e["to_account"]
            G.add_edge(u, v, score=e["importance_score"], direction=e["direction"])

        pos = nx.spring_layout(G, seed=42)

        # Node colors
        node_colors = []
        for n in G.nodes():
            if n == acc:
                node_colors.append("#dc2626")  # Bright Red for target
            elif n in chain_accs:
                node_colors.append("#f97316")  # Orange for active chain counterparties
            else:
                node_colors.append("#60a5fa")  # Soft Blue for standard counterparties

        # Edge widths and colors based on GNN importance
        edge_widths = []
        edge_colors = []
        for u, v, d in G.edges(data=True):
            score = d.get("score", 0.5)
            if (u in chain_accs) and (v in chain_accs):
                edge_widths.append(3.0)
                edge_colors.append("#dc2626")  # Red for chain flow
            elif score > 0.6:
                edge_widths.append(2.5)
                edge_colors.append("#ea580c")  # Orange for high GNN attribution
            else:
                edge_widths.append(1.0)
                edge_colors.append("#94a3b8")  # Slate gray for background flow

        plt.figure(figsize=figsize)
        nx.draw_networkx_nodes(G, pos, node_color=node_colors, node_size=600, alpha=0.95)
        nx.draw_networkx_labels(G, pos, font_size=8, font_weight="bold", font_color="#0f172a")
        nx.draw_networkx_edges(
            G,
            pos,
            width=edge_widths,
            edge_color=edge_colors,
            arrows=True,
            arrowsize=14,
            connectionstyle="arc3,rad=0.08",
        )

        title = (
            f"Account {acc} -- Risk Ego-Network (Risk Tier: {report['risk_tier']})\n"
            f"GNN Mule Prob: {gnn['gnn_prob'] * 100:.1f}% | Role: {chain['role'].upper()}"
        )
        plt.title(title, fontsize=12, fontweight="bold", pad=12)
        plt.axis("off")
        plt.tight_layout()

        if output_path is None:
            os.makedirs("outputs/figures/risk_cards", exist_ok=True)
            output_path = f"outputs/figures/risk_cards/{acc}_subgraph.png"
        else:
            os.makedirs(os.path.dirname(output_path), exist_ok=True)

        plt.savefig(output_path, dpi=200, bbox_inches="tight")
        plt.close()
        return output_path
