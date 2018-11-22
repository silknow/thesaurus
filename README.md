# thesaurus
Multilingual SILKNOW thesaurus extending Getty AAT


## Converter

### How to use

    npm install --production
    npm run convert

Parameters:

-  `--src`, `-s`, source folder, it parses all the csv inside. Default: `./raw-data`
-  `--dst`, `-d`, output file. Default: `thesaurus.ttl`

**IMPORTANT** The input file name should be named `<language>.csv` (so `en.csv`, `es.csv`, ...).

<!-- ### Known problems

- __ASSOCIATED TERMS.__ what to do with strings? (e.g. _tisú_) I suppose they are wrongly-placed SYNONYMS.
- __ASSOCIATED TERMS.__ There are reference to not existing terms (e.g. _110_)
- __SYNONYMS.__ There are interrogative points (i.e. _montura?_)
- __SYNONYMS.__ There are conjunctions, while I can manage only commas (`,`) (looking at multilingualism) (i.e. _acanalado de ladrillo o interrumpido o alterno_)
- __SYNONYMS.__ what to do with numbers? (e.g. _361_) I suppose they are wrongly-placed ASSOCIATED TERMS.
- __TERM.__ There are conjunctions. Only 1 label per language can be the prefLabel (e.g. _Enjulio o enjullo_).
- __HIERARCHIES.__ What to do when the value is not an URI neither a Number? -->
