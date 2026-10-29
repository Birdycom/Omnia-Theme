// Loads the plans and marks the cheapest one
export async function loadPlans(url = "/api/plans") {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const plans = await res.json();
  const cheapest = Math.min(...plans.map((p) => p.price));
  return plans.map((p) => ({ ...p, cheapest: p.price === cheapest }));
}
