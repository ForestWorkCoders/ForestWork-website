var firstSet, secondSet;

/* remove optional end / */ 
const segments = new URL(window.location.href).pathname.split('/');
const last = segments.pop() || segments.pop(); // Handle potential trailing slash
sorted = "pages/TOURNAMENT/Mahjong/pages/json/" + last + ".json"
//console.log(sorted);

$.when(
    $.getJSON("pages/TOURNAMENT/Mahjong/pages/json/playerlist.json", function(data) {
        firstSet = data;
    }),
    $.getJSON(sorted, function(data) {
        secondSet = data;
    })
).then(function() {
    function contains(set, object) {
        var solution = -1;
        set.forEach(function (item, index, array) {
            if (item.id == object.id) {
                solution = index;
            }
        });
        return solution;
    }
    
    function mergeSets(first, second) {
        var result = first;
        second.forEach(function (item, index, array) {
            var resultIndex = contains(result, item);
            if (resultIndex !== -1) {
                result[resultIndex].pfp = item.pfp;
                result[resultIndex].discordID = item.discordID;
                result[resultIndex].mahjongSoulID = item.mahjongSoulID;
            }
        });
        return result;
    }
    
    var solution = mergeSets(secondSet, firstSet);

    $('#example').DataTable({
        "scrollX": true,
        "paging": false,
        "lengthChange": true,
        "searching": true,
        "ordering": true,
        "info": true,
        "pageLength": 25,
        //"autoWidth": true,
        "data": solution,
        columnDefs: [
            { 
                targets: [0,4], 
                render: function ( data, type, row ) {
                    if ( type === 'sort' ) {
                      var sortValue = data;
                      switch( data ) {
                        case 'DNF':
                          sortValue = -999999;
                          break;
                        default: // already set, in this case
                      } 
                      return sortValue;
                    } else { 
                      return data;
                    }
                }
            }
        ],
        "columns": [{
            "title": "Rank",
            "data": "rank",
            "render": function (data, type, row) {
                return '<span style="display: flex; flex-flow: row nowrap; justify-content: center;">'+data+'</span>';
            }
        }, {
            "title": "Pfp",
            "data": "pfp",
            "render": function(data, type, row) {
                return '<img width="40" height="40" src="'+data+'" />';
            }
        }, {
            "title": "Discord ID",
            "data": "discordID"
        }, {
            "title": "Mahjong Soul ID",
            "data": "mahjongSoulID"
        }, {
            "title": "Total",
            "data": null,
            "render": function(data, type, row) {
                var total = 0;
                for (var prop in row) {
                    if (prop.indexOf('game') === 0) {
                        var gameValue = row[prop];
                        if (gameValue === '—') {
                            gameValue = 0;
                        }
                        total += parseInt(gameValue, 10);
                    }
                }
                return total;
            }            
        }, {
            "title": "Game 1",
            "data": "game01"
        }, {
            "title": "Game 2",
            "data": "game02"
        }, {
            "title": "Game 3",
            "data": "game03"
        }, {
            "title": "Game 4",
            "data": "game04"
        }, {
            "title": "Game 5",
            "data": "game05"
        }, {
            "title": "Game 6",
            "data": "game06"
        }, {
            "title": "Game 7",
            "data": "game07"
        }, {
            "title": "Game 8",
            "data": "game08"
        }, {
            "title": "Game 9",
            "data": "game09"
        }, {
            "title": "Game 10",
            "data": "game10"
        }, {
            "title": "Game 11",
            "data": "game11"
        }, {
            "title": "Game 12",
            "data": "game12"
        }, {
            "title": "Game 13",
            "data": "game13"
        }, {
            "title": "Game 14",
            "data": "game14"
        }, {
            "title": "Game 15",
            "data": "game15"
        }, {
            "title": "Game 16",
            "data": "game16"
        }]
    });
})