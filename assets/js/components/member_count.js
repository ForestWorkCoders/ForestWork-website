const counter = document.createElement('module');

var getJSON = function(url, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'json';
    xhr.onload = function() {
      var status = xhr.status;
      if (status === 200) {
        callback(null, xhr.response);
      } else {
        callback(status, xhr.response);
      }
    };
    xhr.send();
};

getJSON('https://discord.com/api/v9/invites/qKrub9b?with_counts=true',
function(err, data) {
  if (err !== null) {
    alert('Something went wrong: ' + err);
  } else {
    counter.innerHTML = `<span data-purecounter-start="0" data-purecounter-end="` + data.approximate_member_count + `" data-purecounter-duration="1" class="purecounter"></span>`
    document.getElementById("member_counter").appendChild(counter);
  }
});

