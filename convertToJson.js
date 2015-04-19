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

var allVocabs = [];
// all entries
var entries = xmlDoc.find('//entry');

var kanaMap = {};
var kana_array;


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
            kanji_kana.romaji = toTitleCase(hepburn.fromKana(kanji_kana_text));
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
        return _.map(sense_xml.find("pos"), function(value, index, collection){
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

// function buildKanaMap(){

//     var kanas = xmlDoc.find('//entry//r_ele//reb');

//     for (var k = 0; k < kanas.length; k++) {
//         var attr = kanas[k].attr("lang");

//         if (_.contains(selectedLanguages, attr ? attr.value() : "eng") || selectedLanguages == "all") {

//             var word = kanas[k].text();
//             word = word.replace(/ *\([^)]*\) */g, " ");
//             word = word.trim();
//             word = word.toLowerCase();

//             kanaMap[word] = true;
//         }
//     }

//     kana_array = _.keys(kanaMap);
//     for (var i = 0; i < kana_array.length; i++) {
//         kanaMap[kana_array[i]] = i;
//     }
// }

// buildKanaMap();

console.time('Build Dictionary');

function buildDictionary(){
    var json_entries = [];
    for (var i = 0; i < entries.length; i++) {
        var xml_entry = entries[i];
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
    return json_entries;
}
var json_entries = buildDictionary();

console.timeEnd('Build Dictionary');

// Pretty Print
fs.writeFileSync("jmdict.json", JSON.stringify(json_entries, null, 2), 'utf8');
// fs.writeFileSync("jmdict.json", JSON.stringify(json_entries), 'utf8');


module.exports = json_entries;




