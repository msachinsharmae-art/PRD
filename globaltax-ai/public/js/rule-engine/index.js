// Rule-engine registry — single entry point for the Calculator Agent.

import { calcIndia,       IN_META } from "./india.js";
import { calcUAE,         AE_META } from "./uae.js";
import { calcKSA,         SA_META } from "./ksa.js";
import { calcEgypt,       EG_META } from "./egypt.js";
import { calcUS,          US_META } from "./us.js";
import { calcUK,          GB_META } from "./uk.js";
import { calcCanada,      CA_META } from "./canada.js";
import { calcAustralia,   AU_META } from "./australia.js";
import { calcGermany,     DE_META } from "./germany.js";
import { calcSingapore,   SG_META } from "./singapore.js";
import { calcIreland,     IE_META } from "./ireland.js";
import { calcNetherlands, NL_META } from "./netherlands.js";
import { calcJapan,       JP_META } from "./japan.js";
import { calcBrazil,      BR_META } from "./brazil.js";
import { calcSouthAfrica, ZA_META } from "./southafrica.js";

export const COUNTRIES = {
  IN: { meta: IN_META, calc: calcIndia       },
  US: { meta: US_META, calc: calcUS          },
  GB: { meta: GB_META, calc: calcUK          },
  CA: { meta: CA_META, calc: calcCanada      },
  AU: { meta: AU_META, calc: calcAustralia   },
  DE: { meta: DE_META, calc: calcGermany     },
  SG: { meta: SG_META, calc: calcSingapore   },
  IE: { meta: IE_META, calc: calcIreland     },
  NL: { meta: NL_META, calc: calcNetherlands },
  JP: { meta: JP_META, calc: calcJapan       },
  BR: { meta: BR_META, calc: calcBrazil      },
  ZA: { meta: ZA_META, calc: calcSouthAfrica },
  AE: { meta: AE_META, calc: calcUAE         },
  SA: { meta: SA_META, calc: calcKSA         },
  EG: { meta: EG_META, calc: calcEgypt       }
};

export const FLAGS = {
  IN: "🇮🇳", US: "🇺🇸", GB: "🇬🇧", CA: "🇨🇦", AU: "🇦🇺",
  DE: "🇩🇪", SG: "🇸🇬", IE: "🇮🇪", NL: "🇳🇱", JP: "🇯🇵",
  BR: "🇧🇷", ZA: "🇿🇦", AE: "🇦🇪", SA: "🇸🇦", EG: "🇪🇬"
};

export function listCountries() {
  return Object.values(COUNTRIES).map(c => c.meta);
}

export function calculate(countryCode, payload) {
  const entry = COUNTRIES[countryCode];
  if (!entry) throw new Error(`Unsupported country: ${countryCode}`);
  return entry.calc(payload);
}
