import fs from 'fs';
import libxmljs, { Element } from "libxmljs";
import _ from 'lodash';
// import hepburn from "hepburn";
import verbs from 'jp-conjugation';
import { toRomaji, isRomaji } from 'wanakana';

import * as numOccurences from "./numOccurencesFromExamples"
import * as entities_metadata from "./entities_metadata"


const config = 
{
    "Commonness": {
      "ichi1": 15,
      "ichi2": 5,
      "news1": 10,
      "news2": 5,
      "spec1": 15,
      "spec2": 5,
      "gai1": 10,
      "gai2": 5
    },
    // "allLanguages": [
    //   "ger",
    //   "eng",
    //   "hun",
    //   "spa",
    //   "slv",
    //   "fre",
    //   "dut"
    // ],
    "SelectedLanguages": [
      "ger",
      "eng"
    ],
    "PositionalArguments": true
} as const


type Language = OtherLanguage | GerLanguage

type GerLanguage = "ger"
type OtherLanguage = "eng"| "hun" | "spa" | "slv" | "fre" | "dut"

const allLanguages = new Set<string>()

const selectedLanguages: readonly Language[] | "all" = config.SelectedLanguages;// ["ger", "eng"];
console.log(selectedLanguages);
// const position_of_speech = fs.readFileSync("position_of_speech.csv", 'utf8');
// position_of_speech = position_of_speech.split("\n");
// position_of_speech = _.map(position_of_speech, function(value){
//     return value.split(";");
// });
// console.log(position_of_speech[0]);

const allVerbTypes = ["v5u", "v5k", "v5k-s", "v5g", "v5s", "v5t", "v5m", "v5b", "v5n", "v5r", "v5r-i", "v1"] as const;
type VerbType = typeof allVerbTypes[number];

// const numOccurences = require("./numOccurencesFromExamples");
const occurenceMap = numOccurences.getMap();


// const allVocabs = [];
// all entries
// const entries = xmlDoc.find('//entry');

// Calc commonness for kanji and kana
function calculateCommonness(node: Element, commonnessSelector: 'ke_pri' | 're_pri'){

    const flags_xml = node.find(commonnessSelector) as unknown as Element[];
    if (!flags_xml) {
        return 0;
    }
    const flags = _.map(flags_xml, value => value.text());

    let value = _.sum(flags.map(flag => (config.Commonness as any)[flag]));

    const nff_flag = _.find(flags, function(flag) {
        return flag.indexOf("nf") >= 0;
    });
    if (nff_flag) {
        const parsedNff_flag = parseInt(nff_flag.substring(2));

        if (parsedNff_flag < 10)
            value += 15;
        else if(parsedNff_flag < 20)
            value += 10;
        else if(parsedNff_flag < 30)
            value += 5;
    }



    return value;

}

function toTitleCase(str: string)
{
    return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
}

function convertToRomaji(str: string)
{
    let romaji = toTitleCase(toRomaji(str));
    // let romaji = toRomaji(str);
    romaji = romaji.replace(/["']/g, "");
    return romaji;
}

// function getKanjiKana(xml_entry, selector, textSelector, commonnessSelector, addRomaji){
//     const gatherEntryInfo = [];
//     // const ent_seq = xml_entry.get('ent_seq').text();
//     const kanjis_xml = xml_entry.find(selector);
//     for (let i = 0; i < kanjis_xml.length; i++) {
//         const kanji_xml = kanjis_xml[i];
//         const kanji_kana_text = kanji_xml.get(textSelector).text();
//         const kanji_kana = {
//             text: kanji_kana_text,
//             commonness : calculateCommonness(kanji_xml, commonnessSelector)
//         };
//         if (addRomaji) {
//             kanji_kana.romaji = convertToRomaji(kanji_kana_text);
//         }
//         gatherEntryInfo.push(kanji_kana);
//     }
//     return gatherEntryInfo;
// }

// function containsString(string, array){
//     return _.any(array, function(ele){
//         if (ele.indexOf(string) >= 0 )return true;
//         return false;
//     });
// }

function positionalArguments (xml: Element) {
    const allPos = xml.find(".//pos") as unknown as Element[];
    return allPos.map(value => entities_metadata.getShortForLongVersion(value.text()));
}

// function positionalArguments (xml: Element, options: { shortVersion: boolean; onlyIndex?: boolean; }) {
//     const allPos = xml.find(".//pos") as unknown as Element[];
//     return allPos.map(function(value){
//         if (options.onlyIndex) {
//             return entities_metadata.getEntityIndexForLongVersion(value.text());
//         }else if (options.shortVersion){
//             return entities_metadata.getShortForLongVersion(value.text());
//         }
//         else{
//             return value.text();
//         }
//     });
// }

// function getMeanings(xml_entry, options){
//     const meanings = [];
//     const senses_xml = xml_entry.find("sense");

//     // function get 
//     function getType (pos) {
//         if(containsString("noun", pos)) return "noun";
//         if(containsString("adverb", pos)) return "adverb";
//         if(containsString("verb", pos)) return "verb";
//         if(containsString("adjective", pos)) return "adjective";
//         return undefined;
//     }

//     for (const i = 0; i < senses_xml.length; i++) {
//         const sense_xml = senses_xml[i];
//         const glosses_xml = sense_xml.find("gloss");
//         const pos = positionalArguments (sense_xml, {onlyIndex:false});
//         for (const j = 0; j < glosses_xml.length; j++) {
//             const gloss_xml = glosses_xml[j];
//             const lang = gloss_xml.attr("lang");
//             const meaning = {
//                 lang: lang ? lang.value() : "eng",
//                 text : gloss_xml.text()
//             };
//             if (config.PositionalArguments) {
//                 meaning.pos = pos;
//                 meaning.type = getType(pos);
//             }

//             if (options && options.removeParentheses)
//                 meaning.text = meaning.text.replace(/ *\([^)]*\) */g, " ");

//             if(meaning.text.indexOf("to ") === 0) meaning.text = meaning.text.substr(3);

//             if ( (_.includes(selectedLanguages, meaning.lang) || selectedLanguages == "all") && meaning.text!== "") {
//                 meanings.push(meaning);
//             }
//         }
//     }
//     return meanings;
// }


function normalize_text(text: string) {
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




export function getAllLanguages () {
    if (allLanguages) {
        return allLanguages;
    }
    // getAllMeanings();
    return allLanguages;
}

// getAllKanji();
// getAllKana();
// getAllMeanings();

// function getText (elem) {
//     return elem.text();
// }


function addConjugations(verbTypes: VerbType[], entry: Entry){
    if (verbTypes.length>0) {
        for (const verbType of verbTypes) {
            for (const el of entry.kana) {
                const results = verbs.conjugate(el.text, verbType);
                // conjugated = conjugated.concat(results);
                el.conjugated = results;
            }

            for (const el of entry.kanji) {
                const results = verbs.conjugate(el.text, verbType);
                // conjugated = conjugated.concat(results);
                el.conjugated = results;
            }

        }
    }

}


function getReadingsForKanji (xml_entry: Element, kanji: string) {
    const readings = [];
    const kanasForEntry = xml_entry.find('r_ele') as unknown as Element[];
    for (const kana of kanasForEntry) {
        if(kana.get("re_nokanji")) continue;

        const re_restr = (kana.find(".//re_restr") as unknown as Element[])
            .map(v => v.text());
        if (re_restr.length > 0) {
            if (re_restr.indexOf(kanji) === -1) {
                continue;
            }
        }
        readings.push(kana.get("reb")!.text());
    }

    return readings;
}

function getDePosition(a: string){
    if (a.indexOf("1")>=0) return 1;
    if (a.indexOf("2")>=0) return 2;
    if (a.indexOf("3")>=0) return 3;
    if (a.indexOf("4")>=0) return 4;
    if (a.indexOf("5")>=0) return 5;
    if (a.indexOf("6")>=0) return 6;
}

// function meaningsPrioSort(a, b) {
//     const prio1 = 100;
//     const prio2 = 100;
//     if (getDePosition(a)) prio1 = getDePosition(a);
//     if (getDePosition(b)) prio2 = getDePosition(a);

//     return  prio1 - prio2;
// }

function moveToEnd(str: string, substr: string){
    const pos = str.indexOf(substr);
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

function processMeanings(meanings: IGerMeaning[]) { /// WHAT????
    for (const meaning of meanings) {
        // meaning.text = meaning.text.replace(/ *\([^)]*\) */g, " ").trim();
        meaning.text = meaning.text.replace(/ *\([^fnm)]*\) */g, " ").trim();
        let hits = 0;
        if (meaning.text.indexOf("(f)")>=0) ++hits;
        if (meaning.text.indexOf("(n)")>=0) ++hits;
        if (meaning.text.indexOf("(m)")>=0) ++hits;

        if (hits >= 2) {
            // console.log(meaning.text);
            meaning.text = meaning.text.replace(/ *\([^)]*\) */g, " ").trim(); // remove all (f) (n) (m)
        }

        meaning.text = moveToEnd(meaning.text, '(f) ');
        meaning.text = moveToEnd(meaning.text, '(n) ');
        meaning.text = moveToEnd(meaning.text, '(m) ');
    }
}


function isVerbtype (entry: any): entry is VerbType {
    return allVerbTypes.includes(entry);
}

const allMisc = new Set<string>();

// require('./wordfreq_english')
// require('./wordfreq_german')

const deu_wordfreq = JSON.parse(fs.readFileSync('deu_wordfreq.json', "utf8"))
const eng_wordfreq = JSON.parse(fs.readFileSync('eng_wordfreq.json', "utf8"))

let json_entries: Entry[]= []

let deWords: {[index: string]: number} = {
}
let engWords: {[index: string]: number} = {}

// interface Entry{
//     pos:string[],
//     misc:string[],
//     kanji:IKanji[], // {text: blub, commonness: 10} 
//     kana:IKana[], // {text: blub, commonness: 10, romaji: }    
//     meanings:{
//         //ger:[blubber] // type: noun, etc. ??
//     },
//     ent_seq: string
// }


export class Entry{
    commonness: number = 0;
    useKana?: boolean;
    pos:string[] = []
    misc:string[] = []
    kanji:IKanji[] = [] // {text: blub, commonness: 10} 
    kana:IKana[] = [] // {text: blub, commonness: 10, romaji: }    
    meanings:{
        [key in OtherLanguage]?: string[]
    } & {
        [key in GerLanguage]?: IGerMeaning[]
    }= {}
    constructor(public ent_seq: string){

    }
}

interface IGerMeaning{
    text: string,
    rank?: number
}

interface IKana{
    text:string
    romaji:string
    commonness: number
    conjugated?: { name: string; form: string; }[]
}
interface IKanji{
    text:string
    readings:string[]
    ent_seq: string
    commonness: number
    conjugated?: { name: string; form: string; }[]
}

function buildDictionary(){
    console.time('Build Dictionary');

    console.time('readFile');
    const jmdict = fs.readFileSync("JMdict", "utf8");
    // const jmdict = fs.readFileSync("example.xml");
    console.timeEnd('readFile');
    console.time('parse xml');
    const xmlDoc = libxmljs.parseXml(jmdict);
    console.timeEnd('parse xml'); 

    // all entries
    const entries = xmlDoc.find('//entry');
    for (const xml_entry of entries) {
        const ent_seq = xml_entry.get('ent_seq')!.text();
        // const ent_seq = xml_entry.get('ent_seq').text();
        const entry: Entry = new Entry(ent_seq);
        // entry.kanji = getKanjiKana(xml_entry, 'k_ele', 'keb', 'ke_pri'); // kanji
        // entry.kana = getKanjiKana(xml_entry, 'r_ele', 'reb', 're_pri', true); //  kana/reading
        // entry.meanings = getMeanings(xml_entry);
        let commonnessSum = 0
        
        // Kanji
        const kanjis_xml = xml_entry.find('k_ele') as unknown as Element[];
        for (const kanji_xml of kanjis_xml) {
            let commonness = calculateCommonness(kanji_xml, 'ke_pri');
            const kanjis = kanji_xml.find('keb') as unknown as Element[];;
            for (let k = 0; k < kanjis.length; k++) {
                const word = kanjis[k].text();
                if (word == "我慢") console.log("我慢: " + commonness)
                const numOccurences = occurenceMap[word] || 0;
                commonness += numOccurences
                // kanjiMap[word] = {text: kanjiMap[word], ent_seq: ent_seq};
                const kanji: IKanji = {
                    text: word, 
                    ent_seq: ent_seq, 
                    commonness:commonness,
                    readings: getReadingsForKanji(xml_entry, word)
                };
                commonnessSum+=commonness
                // console.log(kanji.readings);
                entry.kanji.push(kanji);
            }
        }

        // Kana
        const kanas_xml = xml_entry.find('r_ele') as unknown as Element[];
        for (let j = 0; j < kanas_xml.length; j++) {
            const kana_xml = kanas_xml[j]
            let commonness = calculateCommonness(kana_xml, 're_pri');
            const kanas = kana_xml.find('reb') as unknown as Element[];;
            for (const kana_xml of kanas) {
                const word = kana_xml.text();
                let num_occurences = 0;
                if (kanjis_xml.length === 0 && j === 0) {
                    num_occurences = occurenceMap[word];
                    commonness += num_occurences
                }
                commonnessSum+=commonness
                const kana = {text: word, ent_seq: ent_seq, romaji: convertToRomaji(word), commonness:commonness};
                entry.kana.push(kana);
            }
        }

        

        // meaning
        const glosses_xml = xml_entry.find('sense//gloss') as unknown as Element[];
        for (const gloss_xml of glosses_xml) {

            const lang = gloss_xml.attr("lang")?.value() as Language ?? "eng";
            let text = gloss_xml.text();
            if(text.indexOf("to ") === 0) text = text.substr(3);
            if(!text) continue;

            if (_.includes(selectedLanguages, lang || "eng") || selectedLanguages == "all") {
                allLanguages.add(lang);
                // const meaning = {text: text, lang:lang, ent_seq: ent_seq};
                // entry.meanings.push(meaning);
                let normalized_text = normalize_text(text)
                
                if (lang === 'ger') {
                    const meanings = entry.meanings[lang] = entry.meanings[lang] || []
                    let deMeaning: IGerMeaning = {text:text}
                    if(getDePosition(text)) deMeaning.rank = getDePosition(text)
                    if (meanings.map(el => el.text).indexOf(text) === -1) meanings.push(deMeaning);

                    deWords[normalized_text] = deu_wordfreq[normalized_text] || 0
                }else{
                    const meanings = entry.meanings[lang] = entry.meanings[lang] || []
                    if(meanings.indexOf(text) === -1) meanings.push(text);
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
        const senses = xml_entry.find('sense') as unknown as Element[];
        if (senses.length >= 1) {
            entry.misc = (senses[0].find('misc') as unknown as Element[]).map(elem => elem.text())
            if (senses.length > 1) {
                for (let l = 1; l < senses.length; l++) {
                    const miscs =  (senses[l].find('misc') as unknown as Element[]).map(elem => elem.text())
                    entry.misc = _.intersection(entry.misc, miscs);
                }
            }
        }

        entry.misc.forEach(m => allMisc.add(m))

        if (_.includes(entry.misc, "word usually written using kana alone")) entry.useKana = true;

        const posArgs = positionalArguments (xml_entry);
        entry.pos = posArgs;
        const verbTypes = posArgs.filter(isVerbtype);
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
    return json_entries;
}

buildDictionary();

// Pretty Print
fs.writeFileSync("jmdict.json", JSON.stringify(json_entries, null, 2), 'utf8');
fs.writeFileSync("deWords.json", JSON.stringify(key_value_to_array(deWords), null, 2));
fs.writeFileSync("engWords.json", JSON.stringify(key_value_to_array(engWords), null, 2));
// fs.writeFileSync("jmdict.json", JSON.stringify(json_entries), 'utf8');


function key_value_to_array(entries: { [x: string]: number; }) {
    return Object.keys(entries).map(text => {
        if (entries[text] !== 0) return {text:text, commonness:entries[text]}
        return {text:text}
    })
}


export function getKanjiReadings(){
    const collection = [];
    for (const entry of json_entries){
        const kanjis = entry.kanji;
        for (const kanji of kanjis) {
            for (const kanji_reading of kanji.readings) {
                collection.push({
                    kanji : kanji.text,
                    ent_seq : entry.ent_seq,
                    reading : kanji_reading
                });
            }
        }
    }
    return collection;
}

// export function getAllKanaWithConjugations(){
//     return getConjugations("kana");
// }
// export function getAllKanjiWithConjugations(){
//     return getConjugations("kanji");
// }
// function getConjugations(property: "kana" | "kanji"){

//     const elements = collect(property);
//     console.time('Conjugations for :'+property);
//     const collection = [];
//     for (const kanji_kana of elements) {
//         if (kanji_kana.conjugated && kanji_kana.conjugated.length>0) {
//             for (const k = 0; k < kanji_kana.conjugated.length; k++) {
//                 collection.push({
//                     stem:kanji_kana.text,
//                     form:kanji_kana.conjugated[k].form,
//                     name:kanji_kana.conjugated[k].name,
//                 });
//             }
//         }
//     }
//     console.timeEnd('Conjugations for :'+property);
//     return collection;
// }

// export function getAllKana(){
//     return collect("kana");
// }
// export function getAllKanji(){
//     return collect("kanji");
// }
// export function getAllMeanings(){
//     return collect("meanings");
// }

// function collect(propName: "kana" | "kanji" | "meanings" ){
//     const collection: any[] = [];
//     for (const entry of json_entries) {
//         collection.push.apply(collection, entry[propName]);
//     }
//     return collection;
// }

export function getAllMiscWithEntSeq(){
    const collection = [];
    for (const entry of json_entries) {
        for (const misc of entry.misc) {
            collection.push({
                misc:misc,
                ent_seq:entry.ent_seq
            });
        }
    }
    return collection;
}

export function getAllPosWithEntSeq(){
    const collection = [];
    for (const entry of json_entries) {
        for (const pos of entry.pos) {
            collection.push({
                pos,
                ent_seq:entry.ent_seq
            });
        }
    }
    return collection;
}



export function getAllMisc(){
    const arrMisc = [];
    for(const prop in allMisc){
        arrMisc.push(prop);
    }
    console.log(arrMisc);
    return arrMisc;
};
