import {Dex} from '@pkmn/dex';
import {Generations} from '@pkmn/data';
export const gens = new Generations(Dex);
export const gen = (n: number) => gens.get(n);
