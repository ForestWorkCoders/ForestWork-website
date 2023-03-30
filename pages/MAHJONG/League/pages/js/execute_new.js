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
                targets: [0, 4],
                render: function (data, type, row) {
                    if (type === 'sort') {
                        switch (data) {
                            case 'DNF':
                                return '1000000';
                            default: // already set, in this case
                                return parseInt(data) || 0; // Convert the data to an integer or set it to 0 if it's not a number
                        }
                    } else {
                        return data;
                    }
                },
                type: 'numeric'
            }
        ],
        "columns": [{
            "title": "Rank",
            "data": "rank",
            "render": function (data, type, row) {
                return '<span style="display: flex; flex-flow: row nowrap; justify-content: center;">' + data + '</span>';
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
    table.order([1, 'desc']).draw();

    // Replace rank with "DNF" if there are more than 8 "-" in Game1 to Game16 columns
    var dnfIndex = null; // keep track of the index of the first DNF player
    table.rows().every(function(index) {
        var data = this.data();
        var count = 0;
        for (var i = 2; i < data.length; i++) {
            if (data[i] == "-") {
                count++;
            }
        }
        if (count > 8) {
            this.data(['DNF'].concat(data.slice(1)));
            if (dnfIndex == null) {
                dnfIndex = index;
            }
        }
    });
})