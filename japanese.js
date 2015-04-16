var fs = require('fs');
var path = require("path");
var libxmljs = require("libxmljs");

console.time('readFile');
var jmdict = fs.readFileSync("JMdict");
console.timeEnd('readFile');

console.time('parse xml');
var xmlDoc = libxmljs.parseXml(jmdict);
console.timeEnd('parse xml');

console.time('Load Dictionary');
var allWords = require("./lookupdict.json");
console.timeEnd('Load Dictionary');

// all entries
var entries = xmlDoc.find('//entry');

// var entry = entries[1001];
// console.log(entry.text().toLowerCase());
// console.log(entry.path());
// var firstGloss = entry.find('sense')[0].find('gloss');
// console.log(firstGloss[1].attr("lang").value());
// console.log(entry.find('sense//gloss')[0].find("attribute::*"));
// console.log(entry.find("xmlns:gloss")[0].text());

function getSynonymGroups(word){
    word = word.toLowerCase();
    if (allWords[word]) {
    	var hits = [];
    	for (var i = 0; i < allWords[word].length; i++) {
    		var indexPos = allWords[word][i];
    		hits.push(entries[indexPos]);
    		console.log(entries[indexPos].toString());
    	}
    	
    	return hits;
    }
    return undefined;
}

function getAllSynonyms(word){
    word = word.toLowerCase();
    var lines = getSynonymGroups(word);
    var merged = [];
    merged = merged.concat.apply(merged, lines);
    return merged;
}

function isSynonym(word1, word2){
    word1 = word1.toLowerCase();
    word2 = word2.toLowerCase();
    var lines = getSynonymGroups(word1);
    if (!lines) 
        return false;
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        for (var j = 0; j < line.length; j++) {
            var lineWord = line[j];
            if(lineWord == word2) return true;
        }
    }
    return false;
}

getSynonymGroups("reich");
// console.log(allWords.reich);

var service = {};
service.allWords = allWords;
service.getSynonymGroups = getSynonymGroups;
service.isSynonym = isSynonym;
service.getAllSynonyms = getAllSynonyms;

module.exports = service;