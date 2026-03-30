import { State } from '../graphql/enums';

export const AVAILABLE_STATES_CONFIG_KEY = 'available_states';

export const ALL_NIGERIAN_STATES = [
  State.ABIA,
  State.ADAMAWA,
  State.AKWA_IBOM,
  State.ANAMBRA,
  State.BAUCHI,
  State.BAYELSA,
  State.BENUE,
  State.BORNO,
  State.CROSS_RIVER,
  State.DELTA,
  State.EBONYI,
  State.EDO,
  State.EKITI,
  State.ENUGU,
  State.GOMBE,
  State.IMO,
  State.JIGAWA,
  State.KADUNA,
  State.KANO,
  State.KATSINA,
  State.KEBBI,
  State.KOGI,
  State.KWARA,
  State.LAGOS,
  State.NASARAWA,
  State.NIGER,
  State.OGUN,
  State.ONDO,
  State.OSUN,
  State.OYO,
  State.PLATEAU,
  State.RIVERS,
  State.SOKOTO,
  State.TARABA,
  State.YOBE,
  State.ZAMFARA,
  State.FEDERAL_CAPITAL_TERRITORY,
] as const;

export type NigerianState =
  (typeof ALL_NIGERIAN_STATES)[number];

const STATE_ALIASES: Record<string, NigerianState> = {
  abia: State.ABIA,
  adamawa: State.ADAMAWA,
  akwaibom: State.AKWA_IBOM,
  anambra: State.ANAMBRA,
  bauchi: State.BAUCHI,
  bayelsa: State.BAYELSA,
  benue: State.BENUE,
  borno: State.BORNO,
  crossriver: State.CROSS_RIVER,
  delta: State.DELTA,
  ebonyi: State.EBONYI,
  edo: State.EDO,
  ekiti: State.EKITI,
  enugu: State.ENUGU,
  fct: State.FEDERAL_CAPITAL_TERRITORY,
  federalcapitalterritory: State.FEDERAL_CAPITAL_TERRITORY,
  federalcapitalterritoryabuja: State.FEDERAL_CAPITAL_TERRITORY,
  abuja: State.FEDERAL_CAPITAL_TERRITORY,
  gombe: State.GOMBE,
  imo: State.IMO,
  jigawa: State.JIGAWA,
  kaduna: State.KADUNA,
  kano: State.KANO,
  katsina: State.KATSINA,
  kebbi: State.KEBBI,
  kogi: State.KOGI,
  kwara: State.KWARA,
  lagos: State.LAGOS,
  nasarawa: State.NASARAWA,
  nassarawa: State.NASARAWA,
  niger: State.NIGER,
  ogun: State.OGUN,
  ondo: State.ONDO,
  osun: State.OSUN,
  oyo: State.OYO,
  plateau: State.PLATEAU,
  rivers: State.RIVERS,
  sokoto: State.SOKOTO,
  taraba: State.TARABA,
  yobe: State.YOBE,
  zamfara: State.ZAMFARA,
};

export const normalizeNigerianState = (
  rawValue: string | null | undefined,
): NigerianState | null => {
  if (!rawValue) {
    return null;
  }

  const normalizedKey = rawValue.toLowerCase().replace(/[^a-z]/g, '');
  return STATE_ALIASES[normalizedKey] ?? null;
};

export const normalizeAvailableStatesValue = (
  value: unknown,
): NigerianState[] => {
  if (!Array.isArray(value)) {
    return [...ALL_NIGERIAN_STATES];
  }

  const normalized = value
    .map((item) =>
      typeof item === 'string' ? normalizeNigerianState(item) : null,
    )
    .filter((item): item is NigerianState => Boolean(item));

  return normalized.length > 0
    ? Array.from(new Set(normalized))
    : [...ALL_NIGERIAN_STATES];
};
