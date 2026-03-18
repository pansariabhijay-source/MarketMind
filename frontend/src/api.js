const BASE = '/api'

export async function startRun(productIdea) {
  const res = await fetch(`${BASE}/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ product_idea: productIdea }),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getStatus(jobId) {
  const res = await fetch(`${BASE}/status/${jobId}`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getHistory() {
  const res = await fetch(`${BASE}/history`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getAgents() {
  const res = await fetch(`${BASE}/agents`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function clearHistory() {
  const res = await fetch(`${BASE}/history`, { method: 'DELETE' })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}
