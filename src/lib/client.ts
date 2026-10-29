export async function portalAction(action: string, payload: Record<string, unknown> = {}) {
  const response = await fetch("/api/portal", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...payload }) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Não foi possível concluir esta ação.");
  return result;
}
