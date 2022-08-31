$(document).ready(function () {

    const settings = {
        "cache": false,
        "dataType": "json",
        "async": true,
        "crossDomain": true,
        "url": "playerlist.json",
        "method": "GET"
    }

    $.ajax(settings).done(function (response) {
        $('tr').each(function () {
            console.log($(this).find('#search_id').html())
            var total = 0;
            $(this).find('.scores').each(function () {
                var scores = $(this).text();
                if (scores.length !== 0 && scores !== '—') {
                    total += parseInt(scores);
                }
            });
            $(this).find('#total').html(total);
            var filterList = JSON.parse(JSON.stringify(response));
            for (i = 1; i <= filterList.length; i++) {
                if ($(this).find('#search_id').text() == i) {
                    $(this).find('#pfp').html("<img src=\"" + filterList[i - 1].pfp + "\" width=\"40\" height=\"40\"></img>");
                    $(this).find('#discordID').html(filterList[i - 1].discordID);
                    $(this).find('#mahjongSoulID').html(filterList[i - 1].mahjongSoulID);
                    return;
                }
            }


        })
    })
})