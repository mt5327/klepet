function divElementEnostavniTekst(sporocilo) {
  var jeSmesko = sporocilo.indexOf('http://sandbox.lavbic.net/teaching/OIS/gradivo/') > -1;
  var jeSlika = sporocilo.indexOf('class=slika') > -1;
  var jeYouTube = new RegExp(/https:\/\/www\.youtube\.com\/embed\/\S{11}?/);
  if (jeSmesko || jeSlika || jeYouTube.test(sporocilo)) {
    sporocilo = sporocilo.replace(/\</g, '&lt;').replace(/\>/g, '&gt;').replace(/&lt;br&gt;&lt;img/g, '<br><img').replace(/\/&gt;/g, '/>')
    .replace(/&lt;br&gt;&lt;iframe/g, '<br><iframe').replace(/&gt;&lt;\/iframe&gt;/g, '></iframe>');
    return $('<div style="font-weight: bold"></div>').html(sporocilo);
  } else {
    return $('<div style="font-weight: bold;"></div>').text(sporocilo);
  }
}

function divElementHtmlTekst(sporocilo) {
  return $('<div></div>').html('<i>' + sporocilo + '</i>');
}

function procesirajVnosUporabnika(klepetApp, socket) {
  var sporocilo = $('#poslji-sporocilo').val();
  sporocilo = dodajSmeske(sporocilo);
  sporocilo = dodajSlike(sporocilo);
  sporocilo = dodajVidee(sporocilo);
  var sistemskoSporocilo;

  if (sporocilo.charAt(0) == '/') {
    sistemskoSporocilo = klepetApp.procesirajUkaz(sporocilo);
    if (sistemskoSporocilo) {
      $('#sporocila').append(divElementHtmlTekst(sistemskoSporocilo));
    }
  } else {
    sporocilo = filtirirajVulgarneBesede(sporocilo);
    klepetApp.posljiSporocilo(trenutniKanal, sporocilo);
    $('#sporocila').append(divElementEnostavniTekst(sporocilo));
    $('#sporocila').scrollTop($('#sporocila').prop('scrollHeight'));
  }

  $('#poslji-sporocilo').val('');
}

var socket = io.connect();
var trenutniVzdevek = "", trenutniKanal = "";

var vulgarneBesede = [];
$.get('/swearWords.txt', function(podatki) {
  vulgarneBesede = podatki.split('\r\n');
});

function filtirirajVulgarneBesede(vhod) {
  for (var i in vulgarneBesede) {
    vhod = vhod.replace(new RegExp('\\b' + vulgarneBesede[i] + '\\b', 'gi'), function() {
      var zamenjava = "";
      for (var j=0; j < vulgarneBesede[i].length; j++)
        zamenjava = zamenjava + "*";
      return zamenjava;
    });
  }
  return vhod;
}

$(document).ready(function() {
  var klepetApp = new Klepet(socket);

  socket.on('vzdevekSpremembaOdgovor', function(rezultat) {
    var sporocilo;
    if (rezultat.uspesno) {
      trenutniVzdevek = rezultat.vzdevek;
      $('#kanal').text(trenutniVzdevek + " @ " + trenutniKanal);
      sporocilo = 'Prijavljen si kot ' + rezultat.vzdevek + '.';
    } else {
      sporocilo = rezultat.sporocilo;
    }
    $('#sporocila').append(divElementHtmlTekst(sporocilo));
  });

  socket.on('pridruzitevOdgovor', function(rezultat) {
    trenutniKanal = rezultat.kanal;
    $('#kanal').text(trenutniVzdevek + " @ " + trenutniKanal);
    $('#sporocila').append(divElementHtmlTekst('Sprememba kanala.'));
  });
  
  socket.on('dregljaj', function(dregljaj) {
    $('#vsebina').jrumble();
    $('#vsebina').trigger('startRumble');
    setTimeout(function() { 
      $('#vsebina').trigger('stopRumble'); 
    }, 1500);
  });

  socket.on('obvestilo', function (sporocilo) {
    var novElement = divElementHtmlTekst(sporocilo.besedilo);
    $('#sporocila').append(novElement);
  });

  socket.on('sporocilo', function (sporocilo) {
    var novElement = divElementEnostavniTekst(sporocilo.besedilo);
    $('#sporocila').append(novElement);
  });
  
  socket.on('kanali', function(kanali) {
    $('#seznam-kanalov').empty();

    for(var kanal in kanali) {
      kanal = kanal.substring(1, kanal.length);
      if (kanal != '') {
        $('#seznam-kanalov').append(divElementEnostavniTekst(kanal));
      }
    }
    
    $('#seznam-kanalov div').click(function() {
      klepetApp.procesirajUkaz('/pridruzitev ' + $(this).text());
      $('#poslji-sporocilo').focus();
    });
  });
  
  socket.on('uporabniki', function(uporabniki) {
    $('#seznam-uporabnikov').empty();
    
    for (var i=0; i < uporabniki.length; i++) {
      $('#seznam-uporabnikov').append(divElementEnostavniTekst(uporabniki[i]));
    }
    
    $('#seznam-uporabnikov div').click(function() {
      $('#poslji-sporocilo').val('/zasebno ' + '\"' + $(this).text() + '\"' + ' \"');
      $('#poslji-sporocilo').focus();
    });
  });

  setInterval(function() {
    socket.emit('kanali');
    socket.emit('uporabniki', {kanal: trenutniKanal});
  }, 1000);

  $('#poslji-sporocilo').focus();

  $('#poslji-obrazec').submit(function() {
    procesirajVnosUporabnika(klepetApp, socket);
    return false;
  });
  
});

function dodajSmeske(vhodnoBesedilo) {
  var preslikovalnaTabela = {
    ";)": "wink.png",
    ":)": "smiley.png",
    "(y)": "like.png",
    ":*": "kiss.png",
    ":(": "sad.png"
  }
  for (var smesko in preslikovalnaTabela) {
    vhodnoBesedilo = vhodnoBesedilo.replace(smesko,
      "<img src='http://sandbox.lavbic.net/teaching/OIS/gradivo/" +
      preslikovalnaTabela[smesko] + "' />");
  }
  return vhodnoBesedilo;
}

function dodajSlike(vhodnoBesedilo) {
  var linki = [];
  var matches = [];
  var jeZasebno = false;
  var split;
  if (vhodnoBesedilo.indexOf("/zasebno") > -1) {
    split = vhodnoBesedilo.split('\"');
    jeZasebno = true;
  }
  else {
    split = vhodnoBesedilo.split(" ");
  }
  for (var i = 0; i < split.length; i++) {
    matches = split[i].match(/https?:\/\/.*?\.(jpg|png|gif)/gi); 
    if (matches != null)
      for (var j = 0; j < matches.length; j++)
        if (matches[j].indexOf('http://sandbox.lavbic.net/teaching/OIS/gradivo/') == -1)
          linki.push(matches[j]); 
  }
  if (jeZasebno) {
    for (var i = 0; i < linki.length; i++)
      split[3] += '<br><img src='+linki[i]+' class=slika />';
    vhodnoBesedilo = split.join('"');
  }
  else {
    for (var i = 0; i < linki.length; i++)
      vhodnoBesedilo += '<br><img src='+linki[i]+' class=slika />';
  }
  return vhodnoBesedilo;
}

function dodajVidee(vhodnoBesedilo) {
  var linki = [];
  var jeZasebno = false;
  var split;
  if (vhodnoBesedilo.indexOf("/zasebno") > -1) {
    split = vhodnoBesedilo.split('\"');
    jeZasebno = true;
  }
  else {
    split = vhodnoBesedilo.split(" ");
  }
  for (var i = 0; i < split.length; i++) {
    var matches = split[i].match(/https:\/\/www\.youtube\.com\/watch\?v=(\S{11})?/gi);
    if (matches != null)
      for (var j = 0; j < matches.length; j++)
        linki.push(matches[j]);
  }
  var link;
  if (jeZasebno) {
    for (var i = 0; i < linki.length; i++) {
      link = linki[i].toString();
      split[3] += '<br><iframe src=https://www.youtube.com/embed/'+link.substring(32, 43)+' allowfullscreen></iframe>';
    }
    vhodnoBesedilo = split.join('"');
  }
  else {
    for (var i = 0; i < linki.length; i++) {
      link = linki[i].toString();
      vhodnoBesedilo += '<br><iframe src=https://www.youtube.com/embed/'+link.substring(32, 43)+' allowfullscreen></iframe>';
    }
  }
  return vhodnoBesedilo;
}
