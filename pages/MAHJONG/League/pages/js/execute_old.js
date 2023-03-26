var firstSet, secondSet;

$.when(
    $.getJSON("pages/MAHJONG/League/pages/json/playerlist.json", function(data) {
        firstSet = data;
    }),
    $.getJSON("pages/MAHJONG/League/pages/json/2022Jan.json", function(data) {
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
        }, {
            "title": "Game 17",
            "data": "game17"
        }, {
            "title": "Game 18",
            "data": "game18"
        }, {
            "title": "Game 19",
            "data": "game19"
        }, {
            "title": "Game 20",
            "data": "game20"
        }, {
            "title": "Game 21",
            "data": "game21"
        }, {
            "title": "Game 22",
            "data": "game22"
        }, {
            "title": "Game 23",
            "data": "game23"
        }, {
            "title": "Game 24",
            "data": "game24"
        }]
    });
})