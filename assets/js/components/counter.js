const counter = document.createElement('module');

var then = new Date(2016, 09, 15), // month is zero based
    now  = new Date;               // no arguments -> current date

counter.innerHTML = `<span data-purecounter-start="0" data-purecounter-end="` + Math.round((now - then) / (1000 * 60 * 60 * 24)) + `" data-purecounter-duration="1" class="purecounter"></span>`

document.getElementById("counter").appendChild(counter);
