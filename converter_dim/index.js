import path from 'path';
import fs from 'fs-extra';
import klawSync from 'klaw-sync';
import csv from 'csvtojson';
import commandLineArgs from 'command-line-args';
import $rdf from 'rdflib';
import { add, store } from './utils.js';
import langTab from './langTab.js';
import groupTab from './groupTab.js';
import {
  SILK_DIM, RDF, RDFS, SKOS, DC, XSD, FOAF, PAV, nsValues,
} from './prefixes.js';

const optionDefinitions = [
  { name: 'verbose', type: Boolean },
  {
    name: 'src', alias: 's', type: String, defaultOption: true, defaultValue: './raw-data_dim',
  },
  {
    name: 'dst', alias: 'd', type: String, defaultValue: 'dimension.ttl',
  },
  {
    name: 'version', alias: 'v', type: String, defaultValue: '1.0',
  },
];

const options = commandLineArgs(optionDefinitions);

const today = new Date().toISOString().slice(0, 10);


// setup scheme
const scheme = $rdf.sym(SILK_DIM('silknow-dimension-vocabulary'));
add(scheme, RDF('type'), SKOS('ConceptScheme'));
add(scheme, RDFS('label'), 'Controlled vocabulary for P2_has_type of E53 Dimension', 'en');
add(scheme, DC('created'), $rdf.literal('2020-12-08', XSD('date')));
add(scheme, DC('modified'), $rdf.literal(today, XSD('date')));
add(scheme, PAV('createdOn'), $rdf.literal(today, XSD('date')));
add(scheme, PAV('version'), options.version);

langTab.setScheme(scheme);

async function convertFile(file) {
  const lang = path.parse(file).name;

  return csv().fromFile(file)
    .then((s) => {
      if (lang.startsWith('group-')) {
        const name = lang.split('-')[1];
        return groupTab.convert(s, name);
      }
      return langTab.convert(s, lang);
    });
}

const promises = klawSync(options.src, { nodir: true })
  .map((x) => x.path)
  .filter((x) => x.endsWith('.csv'))
  .map(convertFile);

Promise.all(promises)
  .then(() => {
    store.namespaces = nsValues;

    $rdf.serialize(undefined, store, 'http://example.org', 'text/turtle', (err, str) => {
      if (err) throw (err);
      const data = str
        .replace('@prefix : <#>.\n', '')
        .replace(/^silknow:/gm, '\nsilknow:');

      fs.writeFile(options.dst, data, 'utf8');
      console.log(`File written: ${options.dst}`);
    });
  })
  .catch((err) => console.error(err));
