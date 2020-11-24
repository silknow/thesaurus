import $rdf from 'rdflib';

export const SILKNOW_CAT = $rdf.Namespace('http://data.silknow.org/category/');
export const FACET = $rdf.Namespace('http://data.silknow.org/vocabulary/facet/');
export const RDF = $rdf.Namespace('http://www.w3.org/1999/02/22-rdf-syntax-ns#');
export const RDFS = $rdf.Namespace('http://www.w3.org/2000/01/rdf-schema#');
export const SKOS = $rdf.Namespace('http://www.w3.org/2004/02/skos/core#');
export const DC = $rdf.Namespace('http://purl.org/dc/terms/');
export const XSD = $rdf.Namespace('http://www.w3.org/2001/XMLSchema#');
export const FOAF = $rdf.Namespace('http://xmlns.com/foaf/0.1/');
export const PAV = $rdf.Namespace('http://purl.org/pav/');


export const nsValues = {
  silknow_cat: SILKNOW_CAT().value,
  'silknow-fct': FACET().value,
  skos: SKOS().value,
  dct: DC().value,
  xsd: XSD().value,
  getty: 'http://vocab.getty.edu/aat/',
  rdfs: RDFS().value,
  foaf: FOAF().value,
  pav: PAV().value,
};
