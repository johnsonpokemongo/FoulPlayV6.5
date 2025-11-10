import { smogonAnalyses, smogonTeams, dmgCalc, importTeamText, exportTeamPacked, dexSpecies, dexMove, dexItem } from "./client.js";

export async function getAnalyses(format, mon){ return smogonAnalyses(format, mon); }
export async function getTeams(format){ return smogonTeams(format); }
export async function calcDamage(payload){ return dmgCalc(payload); }
export async function importPS(text){ return importTeamText(text); }
export async function exportPacked(team){ return exportTeamPacked(team); }
export async function getSpecies(id){ return dexSpecies(id); }
export async function getMove(id){ return dexMove(id); }
export async function getItem(id){ return dexItem(id); }
