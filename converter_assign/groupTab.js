import $rdf from 'rdflib';
import { add } from './utils.js';
import {
  FACET, RDF, SKOS,
} from './prefixes.js';


function toCollection(s, main) {
  const coll = $rdf.sym(s.Facet);
  add(coll, RDF('type'), SKOS('Collection'));
  const name = s.Group.replace(/^[a-z]_/, '').replace('_', ' ');
  add(coll, SKOS('prefLabel'), name, 'en');
  add(main, SKOS('member'), coll);
}

function convert(source, name) {
  // create main collection
  const mainGroup = $rdf.sym(FACET(name));
  add(mainGroup, RDF('type'), SKOS('Collection'));
  add(mainGroup, SKOS('prefLabel'), name, 'en');

  source.filter((s) => s.Facet)
    .forEach((s) => toCollection(s, mainGroup));
}

export default {
  convert,
};
