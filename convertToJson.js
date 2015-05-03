var fs = require('fs');
var libxmljs = require("libxmljs");
var yaml = require('js-yaml');
var _ = require('lodash');
var hepburn = require("hepburn");

var config;
try {
    config = yaml.safeLoad(fs.readFileSync('convert.yml', 'utf8'));
} catch (e) {
    console.log(e);
}

var service = {};

console.time('readFile');
var jmdict = fs.readFileSync("JMdict");
// var jmdict = fs.readFileSync("example.xml");
console.timeEnd('readFile');

// var allLanguages = ["ger", "eng", "hun", "spa", "slv", "fre", "dut"];
var selectedLanguages = config.SelectedLanguages;// ["ger", "eng"];
console.log(selectedLanguages);
// var position_of_speech = fs.readFileSync("position_of_speech.csv", 'utf8');
// position_of_speech = position_of_speech.split("\n");
// position_of_speech = _.map(position_of_speech, function(value){
//     return value.split(";");
// });
// console.log(position_of_speech[0]);

var numOccurences = require("./numOccurencesFromExamples");
var occurenceMap = numOccurences.getMap();

var entities_metadata = require("./entities_metadata");

console.time('parse xml');
var xmlDoc = libxmljs.parseXml(jmdict);
console.timeEnd('parse xml');

// var allVocabs = [];
// all entries
// var entries = xmlDoc.find('//entry');

// Calc commonness for kanji and kana
function calculateCommonness(node, commonnessSelector){

    var flags_xml = node.find(commonnessSelector);
    if (!flags_xml) {
        return 0;
    }
    var flags = _.map(flags_xml, function(value){
        return value.text();
    });

    var value = _.sum(flags, function(flag) {
        return config.Commonness[flag];
    });

    var nff_flag = _.find(flags, function(flag) {
        return flag.indexOf("nf") >= 0;
    });
    if (nff_flag) nff_flag = nff_flag.substring(2);

    if (nff_flag < 10)
        value += 15;
    else if(nff_flag < 20)
        value += 10;
    else if(nff_flag < 30)
        value += 5;

    return value;

}

function toTitleCase(str)
{
    return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
}

function convertToRomaji(str)
{
    return toTitleCase(hepburn.fromKana(str));
}

function getKanjiKana(xml_entry, selector, textSelector, commonnessSelector, addRomaji){
    var gatherEntryInfo = [];
    var ent_seq = xml_entry.get('ent_seq').text();
    var kanjis_xml = xml_entry.find(selector);
    for (var i = 0; i < kanjis_xml.length; i++) {
        var kanji_xml = kanjis_xml[i];
        var kanji_kana_text = kanji_xml.get(textSelector).text();
        var kanji_kana = {
            text: kanji_kana_text,
            commonness : calculateCommonness(kanji_xml, commonnessSelector)
        };
        if (addRomaji) {
            kanji_kana.romaji = convertToRomaji(kanji_kana_text);
        }
        gatherEntryInfo.push(kanji_kana);
    }
    return gatherEntryInfo;
}

function containsString(string, array){
    return _.any(array, function(ele){
        if (ele.indexOf(string) >= 0 )return true;
        return false;
    });
}


function getMeanings(xml_entry, options){
    var meanings = [];
    var senses_xml = xml_entry.find("sense");

    // function get 
    function positionalArguments (sense_xml, onlyIndex) {
        return _.map(sense_xml.find("pos"), function(value){
            if (onlyIndex) {
                return entities_metadata.getEntityIndexWithLong(value.text());
            }else{
                return value.text();
            }

        });
    }
    
    function getType (pos) {
        if(containsString("noun", pos)) return "noun";
        if(containsString("adverb", pos)) return "adverb";
        if(containsString("verb", pos)) return "verb";
        if(containsString("adjective", pos)) return "adjective";
        return undefined;
    }

    for (var i = 0; i < senses_xml.length; i++) {
        var sense_xml = senses_xml[i];
        var glosses_xml = sense_xml.find("gloss");
        var pos = positionalArguments (sense_xml, false);
        for (var j = 0; j < glosses_xml.length; j++) {
            var gloss_xml = glosses_xml[j];
            var lang = gloss_xml.attr("lang");
            var meaning = {
                lang: lang ? lang.value() : "eng",
                text : gloss_xml.text()
            };
            if (config.PositionalArguments) {
                meaning.pos = pos;
                meaning.type = getType(pos);
            }

            if (options && options.removeParentheses)
                meaning.text = meaning.text.replace(/ *\([^)]*\) */g, " ");

            if ( (_.contains(selectedLanguages, meaning.lang) || selectedLanguages == "all") && meaning.text!== "") {
                meanings.push(meaning);
            }
            
        }
    }
    return meanings;
}

// function getAllKana(){

//     console.time('getAllKana');
//     service.kana_array = [];

//     for (var i = 0; i < entries.length; i++) {
//         var xml_entry = entries[i];
//         var ent_seq = xml_entry.get('ent_seq').text();
        
//         var kannji_block = xml_entry.find('k_ele');
//         var kana_block = xml_entry.find('r_ele');
//         for (var j = 0; j < kana_block.length; j++) {
            
//             var commonness = calculateCommonness(kana_block[j], 're_pri');
//             var kanas = kana_block[j].find('reb');
//             for (var k = 0; k < kanas.length; k++) {
//                 var attr = kanas[k].attr("lang");

//                 if (_.contains(selectedLanguages, attr ? attr.value() : "eng") || selectedLanguages == "all") {

//                     var word = kanas[k].text();
//                     // var num_occurences = 0;
//                     // if(occurenceMap[word]) num_occurences = occurenceMap[word];
//                     // word = word.replace(/ *\([^)]*\) */g, " ");
//                     // word = word.trim();
//                     // word = word.toLowerCase();
//                     var num_occurences = 0;
//                     if (kannji_block.length === 0 && k === 0) {
//                         num_occurences = occurenceMap[word] + commonness;
//                     }
                    
//                     // kanaMap[word] = true;
//                     service.kana_array.push({text: word, ent_seq: ent_seq, romaji: convertToRomaji(word), commonness:commonness, num_occurences:num_occurences});

//                 }
//             }
//         }
//     }

//     console.timeEnd('getAllKana');
//     return service.kana_array;
// }

// function getAllKanji(){
//     service.kanj_array = [];
//     // var kanjis = xmlDoc.find('//entry//k_ele//keb');
//     // var kanjiMap = {};
//     var entries = xmlDoc.find('//entry');
//     for (var i = 0; i < entries.length; i++) {
//         var xml_entry = entries[i];
//         var ent_seq = xml_entry.get('ent_seq').text();
//         var kanji_block = xml_entry.find('k_ele');
//         for (var j = 0; j < kanji_block.length; j++) {
            
//             var commonness = calculateCommonness(kanji_block[j], 'ke_pri');
//             var kanjis = kanji_block[j].find('keb');
//             for (var k = 0; k < kanjis.length; k++) {
//                 var word = kanjis[k].text();
//                 // kanjiMap[word] = {text: kanjiMap[word], ent_seq: ent_seq};
//                 service.kanj_array.push({text: word, ent_seq: ent_seq, commonness:commonness, num_occurences:occurenceMap[word] || 0});
//             }
//         }
//     }
//     // service.kanj_array = _.values(kanjiMap);
//     // service.kanj_array = _.keys(kanjiMap);
//     return service.kanj_array;
// }

// function getAllMeanings(options){
//     console.time('getMeanings');
//     var allLanguages = {};

//     // if (service.meaning_array) return service.meaning_array;

//     service.meaning_array = [];
//     var entries = xmlDoc.find('//entry');
//     for (var i = 0; i < entries.length; i++) {
//         var xml_entry = entries[i];
//         var ent_seq = xml_entry.get('ent_seq').text();
//         var glosses_xml = xml_entry.find('sense//gloss');
//         for (var j = 0; j < glosses_xml.length; j++) {
//             var gloss_xml = glosses_xml[j];

//             var lang = gloss_xml.attr("lang");
//             lang = lang ? lang.value() : "eng";

//             var text = gloss_xml.text();

//             if (options && options.removeParentheses)
//                 text = text.replace(/ *\([^)]*\) */g, " ").trim();

//             if (_.contains(selectedLanguages, lang) || selectedLanguages == "all") {
//                 // meanings.push(meaning);
//                 allLanguages[lang] = true;
//                 service.meaning_array.push({text: text, lang:lang, ent_seq: ent_seq});
//             }
//         }
//     }

//     service.allLanguages = _.keys(allLanguages);
//     console.timeEnd('getMeanings');
//     // service.meaning_array = _.keys(meanings);
//     return service.meaning_array;
// }

function getAllLanguages () {
    if (service.allLanguages) {
        return service.allLanguages;
    }
    getAllMeanings();
    return service.allLanguages;
}

// getAllKanji();
// getAllKana();
// getAllMeanings();

function getText (elem) {
    return elem.text();
}


function buildDictionary(){
    console.time('Build Dictionary');
    var json_entries = [];
    var allLanguages = {};
    // all entries
    var entries = xmlDoc.find('//entry');
    for (var i = 0; i < entries.length; i++) {
        var xml_entry = entries[i];
        var ent_seq = xml_entry.get('ent_seq').text();
        // var ent_seq = xml_entry.get('ent_seq').text();
        var entry = {
            misc:[],
            kanji:[], // {text: blub, commonness: 10} 
            kana:[], // {text: blub, commonness: 10, romaji: }    
            meanings:[
                //lang: ger, text: blubber, type: noun, etc.
            ]
        };
        // entry.kanji = getKanjiKana(xml_entry, 'k_ele', 'keb', 'ke_pri'); // kanji
        // entry.kana = getKanjiKana(xml_entry, 'r_ele', 'reb', 're_pri', true); //  kana/reading
        // entry.meanings = getMeanings(xml_entry);
        var j,k, commonness, word, num_occurences;

        
        // Kanji
        var kanji_block = xml_entry.find('k_ele');
        for (j = 0; j < kanji_block.length; j++) {
            commonness = calculateCommonness(kanji_block[j], 'ke_pri');
            var kanjis = kanji_block[j].find('keb');
            for (k = 0; k < kanjis.length; k++) {
                word = kanjis[k].text();
                num_occurences = occurenceMap[word] + commonness;
                // kanjiMap[word] = {text: kanjiMap[word], ent_seq: ent_seq};
                var kanji = {text: word, ent_seq: ent_seq, commonness:commonness, num_occurences:num_occurences};
                entry.kanji.push(kanji);
            }
        }

        // Kana
        var kana_block = xml_entry.find('r_ele');
        for (j = 0; j < kana_block.length; j++) {
            commonness = calculateCommonness(kana_block[j], 're_pri');
            var kanas = kana_block[j].find('reb');
            for (k = 0; k < kanas.length; k++) {
                word = kanas[k].text();
                num_occurences = 0;
                if (kanji_block.length === 0 && j === 0) {
                    num_occurences = occurenceMap[word] + commonness;
                }
                var kana = {text: word, ent_seq: ent_seq, romaji: convertToRomaji(word), commonness:commonness, num_occurences:num_occurences};
                entry.kana.push(kana);
            }
        }

        // meaning
        var glosses_xml = xml_entry.find('sense//gloss');
        for (j = 0; j < glosses_xml.length; j++) {
            var gloss_xml = glosses_xml[j];

            var lang = gloss_xml.attr("lang") ? gloss_xml.attr("lang").value() : "eng";
            var text = gloss_xml.text();
            // if (options && options.removeParentheses)
            text = text.replace(/ *\([^)]*\) */g, " ").trim();
            if (!text) continue;

            if (_.contains(selectedLanguages, lang || "eng") || selectedLanguages == "all") {
                allLanguages[lang] = true;
                var meaning = {text: text, lang:lang, ent_seq: ent_seq};
                entry.meanings.push(meaning);
            }

        }

        // Merge misc into entry
        var senses = xml_entry.find('sense');
        if (senses.length >= 1) {
            entry.misc = _.map(senses[0].find('misc'), function(elem){ return elem.text(); });
            if (senses.length > 1) {
                for (var l = 1; l < senses.length; l++) {
                    var miscs =  _.map(senses[l].find('misc'), function(elem){ return elem.text(); });
                    entry.misc = _.intersection(entry.misc, miscs);
                }
            }

        }

        if (_.contains(entry.misc, "word usually written using kana alone")) entry.useKana = true;

        json_entries.push(entry);

    }

    console.log(json_entries.length);
    json_entries = _.filter(json_entries, function(entry) {
        return !_.contains(entry.misc, "archaism"); // "word usually written using kana alone"
    });
    console.log(json_entries.length);
    console.timeEnd('Build Dictionary');
    service.allLanguages = _.keys(allLanguages);
    service.json_entries = json_entries;
    return json_entries;
}

buildDictionary();


// Pretty Print
// fs.writeFileSync("jmdict.json", JSON.stringify(service.json_entries, null, 2), 'utf8');
// fs.writeFileSync("jmdict.json", JSON.stringify(service.json_entries), 'utf8');

function getAllKana(){
    var collection = [];
    for (var i = 0; i < service.json_entries.length; i++) {
        var entry = service.json_entries[i];
        collection.push.apply(collection, entry.kana);
    }
    return collection;
}

function getAllKanji(){
    var collection = [];
    for (var i = 0; i < service.json_entries.length; i++) {
        var entry = service.json_entries[i];
        collection.push.apply(collection, entry.kanji);
    }
    return collection;

}

function getAllMeanings(){
    var collection = [];
    for (var i = 0; i < service.json_entries.length; i++) {
        var entry = service.json_entries[i];
        collection.push.apply(collection, entry.meanings);
    }
    return collection;

}

service.getAllKana = getAllKana;
service.getAllKanji = getAllKanji;
service.getAllMeanings = getAllMeanings;
service.getAllLanguages = getAllLanguages;
module.exports = service;




