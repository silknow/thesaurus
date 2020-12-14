import $rdf from 'rdflib';
import validUrl from 'valid-url';

export const store = $rdf.graph();

export function add(s, p, o, lang) {
  if (!s || !p || !o) return;
  /* eslint-disable no-param-reassign  */
  if (typeof o === 'string') o = o.trim().replace(/\n$/, '');
  if (!o) return;
  if (lang) store.add(s, p, $rdf.literal(o, lang));
  else if (typeof o === 'string' && validUrl.isUri(o)) store.add(s, p, $rdf.sym(o));
  else store.add(s, p, o);
}
