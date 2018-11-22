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
