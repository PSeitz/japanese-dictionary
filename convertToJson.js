var fs = require('fs');
var libxmljs = require("libxmljs");
var yaml = require('js-yaml');
var _ = require('lodash');
var hepburn = require("hepburn");
var verbs = require('jp-conjugation');

var config;
try {
    config = yaml.safeLoad(fs.readFileSync('convert.yml', 'utf8'));
} catch (e) {
    console.log(e);
}

var service = {};



// var allLanguages = ["ger", "eng", "hun", "spa", "slv", "fre", "dut"];
var selectedLanguages = config.SelectedLanguages;// ["ger", "eng"];
console.log(selectedLanguages);
// var position_of_speech = fs.readFileSync("position_of_speech.csv", 'utf8');
// position_of_speech = position_of_speech.split("\n");
// position_of_speech = _.map(position_of_speech, function(value){
//     return value.split(";");
// });
// console.log(position_of_speech[0]);

var allVerbTypes = ["v5u", "v5k", "v5k-s", "v5g", "v5s", "v5t", "v5m", "v5b", "v5n", "v5r", "v5r-i", "v1"];

var numOccurences = require("./numOccurencesFromExamples");
var occurenceMap = numOccurences.getMap();

var entities_metadata = require("./entities_metadata");

// var allVocabs = [];
// all entries
// var entries = xmlDoc.find('//entry');

// Calc commonness for kanji and kana
function calculateCommonness(node, commonnessSelector){

    var flags_xml = node.find(commonnessSelector);
    if (!flags_xml) {
        return 0;
    }
    var flags = _.map(flags_xml, value => value.text());

    var value = _.sum(flags.map(flag => config.Commonness[flag]));

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
    var romaji = toTitleCase(hepburn.fromKana(str));
    romaji = romaji.replace(/["']/g, "");
    return romaji;
}

function getKanjiKana(xml_entry, selector, textSelector, commonnessSelector, addRomaji){
    var gatherEntryInfo = [];
    // var ent_seq = xml_entry.get('ent_seq').text();
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


function positionalArguments (xml, options) {
    var allPos = xml.find(".//pos");
    return _.map(allPos, function(value){
        if (options.onlyIndex) {
            return entities_metadata.getEntityIndexForLongVersion(value.text());
        }else if (options.shortVersion){
            return entities_metadata.getShortForLongVersion(value.text());
        }
        else{
            return value.text();
        }
    });
}

function getMeanings(xml_entry, options){
    var meanings = [];
    var senses_xml = xml_entry.find("sense");

    // function get 
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
        var pos = positionalArguments (sense_xml, {onlyIndex:false});
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

            if(meaning.text.indexOf("to ") === 0) meaning.text = meaning.text.substr(3);

            if ( (_.includes(selectedLanguages, meaning.lang) || selectedLanguages == "all") && meaning.text!== "") {
                meanings.push(meaning);
            }
        }
    }
    return meanings;
}


function normalize_text(text) {
    // text = text.replace(/ *\([^)]*\) */g, " ");
    text = text.replace(/\([fmn\d]\)/g, " ");
    text = text.replace(/[\(\)]/g, " ");
    text = text.replace(/"\[{}'"“/g, "");
    text = text.replace(/\s\s+/g, " ");
    if(text.indexOf("to ") === 0) text = text.substr(3);
    if(text.indexOf("der ") === 0) text = text.substr(4);
    if(text.indexOf("die ") === 0) text = text.substr(4);
    if(text.indexOf("das ") === 0) text = text.substr(4);
    return text.toLowerCase().trim();

    //         (Regex::new(r"\([fmn\d]\)").unwrap(), " "),
    //         (Regex::new(r"[\(\)]").unwrap(), " "),  // remove braces
    //         (Regex::new(r#"[{}'"“]"#).unwrap(), ""), // remove ' " {}
    //         (Regex::new(r"\s\s+").unwrap(), " "), // replace tabs, newlines, double spaces with single spaces
    //         (Regex::new(r"[,.…;・’-]").unwrap(), "")  // remove , .;・’-
    // let mut new_str = text.to_owned();
    // for ref tupl in &*REGEXES {
    //     new_str = (tupl.0).replace_all(&new_str, tupl.1).into_owned();
    // }

    // new_str.to_lowercase().trim().to_owned()

}




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

// function getText (elem) {
//     return elem.text();
// }


function addConjugations(verbTypes, entry){
    if (verbTypes.length>0) {
        // var conjugated  = [];
        for (var i = 0; i < verbTypes.length; i++) {
            var verbType = verbTypes[i];
            // var accessor = entry.useKana ? "kana" : "kanji";
            var elText, results, j;
            for (j = 0; j < entry.kana.length; j++) {
                elText = entry.kana[j].text;
                results = verbs.conjugate(elText, verbType);
                // conjugated = conjugated.concat(results);
                entry.kana[j].conjugated = results;
            }

            for (j = 0; j < entry.kanji.length; j++) {
                elText = entry.kanji[j].text;
                results = verbs.conjugate(elText, verbType);
                // conjugated = conjugated.concat(results);
                entry.kanji[j].conjugated = results;
            }

        }
        // entry.conjugated = conjugated;
    }

}


function getReadingsForKanji (xml_entry, kanji) {
    var readings = [];
    var kanasForEntry = xml_entry.find('r_ele');
    for (var i = 0; i < kanasForEntry.length; i++) {
        if(kanasForEntry[i].get("re_nokanji")) continue;

        var re_restr = kanasForEntry[i].find(".//re_restr");
        if (re_restr.length > 0) {
            re_restr = _.map(re_restr, function(value){
                return value.text();
            });
            if (re_restr.indexOf(kanji) === -1) {
                continue;
            }
        }
        readings.push(kanasForEntry[i].get("reb").text());
    }

    return readings;
}

function getDePosition(a){
    if (a.indexOf("1")>=0) return 1;
    if (a.indexOf("2")>=0) return 2;
    if (a.indexOf("3")>=0) return 3;
    if (a.indexOf("4")>=0) return 4;
    if (a.indexOf("5")>=0) return 5;
    if (a.indexOf("6")>=0) return 6;
}

function meaningsPrioSort(a, b) {
    var prio1 = 100;
    var prio2 = 100;
    if (getDePosition(a)) prio1 = getDePosition(a);
    if (getDePosition(b)) prio2 = getDePosition(a);

    return  prio1 - prio2;
}

function moveToEnd(str, substr){
    var pos = str.indexOf(substr);
    if (pos == -1) return str;

    str = str.replace(substr, "");
    if (str.indexOf(substr)>=0){ // multiple hits, remove all
        str.replace(substr, "");
        str.replace(substr, "");
    }else{
        str += " "+substr;
    }
    
    return str.trim();
}

function processMeanings(meanings) { /// WHAT????
    for (var i = 0; i < meanings.length; i++) {
        // meaning.text = meaning.text.replace(/ *\([^)]*\) */g, " ").trim();
        meanings[i].text = meanings[i].text.replace(/ *\([^fnm)]*\) */g, " ").trim();
        var hits = 0;
        if (meanings[i].text.indexOf("(f)")>=0) ++hits;
        if (meanings[i].text.indexOf("(n)")>=0) ++hits;
        if (meanings[i].text.indexOf("(m)")>=0) ++hits;

        if (hits >= 2) {
            // console.log(meanings[i].text);
            meanings[i].text = meanings[i].text.replace(/ *\([^)]*\) */g, " ").trim(); // remove all (f) (n) (m)
        }

        meanings[i].text = moveToEnd(meanings[i].text, '(f) ');
        meanings[i].text = moveToEnd(meanings[i].text, '(n) ');
        meanings[i].text = moveToEnd(meanings[i].text, '(m) ');
    }
}


function isVerbtype (entry) {
    return _.includes(allVerbTypes, entry);
}

var allMisc = {};

let deu_wordfreq = JSON.parse(fs.readFileSync('deu_wordfreq.json'))
let eng_wordfreq = JSON.parse(fs.readFileSync('eng_wordfreq.json'))

let deWords = {}
let engWords = {}

function buildDictionary(){
    console.time('Build Dictionary');

    console.time('readFile');
    var jmdict = fs.readFileSync("JMdict");
    // var jmdict = fs.readFileSync("example.xml");
    console.timeEnd('readFile');
    console.time('parse xml');
    var xmlDoc = libxmljs.parseXml(jmdict);
    console.timeEnd('parse xml'); 

    var json_entries = [];
    var allLanguages = {};
    // all entries
    var entries = xmlDoc.find('//entry');
    for (var i = 0; i < entries.length; i++) {
        var xml_entry = entries[i];
        var ent_seq = xml_entry.get('ent_seq').text();
        // var ent_seq = xml_entry.get('ent_seq').text();
        var entry = {
            pos:[],
            misc:[],
            kanji:[], // {text: blub, commonness: 10} 
            kana:[], // {text: blub, commonness: 10, romaji: }    
            meanings:{
                //ger:[blubber] // type: noun, etc. ??
            }
        };
        entry.ent_seq = ent_seq;
        // entry.kanji = getKanjiKana(xml_entry, 'k_ele', 'keb', 'ke_pri'); // kanji
        // entry.kana = getKanjiKana(xml_entry, 'r_ele', 'reb', 're_pri', true); //  kana/reading
        // entry.meanings = getMeanings(xml_entry);
        var j,k, commonness, word, num_occurences;
        let commonnessSum = 0
        
        // Kanji
        var kanji_block = xml_entry.find('k_ele');
        for (j = 0; j < kanji_block.length; j++) {
            commonness = calculateCommonness(kanji_block[j], 'ke_pri');
            var kanjis = kanji_block[j].find('keb');
            for (k = 0; k < kanjis.length; k++) {
                word = kanjis[k].text();
                if (word == "我慢") console.log("我慢: " + commonness)
                var numOccurences = occurenceMap[word] || 0;
                commonness += numOccurences
                // kanjiMap[word] = {text: kanjiMap[word], ent_seq: ent_seq};
                var kanji = {text: word, ent_seq: ent_seq, commonness:commonness};
                kanji.readings = getReadingsForKanji(xml_entry, kanji.text);
                commonnessSum+=commonness
                // console.log(kanji.readings);
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
                    num_occurences = occurenceMap[word];
                    commonness += num_occurences
                }
                commonnessSum+=commonness
                var kana = {text: word, ent_seq: ent_seq, romaji: convertToRomaji(word), commonness:commonness};
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
            // text = text.replace(/ *\([^)]*\) */g, " ").trim();
            if(text.indexOf("to ") === 0) text = text.substr(3);
            if (!text) continue;

            if (_.includes(selectedLanguages, lang || "eng") || selectedLanguages == "all") {
                allLanguages[lang] = true;
                // var meaning = {text: text, lang:lang, ent_seq: ent_seq};
                // entry.meanings.push(meaning);
                let normalized_text = normalize_text(text)
                entry.meanings[lang] = entry.meanings[lang] || []
                if (lang === 'ger') {
                    let deMeaning = {text:text}
                    if(getDePosition(text)) deMeaning.rank = getDePosition(text)
                    if (entry.meanings[lang].map(el => el.text).indexOf(text) === -1) entry.meanings[lang].push(deMeaning);

                    deWords[normalized_text] = deu_wordfreq[normalized_text] || 0
                }else{
                    if(entry.meanings[lang].indexOf(text) === -1) entry.meanings[lang].push(text);
                    engWords[normalized_text] = eng_wordfreq[normalized_text] || 0
                }
            }
        }

        if(entry.meanings.ger){
            // entry.meanings.ger.sort(meaningsPrioSort);
            processMeanings(entry.meanings.ger);
        }
        // if(entry.meanings.eng){
        //     entry.meanings.eng.sort(meaningsPrioSort);
        //     processMeanings(entry.meanings.eng);
        // }
        
        // if(ent_seq === '1262530'){
        //     console.log(entry.meanings);
        // }


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

        for (var p = 0; p < entry.misc.length; p++) {
            allMisc[entry.misc[p]] = true;
        }

        if (_.includes(entry.misc, "word usually written using kana alone")) entry.useKana = true;

        var posArgs = positionalArguments (xml_entry, {shortVersion:true});
        entry.pos = posArgs;
        var verbTypes = _.filter(posArgs, isVerbtype);
        addConjugations(verbTypes, entry);

        entry.commonness = commonnessSum || 0

        json_entries.push(entry);

    }

    console.log(json_entries.length);
    json_entries = _.filter(json_entries, function(entry) {
        return !_.includes(entry.misc, "archaism"); // "filter archaic words"
    });
    console.log(json_entries.length);
    console.timeEnd('Build Dictionary');
    service.allLanguages = _.keys(allLanguages);
    service.json_entries = json_entries;
    return json_entries;
}

buildDictionary();

// Pretty Print
fs.writeFileSync("jmdict.json", JSON.stringify(service.json_entries, null, 2), 'utf8');
fs.writeFileSync("deWords.json", JSON.stringify(key_value_to_array(deWords), null, 2));
fs.writeFileSync("engWords.json", JSON.stringify(key_value_to_array(engWords), null, 2));
// fs.writeFileSync("jmdict.json", JSON.stringify(service.json_entries), 'utf8');


function key_value_to_array(entries) {
    return Object.keys(entries).map(text => {
        if (entries[text] !== 0) return {text:text, commonness:entries[text]}
        return {text:text}
    })
}


function getKanjiReadings(){
    var collection = [];
    for (var i = 0; i < service.json_entries.length; i++) {
        var entry = service.json_entries[i];
        var kanjis = entry.kanji;
        for (var j = 0; j < kanjis.length; j++) {
            var kanji = kanjis[j];
            for (var k = 0; k < kanji.readings.length; k++) {
                collection.push({
                    kanji : kanji.text,
                    ent_seq : entry.ent_seq,
                    reading : kanji.readings[k]
                });
            }
        }
    }
    return collection;
}

function getAllKanaWithConjugations(){
    return getConjugations("kana");
}
function getAllKanjiWithConjugations(){
    return getConjugations("kanji");
}
function getConjugations(property){

    var elements = collect(property);
    console.time('Conjugations for :'+property);
    var collection = [];
    for (var j = 0; j < elements.length; j++) {
        var kanji_kana = elements[j];
        if (kanji_kana.conjugated && kanji_kana.conjugated.length>0) {
            for (var k = 0; k < kanji_kana.conjugated.length; k++) {
                collection.push({
                    stem:kanji_kana.text,
                    form:kanji_kana.conjugated[k].form,
                    name:kanji_kana.conjugated[k].name,
                });
            }
        }
    }
    console.timeEnd('Conjugations for :'+property);
    return collection;
}

function getAllKana(){
    return collect("kana");
}
function getAllKanji(){
    return collect("kanji");
}
function getAllMeanings(){
    return collect("meanings");
}

function collect(propName){
    var collection = [];
    for (var i = 0; i < service.json_entries.length; i++) {
        var entry = service.json_entries[i];
        collection.push.apply(collection, entry[propName]);
    }
    return collection;
}

function getAllMiscWithEntSeq(){
    var collection = [];
    for (var i = 0; i < service.json_entries.length; i++) {
        var entry = service.json_entries[i];
        for (var j = 0; j < entry.misc.length; j++) {
            collection.push({
                misc:entry.misc[j],
                ent_seq:entry.ent_seq
            });
        }
    }
    return collection;
}

function getAllPosWithEntSeq(){
    var collection = [];
    for (var i = 0; i < service.json_entries.length; i++) {
        var entry = service.json_entries[i];
        for (var j = 0; j < entry.pos.length; j++) {
            collection.push({
                pos:entry.pos[j],
                ent_seq:entry.ent_seq
            });
        }
    }
    return collection;
}



service.getAllMisc = function(){
    var arrMisc = [];
    for(var prop in allMisc){
        arrMisc.push(prop);
    }
    console.log(arrMisc);
    return arrMisc;
};


service.getAllPosWithEntSeq = getAllPosWithEntSeq;
service.getAllMiscWithEntSeq = getAllMiscWithEntSeq;
service.getKanjiReadings = getKanjiReadings;
service.getAllKanaWithConjugations = getAllKanaWithConjugations;
service.getAllKanjiWithConjugations = getAllKanjiWithConjugations;
service.getAllKana = getAllKana;
service.getAllKanji = getAllKanji;
service.getAllMeanings = getAllMeanings;
service.getAllLanguages = getAllLanguages;
module.exports = service;




