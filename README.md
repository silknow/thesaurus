# thesaurus
Multilingual SILKNOW thesaurus extending Getty AAT, developed in [SKOS](https://www.w3.org/2009/08/skos-reference/skos.html).


## Converter

The software converts all the content of the `raw-data` (or differently defined `--src` folder), expecting that its content match the csv export of the [spreadsheet](https://docs.google.com/spreadsheets/d/18Czllr7fZg90NYErcpzR4GweO5f-aoGVLdjmxZCadWU).

**IMPORTANT** The input file name should be named `<language>.csv` (so `en.csv`, `es.csv`, ...) and `group-<name>.csv` (so `group-depictions.csv`, ...).

### How to use

    npm install --production ## download the dependencies
    npm run convert ## start the conversion

Parameters (to be introduced with a `--`):

-  `--src`, `-s`, source folder, it parses all the csv inside. Default: `./raw-data`
-  `--dst`, `-d`, output file. Default: `thesaurus.ttl`
-  `--version`, `-v`, version number. Default: `2.0`
-  `--verbose`, print verbose logs. Default: _false_.

Example:

    npm run convert -- -v 2.92

### Skosify

To make it ready to work with [Skosmos](https://github.com/NatLibFi/Skosmos), it is suggested to process the file with [Skosify](https://github.com/NatLibFi/Skosify).

    pip install --upgrade skosify
    skosify thesaurus.ttl -o thesaurus.ttl
    skosify categories.ttl -o categories.ttl
