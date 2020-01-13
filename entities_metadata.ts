import fs from 'fs';

const entities = fs.readFileSync("entities.xml", 'utf8')
    .split("\n")
    .map(value => {
        var short = value.substring(9, value.indexOf("\"")).trim();
        var long = value.substring(value.indexOf("\"")+1, value.length-2).trim();
        return {short:short, long:long};
    });

var entitiesMapLongShort: {[index:string]: string} = {};
var entitiesMap: {[index:string]: number} = {};
for (var i = 0; i < entities.length; i++) {
    var entityMapping = entities[i];
    // entitiesMap[entityMapping.short] = entityMapping.long;
    // entitiesMap[entityMapping.long] = entityMapping.short;
    entitiesMap[entityMapping.long] = i;
    entitiesMapLongShort[entityMapping.long] = entityMapping.short;
}

export function getEntitiesMap(){
    return entitiesMap;
};

// var indexMapLong = _.map(entities, "long");
// console.log(indexMapLong);

export function getEntitiesLongByIndex(index: number){
    return entities[index].long;
};

export function getEntityIndexForLongVersion(longVersion: string){
    return entitiesMap[longVersion];
};

export function getShortForLongVersion(longVersion: string){
    return entitiesMapLongShort[longVersion];
};
