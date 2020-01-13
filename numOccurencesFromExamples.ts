import fs from 'fs';

console.time('ReadFile');
let examples = fs.readFileSync("examples.utf", "utf8")
    .split("\n")
    .filter(line => line.includes("B:"));
console.timeEnd('ReadFile');

const numOccurences: {[index:string]: number} = {};


for (var i = 0; i < examples.length; i++) {
    examples[i] = examples[i].substring(2, examples[i].length); // remove B:
    examples[i] = examples[i].replace(/ *\([^)]*\) */g, " "); // remove ( )
    examples[i] = examples[i].replace(/ *\{[^}]*\} */g, " "); // remove { }
    examples[i] = examples[i].replace(/ *\[[^\]]*\] */g, " ");// remove [ ] -> sense index
    examples[i] = examples[i].trim();
    examples[i] = examples[i].replace(/\s{2,}/g, ' ');// convert all spaces to single spaces
    let words = examples[i].split(" ");

    for (const word of words) {
        numOccurences[word] = numOccurences[word] ? numOccurences[word]+1 : 1 ;
    }
}

console.log(examples[0]);

// console.log(numOccurences["は"]);
// console.log(numOccurences["今日"]);
// console.log(numOccurences["今日は"]);

export function getMap(){
    return numOccurences;
};
