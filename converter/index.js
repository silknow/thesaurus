/* eslint-disable no-console */


const path = require('path');
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

const SILKNOW = $rdf.Namespace('http://data.silknow.org/vocabulary/');
const RDF = $rdf.Namespace('http://www.w3.org/1999/02/22-rdf-syntax-ns#');
const RDFS = $rdf.Namespace('http://www.w3.org/2000/01/rdf-schema#');
const SKOS = $rdf.Namespace('http://www.w3.org/2004/02/skos/core#');
const DC = $rdf.Namespace('http://purl.org/dc/terms/');
const XSD = $rdf.Namespace('http://www.w3.org/2001/XMLSchema#');
const FOAF = $rdf.Namespace('http://xmlns.com/foaf/0.1/');
const PAV = $rdf.Namespace('http://purl.org/pav/');

const today = new Date().toISOString().slice(0, 10);

const COLUMN = {
  en: {
    ID: 'ID-ES',
    TERM: 'TERM',
    DEFINITION: 'FINAL DEFINITION',
    BIB: 'BiBLIOGRAPHY',
    QUAL: 'QUALIFIER',
    SYN: 'SYNONYMS',
    RELATED: 'ASSOCIATED TERMS',
    BROADER: 'hierarchy',
  },
  es: {
    ID: 'ID-ES',
    TERM: 'TÉRMINO',
    DEFINITION: 'DEFINICIÓN FINAL',
    BIB: 'FUENTES',
    SYN: 'SINÓNIMOS',
    QUAL: 'Qualifier',
    RELATED: 'TÉRMINO ASOCIADO',
    BROADER: 'JERARQUÍA',
  },
  fr: {
    ID: 'ID-ES',
    TERM: 'TERME',
    DEFINITION: 'DEFINITION INITIALE',
    BIB: 'BIBLIOGRAPHIE',
    SYN: 'SYNONYMES',
    QUAL: 'Qualifier',
    RELATED: 'TÉRMINO ASOCIADO',
    BROADER: 'JERARQUÍA',
  },
};

const store = $rdf.graph();

function add(s, p, o, lang) {
  if (!s || !p || !o) return;
  /* eslint-disable no-param-reassign  */
  if (typeof o === 'string') o = o.trim();
  if (!o) return;
  if (lang) store.add(s, p, $rdf.literal(o, lang));
  else if (typeof o === 'string' && validUrl.isUri(o)) store.add(s, p, $rdf.sym(o));
  else store.add(s, p, o);
}

// silknow project entity
const silknowProj = $rdf.sym('http://data.silknow.org/SILKNOW');
add(silknowProj, RDF('type'), FOAF('Project'));
add(silknowProj, RDFS('label'), 'SILKNOW');
add(silknowProj, RDFS('comment'), 'SILKNOW is a research project that improves the understanding, conservation and dissemination of European silk heritage from the 15th to the 19th century.');
add(silknowProj, FOAF('logo'), 'http://silknow.org/wp-content/uploads/2018/06/cropped-silknow-1.png');
add(silknowProj, FOAF('homepage'), $rdf.sym('http://silknow.eu/'));

// setup scheme
const scheme = $rdf.sym(SILKNOW('silk-thesaurus'));
add(scheme, RDF('type'), SKOS('ConceptScheme'));
add(scheme, RDFS('label'), 'Thesaurus describing silk related techniques and material', 'en');
add(scheme, DC('created'), $rdf.literal('2018-11-09', XSD('date')));
add(scheme, DC('modified'), $rdf.literal(today, XSD('date')));
add(scheme, PAV('createdOn'), $rdf.literal(today, XSD('date')));
add(scheme, DC('creator'), silknowProj);
add(scheme, PAV('version'), '1.5');

function toConcept(s, k, lang) {
  const id = s[k.ID].trim();
  if (!id) return;

  const concept = SILKNOW(id);
  add(concept, RDF('type'), SKOS('Concept'));

  let label = s[k.TERM];
  if (s[k.QUAL]) label += ` (${s[k.QUAL]})`;

  add(concept, SKOS('prefLabel'), label.replace(/\.$/, ''), lang);
  if (s[k.SYN]) {
    s[k.SYN].split(',')
      .forEach(syn => add(concept, SKOS('altLabel'), syn.replace(/\.$/, ''), lang));
  }
  add(concept, SKOS('definition'), s[k.DEFINITION], lang);

  if (s[k.RELATED]) {
    s[k.RELATED].split(',')
      .filter(r => !Number.isNaN(Number.parseInt(r, 10)))
      .map(r => r.trim())
      .forEach(r => add(concept, SKOS('related'), SILKNOW(r)));
  }

  let hasInternalBroader;
  if (s[k.BROADER]) {
    const b = s[k.BROADER].split(',')
      .map(x => x.trim())
      .map((x) => {
        if (validUrl.isUri(x)) return x;
        if (!Number.isNaN(Number.parseInt(x, 10))) return SILKNOW(x);
        return null;
      })
      .filter(x => x);

    hasInternalBroader = b.some(x => x instanceof $rdf.NamedNode);
    b.forEach(x => add(concept, SKOS('broader'), x));
  }

  add(concept, SKOS('inScheme'), scheme);
  if (!hasInternalBroader) add(concept, SKOS('topConceptOf'), scheme);


  if (s[k.BIB]) {
    s[k.BIB].split(';')
      .forEach(b => add(concept, DC('bibliographicCitation'), b, lang));
  }
}

function convertToSkos(source, lang) {
  let K = Object.assign({}, COLUMN.en);
  const fileColumns = Object.keys(source[0]);
  if (fileColumns.includes('TÉRMINO')) K = Object.assign({}, COLUMN.es);
  if (fileColumns.includes('TERME')) K = Object.assign({}, COLUMN.fr);


  if (!fileColumns.includes('ID')) {
    K.ID = 'ID-ES';
    K.TERM = 'TERM-ES';
  } else if (!fileColumns.includes('ID-ES')) {
    K.ID = 'ID';
  }

  source.filter(s => s[K.ID])
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
    store.namespaces = {
      silknow: SILKNOW().value,
      skos: SKOS().value,
      dc: DC().value,
      xsd: XSD().value,
      getty: 'http://vocab.getty.edu/aat/',
      rdfs: RDFS().value,
      foaf: FOAF().value,
      pav: FOAF().value,
    };

    $rdf.serialize(undefined, store, 'http://example.org', 'text/turtle', (err, str) => {
      if (err) throw (err);
      const data = str
        .replace('@prefix : <#>.\n', '')
        .replace(/^silknow:/gm, '\nsilknow:');

      fs.writeFile(options.dst, data, 'utf8');
      console.log(`File written: ${options.dst}`);
    });
  })
  .catch(err => console.error(err));
