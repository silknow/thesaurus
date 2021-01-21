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
  SILKNOW, RDF, RDFS, SKOS, DC, XSD, FOAF, PAV, nsValues,
} from './prefixes.js';

const optionDefinitions = [
  { name: 'verbose', type: Boolean },
  {
    name: 'src', alias: 's', type: String, defaultOption: true, defaultValue: './raw-data',
  },
  {
    name: 'dst', alias: 'd', type: String, defaultValue: 'thesaurus.ttl',
  },
  {
    name: 'version', alias: 'v', type: String, defaultValue: '2.0',
  },
];

const options = commandLineArgs(optionDefinitions);

const today = new Date().toISOString().slice(0, 10);

// silknow project entity
const silknowProj = $rdf.sym('https://www.silknow.eu/');
add(silknowProj, RDF('type'), FOAF('Project'));
add(silknowProj, RDFS('label'), 'SILKNOW');
add(silknowProj, RDFS('comment'), 'SILKNOW is a research project that improves the understanding, conservation and dissemination of European silk heritage from the 15th to the 19th century.');
add(silknowProj, FOAF('logo'), 'http://silknow.org/wp-content/uploads/2018/06/cropped-silknow-1.png');
add(silknowProj, FOAF('homepage'), $rdf.sym('https://www.silknow.eu/'));

// setup scheme
const scheme = $rdf.sym(SILKNOW('silk-thesaurus'));
add(scheme, RDF('type'), SKOS('ConceptScheme'));
add(scheme, RDFS('label'), 'Thesaurus describing silk related techniques and material', 'en');
add(scheme, DC('created'), $rdf.literal('2018-11-09', XSD('date')));
add(scheme, DC('modified'), $rdf.literal(today, XSD('date')));
add(scheme, PAV('createdOn'), $rdf.literal(today, XSD('date')));
// add(scheme, DC('creator'), silknowProj);
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
