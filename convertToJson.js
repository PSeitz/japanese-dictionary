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


var entities_metadata = require("./entities_metadata");

console.time('parse xml');
var xmlDoc = libxmljs.parseXml(jmdict);
console.timeEnd('parse xml');

// var allVocabs = [];
// all entries
var entries = xmlDoc.find('//entry');

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


function getMeanings(xml_entry){
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

            if (_.contains(selectedLanguages, meaning.lang) || selectedLanguages == "all") {
                meanings.push(meaning);
            }
            
        }
    }
    return meanings;
}

function buildKanaMap(){

    console.time('getAllKana');
    service.kana_array = [];

    for (var i = 0; i < entries.length; i++) {
        var xml_entry = entries[i];
        var ent_seq = xml_entry.get('ent_seq').text();
        var kanas = xml_entry.find('r_ele//reb');
        for (var k = 0; k < kanas.length; k++) {
            var attr = kanas[k].attr("lang");

            if (_.contains(selectedLanguages, attr ? attr.value() : "eng") || selectedLanguages == "all") {

                var word = kanas[k].text();
                // word = word.replace(/ *\([^)]*\) */g, " ");
                // word = word.trim();
                // word = word.toLowerCase();

                // kanaMap[word] = true;
                service.kana_array.push({text: word, ent_seq: ent_seq, romaji: convertToRomaji(word) });

            }
        }
    }

    console.timeEnd('getAllKana');
    return service.kana_array;
}

function buildKanjiMap(){
    service.kanj_array = [];
    // var kanjis = xmlDoc.find('//entry//k_ele//keb');
    // var kanjiMap = {};
    var entries = xmlDoc.find('//entry');
    for (var i = 0; i < entries.length; i++) {
        var xml_entry = entries[i];
        var ent_seq = xml_entry.get('ent_seq').text();
        var kanjis = xml_entry.find('k_ele//keb');
        for (var k = 0; k < kanjis.length; k++) {
            var word = kanjis[k].text();
            // kanjiMap[word] = {text: kanjiMap[word], ent_seq: ent_seq};
            service.kanj_array.push({text: word, ent_seq: ent_seq});
        }
    }
    // service.kanj_array = _.values(kanjiMap);
    // service.kanj_array = _.keys(kanjiMap);
    return service.kanj_array;
}

function getAllMeanings(){
    console.time('getMeanings');
    var allLanguages = {};

    service.meaning_array = [];
    var entries = xmlDoc.find('//entry');
    for (var i = 0; i < entries.length; i++) {
        var xml_entry = entries[i];
        var ent_seq = xml_entry.get('ent_seq').text();
        var glosses_xml = xml_entry.find('sense//gloss');
        for (var j = 0; j < glosses_xml.length; j++) {
            var gloss_xml = glosses_xml[j];

            var lang = gloss_xml.attr("lang");
            lang = lang ? lang.value() : "eng";

            if (_.contains(selectedLanguages, lang) || selectedLanguages == "all") {
                // meanings.push(meaning);
                allLanguages[lang] = true;
                service.meaning_array.push({text: gloss_xml.text(), lang:lang, ent_seq: ent_seq});
            }

            // var meaningid = gloss_xml.text()+lang;
            // meanings[meaningid] = {
            //     text:gloss_xml.text(),
            //     lang:lang
            // };

        }
    }

    // var glosses_xml = xmlDoc.find('//entry//sense//gloss');
    // var meanings = {};
    // for (var j = 0; j < glosses_xml.length; j++) {
    //     var gloss_xml = glosses_xml[j];

    //     var lang = gloss_xml.attr("lang");
    //     lang = lang ? lang.value() : "eng";

    //     var meaningid = gloss_xml.text()+lang;
    //     meanings[meaningid] = {
    //         text:gloss_xml.text(),
    //         lang:lang
    //     };
    //     allLanguages[lang] = true;
    // }
    // service.meaning_array = _.values(meanings);
    service.allLanguages = _.keys(allLanguages);
    console.timeEnd('getMeanings');
    // service.meaning_array = _.keys(meanings);
    return service.meaning_array;
}

function getAllLanguages () {
    if (service.allLanguages) {
        return service.allLanguages;
    }
    getAllMeanings();
    return service.allLanguages;
}

// buildKanjiMap();
// buildKanaMap();
// getAllMeanings();



function buildDictionary(){
    console.time('Build Dictionary');
    var json_entries = [];
    // all entries
    var entries = xmlDoc.find('//entry');
    for (var i = 0; i < entries.length; i++) {
        var xml_entry = entries[i];
        // var ent_seq = xml_entry.get('ent_seq').text();
        var entry = {
            kanji:[], // {text: blub, commonness: 10} 
            kana:[], // {text: blub, commonness: 10, romaji: }    
            meanings:[
                //lang: ger, text: blubber, type: noun, etc.
            ]
        };
        entry.kanji = getKanjiKana(xml_entry, 'k_ele', 'keb', 'ke_pri'); // kanji
        entry.kana = getKanjiKana(xml_entry, 'r_ele', 'reb', 're_pri', true); //  kana/reading
        entry.meanings = getMeanings(xml_entry);
        json_entries.push(entry);
        // entry.japanese = [
        //     {
        //         useKana: false,
        //         kanji:"asd", // can be empty
        //         readings: [
        //             { "kana": "asd",
        //               "romaji": "jojo"}
        //             ],
        //         commonness: "asd"
        //     }
        // ]
    }
    console.timeEnd('Build Dictionary');
    service.json_entries = json_entries;
    return json_entries;
}


// Pretty Print
// fs.writeFileSync("jmdict.json", JSON.stringify(service.json_entries, null, 2), 'utf8');
// fs.writeFileSync("jmdict.json", JSON.stringify(service.json_entries), 'utf8');

service.getAllKana = buildKanaMap;
service.getAllKanji = buildKanjiMap;
service.getAllMeanings = getAllMeanings;
service.getAllLanguages = getAllLanguages;
module.exports = service;




