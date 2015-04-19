function test_GoogleHits() {
  function test( keywords ) {
    Logger.log( keywords + ' : ' + GoogleHits(keywords) );
  }

  test('googlehits');
  test('pizza');
  test('today\'s weather' );
}

function GoogleHits(keywords) {
  var target = "https://www.google.ca/search?q="+encodeURI(keywords);

  var pageTxt = UrlFetchApp.fetch(target).getContentText();
  var pageDoc = Xml.parse(pageTxt,true);
  var contentDiv = getDivById( pageDoc.getElement().body, 'resultStats' );
  return extractInteger( contentDiv.Text );
}

function extractInteger(str) {
  var num = "";
  var inNum = false;
  for(var i=0; i<str.length; i++) {
    var c = str.charAt(i);
    if (c>='0' && c<= '9') {
      if (!inNum) inNum = true;
      num += c;
    }
    else if (c !== ',') {
      if (inNum) break;
    }
  }
  return parseInt(num);
}