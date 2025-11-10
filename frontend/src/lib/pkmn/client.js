const PKMN = (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_PKMN_SVC_URL) ? import.meta.env.VITE_PKMN_SVC_URL : "http://localhost:8787";

export async function pkmn(path, init) {
  const r = await fetch(`${PKMN}${path}`, init);
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  const ct = r.headers.get("content-type") || "";
  return ct.includes("application/json") ? r.json() : r.text();
}

export const smogonAnalyses = (format, mon) =>
  pkmn(`/smogon/analyses/${format}/${encodeURIComponent(mon)}`);

export const smogonTeams = (format) =>
  pkmn(`/smogon/teams/${format}`);

export const dmgCalc = (payload) =>
  pkmn(`/dmg/calc`, {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify(payload)
  });

export const importTeamText = (text) =>
  pkmn(`/sets/import`, {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({text})
  });

export const exportTeamPacked = (team) =>
  pkmn(`/sets/export`, {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({team})
  });

export const dexSpecies = (id) => pkmn(`/dex/species/${encodeURIComponent(id)}`);
export const dexMove    = (id) => pkmn(`/dex/move/${encodeURIComponent(id)}`);
export const dexItem    = (id) => pkmn(`/dex/item/${encodeURIComponent(id)}`);
