import $rdf from 'rdflib';
import validUrl from 'valid-url';
import { add } from './utils.js';
import {
  SILKNOW, RDF, SKOS, DC,
} from './prefixes.js';

const COLUMN = {
  en: {
    ID: 'ID-ES',
    TERM: 'TERM',
    DEFINITION: 'FINAL DEFINITION',
    BIB: 'BIBLIOGRAPHY',
    QUAL: 'Qualifier',
    SYN: 'SYNONYMS',
    RELATED: 'ASSOCIATED TERMS',
    FACETS: 'FACET',
    BROADER: 'hierarchy',
  },
  es: {
    ID: 'ID-ES',
    TERM: 'TERM-ES',
    DEFINITION: 'FINAL DEFINITION',
    BIB: 'BIBLIOGRAPHY',
    SYN: 'SYNONYMS',
    QUAL: 'QUALIFIER',
    RELATED: 'ASSOCIATED TERMS',
    FACETS: 'FACET',
    BROADER: 'HIERARCHY (PARENT)',
    EXACT_MATCH: 'skos:exactMatch',
    CLOSE_MATCH: 'skos:closeMatch',
  },
  fr: {
    ID: 'ID-ES',
    TERM: 'TERME',
    DEFINITION: 'DEFINITION FINALE',
    BIB: 'BIBLIOGRAPHIE',
    SYN: 'SYNONYMES',
    QUAL: 'Qualifier',
    RELATED: 'TÉRMINO ASOCIADO',
    FACETS: 'FACET',
    BROADER: 'JERARQUÍA',
  },
  it: {
    ID: 'ID-ES',
    TERM: 'TÉRMINO',
    DEFINITION: 'DEFINICIÓN FINAL',
    BIB: 'FUENTES',
    SYN: 'SINÓNIMOS',
    QUAL: 'Qualifier',
    RELATED: 'TÉRMINO ASOCIADO',
    FACETS: 'FACET',
    BROADER: 'JERARQUÍA',
  },
};

let scheme;

function toConcept(s, k, lang) {
  const id = s[k.ID].trim();
  if (!id) return;
  let label = s[k.TERM].trim();
  if (!label) return;

  const concept = SILKNOW(id);
  add(concept, RDF('type'), SKOS('Concept'));

  if (s[k.QUAL]) label += ` (${s[k.QUAL].trim()})`;

  add(concept, SKOS('prefLabel'), label.replace(/\.$/, ''), lang);
  if (s[k.SYN]) {
    s[k.SYN].split(',')
      .forEach((syn) => add(concept, SKOS('altLabel'), syn.replace(/\.$/, ''), lang));
  }
  add(concept, SKOS('definition'), s[k.DEFINITION], lang);

  if (s[k.RELATED]) {
    s[k.RELATED].split(',')
      .filter((r) => !Number.isNaN(Number.parseInt(r, 10)))
      .map((r) => r.trim())
      .forEach((r) => add(concept, SKOS('related'), SILKNOW(r)));
  }

  if (s[k.FACETS]) {
    s[k.FACETS].split(/[,;]/)
      .forEach((r) => add($rdf.sym(r.trim()), SKOS('member'), concept));
  }

  let hasInternalBroader;
  if (s[k.BROADER]) {
    const b = s[k.BROADER].split(',')
      .map((x) => x.trim())
      .map((x) => {
        if (validUrl.isUri(x)) return x;
        if (!Number.isNaN(Number.parseInt(x, 10))) return SILKNOW(x);
        return null;
      })
      .filter((x) => x);

    hasInternalBroader = b.some((x) => x instanceof $rdf.NamedNode);
    b.forEach((x) => add(concept, SKOS('broader'), x));
  }

  add(concept, SKOS('exactMatch'), s[k.EXACT_MATCH]);
  add(concept, SKOS('closeMatch'), s[k.CLOSE_MATCH]);

  add(concept, SKOS('inScheme'), scheme);
  if (!hasInternalBroader) add(concept, SKOS('topConceptOf'), scheme);

  if (s[k.BIB]) {
    if (lang === 'en') add(concept, DC('bibliographicCitation'), s[k.BIB], lang);
    else {
      s[k.BIB].split(';')
        .forEach((b) => add(concept, DC('bibliographicCitation'), b, lang));
    }
  }
}

function convert(source, lang) {
  const K = { ...COLUMN[lang] };

  source.filter((s) => s[K.ID])
    .forEach((s) => toConcept(s, K, lang));
}

function setScheme(_scheme) {
  scheme = _scheme;
}

export default {
  convert,
  setScheme,
};
