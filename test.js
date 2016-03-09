function moveToEnd(str, substr){

    var pos = str.indexOf(substr);
    if (pos == -1) return;

    str = str.replace(substr, "");
    if (str.indexOf(substr)>=0){
        str.replace(substr, "");
        str.replace(substr, "");
    }
    str += " "+substr;
    return str;
}

var str="eisige (f) Kälte";

str= moveToEnd(str, "(f) ");
console.log(str);