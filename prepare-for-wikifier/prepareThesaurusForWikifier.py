"""
This script processes the SilkNow thesaurus into files suitable
for use with the JSI Wikifier (www.wikifier.org) as extra vocabularies.
It assumes that the thesaurus, in Turtle format, is available in
the file "thesaurus.ttl" in the current directory.

Author: Janez Brank <janez.brank@ijs.si>

A short description of the output file formats follows:

(1) Concept Labels:

For each language, we need a .json file containing the
labels of the concepts in that language.  This file must
contain one JSON object, which must contain one key/value pair
for each concept.  The concept URI should be used as the key,
and the corresponding value should be an object containing
two members: "prefLabel" and "altLabel".  The value of "prefLabel"
should be a string representing the preferred label of this concept
in this language; the value of "altLabel" should be an array of strings
representing the alternative labels of this concept in this language.

Example:

{
    "http://data.silknow.org/vocabulary/210": {
        "prefLabel": "Animal Fibre"
    },
    "http://data.silknow.org/vocabulary/175": {
        "prefLabel": "Effect"
    },
    "http://data.silknow.org/vocabulary/55": {
        "prefLabel": "Bourrette silk",
        "altLabel": [
            "stumba"
        ]
    },
    ...
}

(2) Distance Matrix:

This file is independent of language and contains a matrix of
"semantic distances" between all pairs of concepts.  The distances 
integers >= 0, where 0 is the distance between a concept and itself.
A distance of -1 can be used to represent infinite distance.
The current implementation calculates distances by constructing
an undirected graph where vertices correspond to concepts and two
vertices are directly connected by an edge if one is the parent
of the other or if one is related to the other.  The distance (number
of edges) of the shortest path between two vertices is then used
as the semantic distance between the concepts represented by these
two vertices.

The output file must be a JSON object containing three members:

- "columns": its value is an array of concept URIs indicating
which concept corresponds to which column of the metrix;
- "index": its value is an array of concept URIs indicating
which concept corresponds to which row of the matrix;
- "data": its value is an array of arrays of integers,
where data[i][j] is the distance between the concepts whose
URIs are index[i] and columns[j].

Example (with random distances):

{
    "columns": [
        "http://data.silknow.org/vocabulary/1",
        "http://data.silknow.org/vocabulary/2",
        ...
        "http://data.silknow.org/vocabulary/889"],
    "index": [
        "http://data.silknow.org/vocabulary/1",
        "http://data.silknow.org/vocabulary/2",
        ...
        "http://data.silknow.org/vocabulary/889"],
    "data": [
        [0,2,3,...,2,2,5],
        [2,0,3,...,3,1,4], 
        ...
        [7,-1,7,...,3,3,4]]
}

"""

# pip install rdflib
import rdflib, sys, codecs, json
from rdflib.term import URIRef
from rdflib import RDF

# TConcept and TLabels represent the data that we need from the RDF graph.

class TLabels:
    __slots__ = ["prefLabels", "altLabels"]
    def __init__(self): 
        self.prefLabels = set()
        self.altLabels = set()

class TConcept:
    __slots__ = ["conceptUri", "parentUri", "relatedUris", "labelsByLang"]
    def __init__(self, conceptUri):
        self.conceptUri = conceptUri
        self.parentUri = ""
        self.relatedUris = set()
        self.labelsByLang = {}

SKOS_prefix = "http://www.w3.org/2004/02/skos/core#"
SKOS_concept = URIRef(SKOS_prefix + "Concept")
SKOS_broader = URIRef(SKOS_prefix + "broader")
SKOS_related = URIRef(SKOS_prefix + "related")
SKOS_prefLabel = URIRef(SKOS_prefix + "prefLabel")
SKOS_altLabel = URIRef(SKOS_prefix + "altLabel")
SilkNowConceptPrefix = "http://data.silknow.org/vocabulary/"

sys.stdout = codecs.getwriter("utf-8")(sys.stdout.detach())

# Read the RDF graph.
g = rdflib.Graph()
g.parse("thesaurus.ttl", format = "n3")
# https://github.com/silknow/thesaurus/blob/master/thesaurus.ttl 

# Extract the SilkNow concepts and their properties.
concepts = {}
for s in g.subjects(RDF.type, URIRef(SKOS_concept)): 
    conceptUri = str(s)
    assert conceptUri not in concepts
    concepts[conceptUri] = TConcept(conceptUri)

nConceptsWithParents = 0
for s, p, o in g.triples((None, SKOS_broader, None)):
    childUri = str(s); parentUri = str(o)
    if childUri not in concepts:
        print("Warning: unknown child %s." % repr(childUri)); continue
    if not parentUri.startswith(SilkNowConceptPrefix): continue
    if parentUri not in concepts:
        print("Warning: child %s refers to unknown parent %s." % (repr(childUri), repr(parentUri))); continue
    c = concepts[childUri]
    assert not c.parentUri
    c.parentUri = parentUri
    nConceptsWithParents += 1

nRelatedLinks = 0
for s, p, o in g.triples((None, SKOS_related, None)):
    uri1 = str(s); uri2 = str(o)
    if uri1 not in concepts: print("Warning: unknown concept %s (subject of a related link)." % repr(uri1)); continue
    if uri2 not in concepts: print("Warning: unknown concept %s (object of a related link)." % repr(uri2)); continue
    concepts[uri1].relatedUris.add(uri2)
    nRelatedLinks += 1

for Pass in range(2):
    nLabels = 0
    for s, p, o in g.triples((None, SKOS_prefLabel if Pass == 0 else SKOS_altLabel, None)):
        uri = str(s)
        if uri not in concepts: continue
        c = concepts[uri]
        lang = o.language; label = str(o)
        if lang not in c.labelsByLang: c.labelsByLang[lang] = TLabels()
        L = c.labelsByLang[lang]
        L = L.prefLabels if Pass == 0 else L.altLabels
        L.add(label); nLabels += 1
    if Pass == 0: nPrefLabels = nLabels
    else: nAltLabels = nLabels
for c in concepts.values():
    for lang, L in c.labelsByLang.items():
        L.prefLabels = list(sorted(L.prefLabels))
        L.altLabels = list(sorted(L.altLabels))
        if len(L.prefLabels) > 1: 
            print("Warning: %s has multiple preferred labels in %s: %s." % (repr(c.conceptUri), repr(lang), L.prefLabels))
            L.altLabels += L.prefLabels[1:]
            L.prefLabels = L.prefLabels[:1]
            L.altLabels = list(sorted(set(L.altLabels)))

print("%d concepts, %d with parents, %d links to related concepts, %d prefLabels, %d altLabels." % (
    len(concepts), nConceptsWithParents, nRelatedLinks, nPrefLabels, nAltLabels))

# TGraph represents our concepts as an undirected graph,
# with edges based on 'related' links and parent-child links.
class TGraph:
    __slots__ = ["uriToIdx", "neighLists", "nVerts", "idxToUri"]
    def AddEdge(self, uri1, uri2):
        idx1 = self.uriToIdx[uri1]; idx2 = self.uriToIdx[uri2]
        self.neighLists[idx1].append(idx2)
        self.neighLists[idx2].append(idx1)
    def __init__(self, concepts):
        self.uriToIdx = {}; self.idxToUri = []; 
        self.nVerts = 0; self.neighLists = []
        for conceptUri in sorted(concepts.keys()):
            c = concepts[conceptUri]
            assert c.conceptUri not in self.uriToIdx
            self.idxToUri.append(c.conceptUri)
            self.uriToIdx[c.conceptUri] = self.nVerts
            self.nVerts += 1; self.neighLists.append([])
        for c in concepts.values():
            if c.parentUri: self.AddEdge(c.conceptUri, c.parentUri)
            for relatedUri in c.relatedUris: self.AddEdge(c.conceptUri, relatedUri)
        nEdges = 0    
        for u in range(self.nVerts):
            L = list(set(self.neighLists[u])); self.neighLists[u] = L
            L.sort(); nEdges += len(L)
        print("%d vertices, %d edges." % (self.nVerts, nEdges))
    # Single-source shortest paths using breadth-first search.    
    def GetDistancesFrom(self, fromIdx):
        L = [-1] * self.nVerts
        queue = [fromIdx]; L[fromIdx] = 0; head = 0
        while head < len(queue):
            u = queue[head]; head += 1
            for v in self.neighLists[u]:
                if L[v] >= 0: continue
                L[v] = L[u] + 1; queue.append(v)
        #if self.idxToUri[fromIdx].endswith("/84"): print(L)        
        return L
    def GetDistanceMatrix(self):
        return [self.GetDistancesFrom(u) for u in range(self.nVerts)]

# Output a distance matrix in the format expected by the Wikifier.
g = TGraph(concepts)
print("Calculating the distance matrix.")
distMx = g.GetDistanceMatrix()
f = open("thesaurusDistanceMatrix.json", "wt")
json.dump({"columns": g.idxToUri, "index": g.idxToUri, "data": distMx}, f, separators=(",", ":"))
f.close()

# Saves the labels for one language in the format expected by the Wikifier.
def SaveLabels(concepts, lang, fileName):
    h = {}; nWithoutLabels = 0
    for c in concepts.values():
        labels = c.labelsByLang.get(lang, None)
        if not labels: continue
        obj = {}
        if labels.prefLabels: obj["prefLabel"] = labels.prefLabels[0]
        L = labels.prefLabels[1:] + labels.altLabels
        if L: obj["altLabel"] = L
        if not obj: continue
        h[c.conceptUri] = obj
    print("Language %s: %d/%d concepts had labels." % (repr(lang), len(h), len(concepts)))
    f = open(fileName, "wt")
    json.dump(h, f, indent = 4)
    f.close()

SaveLabels(concepts, "en", "englishLabels.json")
SaveLabels(concepts, "fr", "frenchLabels.json")
SaveLabels(concepts, "es", "spanishLabels.json")
SaveLabels(concepts, "it", "italianLabels.json")
