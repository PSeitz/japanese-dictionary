var fs = require('fs');
var _ = require('lodash');
// var hepburn = require("hepburn");

console.time('ReadFile');
var examples = fs.readFileSync("examples.utf", "utf8");
console.timeEnd('ReadFile');

console.time('Split');
var examples = examples.split("\n");
console.timeEnd('Split');


var numOccurences = {};

var sentences = [];

for (var i = 0; i < examples.length; i+=2) {
    var sentence = {
        parts : []
    };


    
    var sentenceAParts = examples[i].substring(2, examples[i].length).split(/[\t#]+/)
        .map(Function.prototype.call, String.prototype.trim); // remove A: and split

    if (!examples[i+1]) {
        continue;
    }    
    var sentenceParts = examples[i+1].substring(2, examples[i+1].length); // remove B:
   
    sentence.jap = sentenceAParts[0];
    sentence.eng = sentenceAParts[1];
    sentence.id = sentenceAParts[2].substring(3);

    sentenceParts = sentenceParts.replace(/ *\[[^\]]*\] */g, " ");// remove [ ] -> sense index
    sentenceParts = sentenceParts.trim();
    sentenceParts = sentenceParts.replace(/\s{2,}/g, ' ');// convert all spaces to single spaces
    sentenceParts = sentenceParts.split(" ");
    sentenceParts.map(Function.prototype.call, String.prototype.trim);

    for (var j = 0; j < sentenceParts.length; j++) {
        var word = sentenceParts[j];

        var specifier = /\((.*?)\)/g.exec(word);
        var originalOccurence = /\{(.*?)\}/g.exec(word);
        originalOccurence = originalOccurence ? originalOccurence[1]: originalOccurence;

        var plainWord = word.replace(/ *\([^)]*\) */g, " "); // remove ( )
        plainWord = word.replace(/ *\{[^}]*\} */g, " "); // remove { }

        numOccurences[word] = numOccurences[word] ? numOccurences[word]+1 : 1 ;

        sentence.parts.push({
            plainWord:plainWord,
            specifier:specifier,
            originalOccurence:originalOccurence
        });
    }

    sentences.push(sentence);
}

console.log(sentences[0]);
console.log(sentences[0].parts[1].originalOccurence);
// console.log(numOccurences["は"]);
// console.log(numOccurences["今日"]);
// console.log(numOccurences["今日は"]);

var service = {};

service.getMap = function () {
    return numOccurences;
};

module.exports = service;