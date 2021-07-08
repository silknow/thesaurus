import $rdf from 'rdflib';
import { add } from './utils.js';
import { WD, SILKNOW, SKOS } from './prefixes.js';

// WikiData ID,Language,Label,Matching SilkNow Item IDs,mapping properties

const ID = 'WikiData ID';
const TARGET = 'Matching SilkNow Item IDs';
const PROP = 'mapping properties';

function preprocessProperty(string) {
  string = string.trim().replace(/^#/, '');
  string = string.charAt(0).toLowerCase() + string.slice(1);
  return string.trim();
}

function convert(source, name) {
  // name can be useful in future somehow
  if (name !== 'wikidata') {
    console.error('Matches not recognised. Implementation required');
    return;
  }
  source.filter((s) => s[PROP] && s[PROP].toLowerCase() !== 'nomatch')
    .forEach((s) => { // instantiate match
      const prop = preprocessProperty(s[PROP]);
      add(SILKNOW(s[TARGET]), SKOS(prop), WD(s[ID]));
    });
}

export default {
  convert,
};
