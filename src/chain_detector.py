"""Milestone 4: Multi-hop Laundering Chain Detector (Motif Search).

Searches for directed layering chains: A -> B -> C -> D -> ...
with strict chronological ordering and amount decay / preservation constraints.
"""

from collections import defaultdict
import datetime
from typing import Dict, List, Optional, Tuple, Set
import numpy as np
import pandas as pd


class TemporalChainDetector:
    """Detects multi-hop money laundering chains in transaction data.

    A valid laundering chain satisfies:
    1. Directed flow: A -> B -> C -> ...
    2. Forward in time: timestamp(step i+1) > timestamp(step i)
    3. Temporal proximity: timestamp(step i+1) - timestamp(step i) <= max_hop_hours
    4. Amount decay / preservation:
       amount(step i+1) <= amount(step i) and
       amount(step i+1) >= (1 - max_decay) * amount(step i)
       (accounts for 0% to max_decay% fee kept by each intermediary mule)
    5. Loop-free: all accounts in a chain are unique.
    """

    def __init__(
        self,
        df: pd.DataFrame,
        max_hop_hours: float = 72.0,
        max_total_hours: float = 240.0,
        max_decay: float = 0.20,
        min_amount: float = 50.0,
    ):
        self.max_hop_hours = max_hop_hours
        self.max_total_hours = max_total_hours
        self.max_decay = max_decay
        self.min_amount = min_amount

        # Filter and prepare transactions
        sub = df[df["amount_paid_usd"] >= min_amount].copy()
        if not pd.api.types.is_datetime64_any_dtype(sub["Timestamp"]):
            sub["Timestamp"] = pd.to_datetime(sub["Timestamp"])
        sub = sub.sort_values("Timestamp")

        self.transactions = sub
        # Build adjacency indices: account -> list of outgoing (to_acc, timestamp, amount, is_laundering)
        self.out_edges: Dict[str, List[Tuple[str, pd.Timestamp, float, int]]] = defaultdict(list)
        self.in_edges: Dict[str, List[Tuple[str, pd.Timestamp, float, int]]] = defaultdict(list)

        for _, row in sub.iterrows():
            f = str(row["from_Account"])
            t = str(row["to_Account"])
            ts = row["Timestamp"]
            amt = float(row["amount_paid_usd"])
            is_l = int(row.get("Is Laundering", 0))

            self.out_edges[f].append((t, ts, amt, is_l))
            self.in_edges[t].append((f, ts, amt, is_l))

    def find_chains_from_account(
        self,
        start_account: str,
        min_hops: int = 2,
        max_hops: int = 4,
        max_branches: int = 10,
    ) -> List[Dict]:
        """Finds all valid outgoing chains originating from start_account."""
        chains: List[Dict] = []

        def dfs(curr_acc: str, path: List[Dict], visited: Set[str]):
            curr_hops = len(path)
            if curr_hops >= min_hops:
                chains.append({
                    "hops": curr_hops,
                    "accounts": [path[0]["from"]] + [p["to"] for p in path],
                    "start_time": path[0]["timestamp"],
                    "end_time": path[-1]["timestamp"],
                    "duration_hours": (path[-1]["timestamp"] - path[0]["timestamp"]).total_seconds() / 3600.0,
                    "initial_amount": path[0]["amount"],
                    "final_amount": path[-1]["amount"],
                    "amount_retention": path[-1]["amount"] / path[0]["amount"] if path[0]["amount"] > 0 else 0.0,
                    "steps": path.copy(),
                })

            if curr_hops >= max_hops:
                return

            last_step = path[-1] if path else None
            last_time = last_step["timestamp"] if last_step else None
            last_amt = last_step["amount"] if last_step else None

            # Explore outgoing edges
            branches = 0
            for to_acc, ts, amt, is_l in self.out_edges.get(curr_acc, []):
                if to_acc in visited:
                    continue

                if last_step is not None:
                    # Time condition
                    time_diff = (ts - last_time).total_seconds() / 3600.0
                    if time_diff <= 0 or time_diff > self.max_hop_hours:
                        continue
                    total_dur = (ts - path[0]["timestamp"]).total_seconds() / 3600.0
                    if total_dur > self.max_total_hours:
                        continue

                    # Amount decay condition: amt <= last_amt and amt >= (1 - max_decay) * last_amt
                    if amt > last_amt * 1.02:  # allow tiny 2% margin for currency rounding
                        continue
                    if amt < (1.0 - self.max_decay) * last_amt:
                        continue

                visited.add(to_acc)
                path.append({
                    "from": curr_acc,
                    "to": to_acc,
                    "timestamp": ts,
                    "amount": amt,
                    "is_laundering": is_l,
                })
                dfs(to_acc, path, visited)
                path.pop()
                visited.remove(to_acc)

                branches += 1
                if branches >= max_branches:
                    break

        visited = {str(start_account)}
        for to_acc, ts, amt, is_l in self.out_edges.get(str(start_account), []):
            step = {"from": str(start_account), "to": to_acc, "timestamp": ts, "amount": amt, "is_laundering": is_l}
            visited.add(to_acc)
            dfs(to_acc, [step], visited)
            visited.remove(to_acc)

        return chains

    def get_account_chain_profile(self, account_id: str, min_hops: int = 2, max_hops: int = 4) -> Dict:
        """Inspects whether an account is part of any multi-hop chain and its role."""
        acc = str(account_id)
        # Check outgoing chains (account as source or early intermediary)
        out_chains = self.find_chains_from_account(acc, min_hops=min_hops, max_hops=max_hops)

        # Also check if it appears as an intermediary or sink in incoming chains
        in_chains: List[Dict] = []
        for upstream_acc, ts, amt, is_l in self.in_edges.get(acc, []):
            chains_from_up = self.find_chains_from_account(upstream_acc, min_hops=min_hops, max_hops=max_hops)
            for c in chains_from_up:
                if acc in c["accounts"]:
                    in_chains.append(c)

        all_chains = {tuple(c["accounts"]): c for c in (out_chains + in_chains)}.values()
        all_chains_list = list(all_chains)

        is_in_chain = len(all_chains_list) > 0
        roles: Set[str] = set()

        for c in all_chains_list:
            accs = c["accounts"]
            idx = accs.index(acc)
            if idx == 0:
                roles.add("source")
            elif idx == len(accs) - 1:
                roles.add("sink")
            else:
                roles.add("intermediary_mule")

        primary_role = "none"
        if "intermediary_mule" in roles:
            primary_role = "intermediary_mule"
        elif "source" in roles:
            primary_role = "source"
        elif "sink" in roles:
            primary_role = "sink"

        max_len = max([c["hops"] for c in all_chains_list], default=0)

        return {
            "account_id": acc,
            "is_in_chain": is_in_chain,
            "role": primary_role,
            "roles": list(roles),
            "num_chains_found": len(all_chains_list),
            "max_chain_hops": max_len,
            "sample_chains": all_chains_list[:5],
        }
