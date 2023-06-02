var firstSet, secondSet;

/* remove optional end / */
const segments = new URL(window.location.href).pathname.split('/');
const last = segments.pop() || segments.pop(); // Handle potential trailing slash
sorted = "pages/MAHJONG/League/pages/json/" + last + ".json"
//console.log(sorted);

$.when(
    $.getJSON("pages/MAHJONG/League/pages/json/playerlist.json", function (data) {
        firstSet = data;
    }),
    $.getJSON(sorted, function (data) {
        secondSet = data;
    })
).then(function () {
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

    //Thanks! https://datatables.net/forums/discussion/22343/new-sorting-plugin-sort-by-any-number-ignore-text
    function sortNumbersIgnoreText(a, b, high) {
        var reg = /[+-]?((\d+(\.\d*)?)|\.\d+)([eE][+-]?[0-9]+)?/;    
        a = a.match(reg);
        a = a !== null ? parseFloat(a[0]) : high;
        b = b.match(reg);
        b = b !== null ? parseFloat(b[0]) : high;
        return ((a < b) ? -1 : ((a > b) ? 1 : 0));    
    }
    jQuery.extend( jQuery.fn.dataTableExt.oSort, {
        "sort-numbers-ignore-text-asc": function (a, b) {
            return sortNumbersIgnoreText(a, b, Number.POSITIVE_INFINITY);
        },
        "sort-numbers-ignore-text-desc": function (a, b) {
            return sortNumbersIgnoreText(a, b, Number.NEGATIVE_INFINITY) * -1;
        }
    });

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
                type: 'sort-numbers-ignore-text', 
                targets : 0 
            }
        ],
        "columns": [{
            "title": "Rank",
            "data": "rank",
            "render": function (data, type, row) {
                return '<span style="display: flex; flex-flow: row nowrap; justify-content: center;">' + parseInt(data) + '</span>';
            }
        }, {
            "title": "Pfp",
            "data": "pfp",
            "render": function (data, type, row) {
                return '<img width="40" height="40" src="' + data + '" />';
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
            "render": function (data, type, row) {
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