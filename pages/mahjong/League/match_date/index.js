const monthMapping = {
  "Jan": "一",
  "Feb": "二",
  "Mar": "三",
  "Apr": "四",
  "May": "五",
  "Jun": "六",
  "Jul": "七",
  "Aug": "八",
  "Sep": "九",
  "Oct": "十",
  "Nov": "十一",
  "Dec": "十二",
};

const segments = new URL(window.location.href).search;
// Split the comment into year and month
const parts = segments.match(/(\d{4})([A-Za-z]+)/);
var yearInput, monthInput;

if (parts) {
  yearInput = parts[1]; 
  monthInput = parts[2]; 
} else {
  console.error("The comment format is in wrong format.");
}

if (monthMapping.hasOwnProperty(monthInput)) {
  // Replace the content of the element with the corresponding Chinese character
  $("ol li:nth-child(3)").text(monthMapping[monthInput] + "月份");
  $("h2").text(monthMapping[monthInput] + "月份 林間盃日麻積分賽");
} else {
  window.location.href = "../";
}

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCV8crX69YSgZVz667QE6PzSQL7CK_TurY",
  authDomain: "mahjongbase.firebaseapp.com",
  projectId: "mahjongbase",
  storageBucket: "mahjongbase.appspot.com",
  messagingSenderId: "631056205188",
  appId: "1:631056205188:web:94a4064ee60658047589d1"
};

var index = 1;

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Reference to your Firestore collection
async function fetchAndMergeData() {
  try {
    const febData = await fetchData("League/" + yearInput + "/" + monthInput);
    const participantsData = await fetchData("Participants");
    const mergedData = await mergeData(febData, participantsData);

    // Filter out objects with a "rank" property
    const sortedData = mergedData.filter(item => !item.hasOwnProperty('rank')).sort((a, b) => b.total - a.total);

    sortedData.forEach((item, index) => {
      if (!item.hasOwnProperty('rank')) {
        item.rank = index + 1;
      }
    });

    populateTable(mergedData);
  } catch (error) {
    console.error('Error getting documents: ', error);
  }
}

async function fetchData(collectionName) {
  const data = [];
  // Use Firebase SDK to fetch data from the collection

  // Example using Firebase Firestore
  try {
    const snapshot = await firebase.firestore().collection(collectionName).get();
    snapshot.forEach(doc => {
      data.push({
        id: doc.id,
        ...doc.data()
      });
    });
  } catch (error) {
    console.error('Error fetching data from Firestore: ', error);
  }
  return data;
}

function mergeData(febData, participantsData) {

  if (!febData || !participantsData) {
    console.error('Data is empty or undefined.');
    return [];
  }

  const mergedData = febData
    .map(febItem => {
      const participantItem = participantsData.find(participant => participant.id === febItem.id);
      if (participantItem) {
        const gameScores = [];

        for (let i = 0; i < febData[0].gameScore.length; i++) {
          if (!febItem.gameScore[i]) {
            gameScores.push(null);
          } else {
            gameScores.push(febItem.gameScore[i]);
          }
        }

        const totalScore = gameScores.reduce((acc, score) => acc + (score || 0), 0);
        const total = Number.isInteger(totalScore) ? totalScore : totalScore.toFixed(2);

        const result = {
          id: participantItem.id,
          pfp: participantItem.pfp,
          discord_username: participantItem.discord_username,
          mahjongSoul_ID: participantItem.mahjongSoul_name,
          total: total,
          gameScores: gameScores
        }

        if (gameScores.filter(score => score === null).length > (febData[0].gameScore.length/2)) {
          result.rank = "DNF";
        }

        return result;

      }
      return null;
    })
  return mergedData;
}

function populateTable(data) {

  var columns = [{
      title: '排名',
      data: 'rank'
    },
    {
      title: '頭像',
      data: 'pfp',
      render: renderImage
    },
    {
      title: 'Discord昵稱',
      data: 'discord_username'
    },
    {
      title: '雀魂麻將昵稱',
      data: 'mahjongSoul_ID'
    },
    {
      title: '總分',
      data: 'total',
      type: 'num'
    }
  ];

  for (var i = 0; i < data[0].gameScores.length; i++) {
    columns.push({
      title: 'Game ' + (i+1),
      data: 'gameScores.' + i,
      render: NaNdisplay
    });
  }

  //Thanks! https://datatables.net/forums/discussion/22343/new-sorting-plugin-sort-by-any-number-ignore-text
  function sortNumbersIgnoreText(a, b, high) {
    var reg = /[+-]?((\d+(\.\d*)?)|\.\d+)([eE][+-]?[0-9]+)?/;
    a = String(a).match(reg);
    a = a !== null ? parseFloat(a[0]) : high;
    b = String(b).match(reg);
    b = b !== null ? parseFloat(b[0]) : high;
    return ((a < b) ? -1 : ((a > b) ? 1 : 0));
  }
  jQuery.extend(jQuery.fn.dataTableExt.oSort, {
    "sort-numbers-ignore-text-asc": function (a, b) {
      return sortNumbersIgnoreText(a, b, Number.POSITIVE_INFINITY);
    },
    "sort-numbers-ignore-text-desc": function (a, b) {
      return sortNumbersIgnoreText(a, b, Number.NEGATIVE_INFINITY) * -1;
    }
  });

 $('#participantTable').DataTable({
    data: data,
    columns: columns,
    "scrollX": true,
    "sScrollXInner": "100%",
    "paging": false,
    "lengthChange": true,
    "searching": true,
    "ordering": true,
    "info": true,
    "pageLength": 25,
    columnDefs: [{
      targets: 0,
      type: 'sort-numbers-ignore-text', // Set the data type to numbers
    }, ],
    order: [
      [0, 'asc'],
      [4, 'desc']
    ],
  });

  $('#participantTable thead th, #participantTable tbody td').css('text-align', 'center');

  function renderImage(data, type, row) {
    if (type === 'display') {
      return '<img src="' + data + '" alt="Profile Image" width="50" height="50" />';
    }
    return data;
  }

  function NaNdisplay(data, type, row) {
    if (type === 'display') {
      return data ?? '—';
    }
    return data;
  }
}

$(document).ready(function () {
  fetchAndMergeData();
});