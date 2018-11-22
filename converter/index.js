/* eslint no-param-reassign: "warn" */


/* remove when Array#flat is implemented in Node (see https://goo.gl/pK34PD) */
const flat = require('array.prototype.flat');
const path = require('path');

if (!Array.prototype.flat) flat.shim();
/* end remove */

const fs = require('fs-extra');
const klawSync = require('klaw-sync');
const csv = require('csvtojson');
const commandLineArgs = require('command-line-args');
const $rdf = require('rdflib');
const validUrl = require('valid-url');

const optionDefinitions = [
  { name: 'verbose', alias: 'v', type: Boolean },
  {
    name: 'src', alias: 's', type: String, defaultOption: true, defaultValue: './raw-data',
  },
  {
    name: 'dst', alias: 'd', type: String, defaultValue: 'thesaurus.ttl',
  },
];

const options = commandLineArgs(optionDefinitions);

const SILKNOW_URI = 'http://data.silknow.org/vocabulary/';
const SILKNOW = $rdf.Namespace(SILKNOW_URI);
const RDF = $rdf.Namespace('http://www.w3.org/1999/02/22-rdf-syntax-ns#');
const SKOS_URI = 'http://www.w3.org/2004/02/skos/core#';
const SKOS = $rdf.Namespace(SKOS_URI);
const DC_URI = 'http://purl.org/dc/terms/';
const DC = $rdf.Namespace(DC_URI);
const XSD_URI = 'http://www.w3.org/2001/XMLSchema#';
const XSD = $rdf.Namespace(XSD_URI);

const COLUMN = {
  en: {
    ID: 'ID',
    TERM: 'TERM',
    DEFINITION: 'FINAL DEFINITION',
    BIB: 'BiBLIOGRAPHY',
    SYN: 'SYNONYMS',
    RELATED: 'ASSOCIATED TERMS',
    BROADER: 'HIERARCHIES',
  },
  es: {
    ID: 'ID',
    TERM: 'TÉRMINO',
    DEFINITION: 'DEFINICIÓN FINAL',
    BIB: 'FUENTES',
    SYN: 'SINÓNIMOS',
    RELATED: 'TÉRMINO ASOCIADO',
    BROADER: 'JERARQUÍA',
  },
};

const store = $rdf.graph();
function add(s, p, o, lang) {
  if (!s || !p || !o) return;
  if (typeof o === 'string') o = o.trim();
  if (lang) store.add(s, p, $rdf.literal(o, lang));
  else if (typeof o === 'string' && validUrl.isUri(o)) store.add(s, p, $rdf.sym(o));
  else store.add(s, p, o);
}

function toConcept(s, k, lang) {
  const concept = SILKNOW(s[k.ID]);
  add(concept, RDF('type'), SKOS('Concept'));
  add(concept, SKOS('prefLabel'), s[k.TERM], lang);
  if (s[k.SYN]) {
    s[k.RELATED].split(',')
      .forEach(syn => add(concept, SKOS('altLabel'), syn, lang));
  }

  add(concept, SKOS('definition'), s[k.DEFINITION], lang);

  if (s[k.RELATED]) {
    s[k.RELATED].split(',')
      .filter(r => !Number.isNaN(Number.parseInt(r, 10)))
      .map(r => r.trim())
      .forEach(r => add(concept, SKOS('related'), SILKNOW(r)));
  }
  if (s[k.BROADER]) {
    s[k.BROADER].split(',')
      .map(x => x.trim())
      .map((x) => {
        if (validUrl.isUri(x)) return x;
        if (!Number.isNaN(Number.parseInt(x, 10))) return SILKNOW(x);
        return null;
      })
      .filter(x => x)
      .forEach(x => add(concept, SKOS('broader'), x));
  }

  if (s[k.BIB]) {
    s[k.BIB].split(';').forEach(b => add(concept, DC('bibliographicCitation'), b));
  }
}

function convertToSkos(source, lang) {
  let K = COLUMN.en;
  if (Object.keys(source[0]).includes('TÉRMINO')) {
    K = COLUMN.es;
  }

  source.filter(s => s.ID)
    .forEach(s => toConcept(s, K, lang));
}

async function convertFile(file) {
  const lang = path.parse(file).name;

  return csv().fromFile(file)
    .then(s => convertToSkos(s, lang));
}

const promises = klawSync(options.src, { nodir: true })
  .map(x => x.path)
  .filter(x => x.endsWith('.csv'))
  .map(convertFile);

Promise.all(promises)
  .then(() => {
    const today = new Date().toISOString().slice(0, 10);

    const scheme = $rdf.sym(SILKNOW_URI);
    add(scheme, RDF('type'), SKOS('ConceptScheme'));
    add(scheme, DC('created'), $rdf.literal('2018-11-09', XSD('date')));
    add(scheme, DC('modified'), $rdf.literal(today, XSD('date')));

    store.namespaces = {
      silknow: SILKNOW_URI,
      skos: SKOS_URI,
      dc: DC_URI,
      xsd: XSD_URI,
      getty: 'http://vocab.getty.edu/aat/',
      'getty-page': 'http://vocab.getty.edu/page/aat/',
    };

    $rdf.serialize(undefined, store, 'http://example.org', 'text/turtle', (err, str) => {
      if (err) throw (err);
      fs.writeFile(options.dst, str.replace(/^silknow:/gm, '\nsilknow:'), 'utf8');
    });
  })
  .catch((err) => {
    console.error(err);
  });
