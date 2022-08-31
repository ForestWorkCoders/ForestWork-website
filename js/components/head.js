const template = document.createElement('template');

template.innerHTML = `
<!--完整版meta战队！-->
<meta charset="UTF-8">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="description" content="这啥，这网页有很多秘密诶？">
<meta name="keywords" content="-">
<meta name="msapplication-TileColor" content="#000000">
<meta name="msapplication-TileImage" content="media/webicons/mstile-144x144.png">
<meta name="msapplication-config" content="media/webicons/browserconfig.xml">
<meta name="theme-color" content="#ffffff">

<!--不来个动图插图怎么行呢awa-->
<link rel="shortcut icon" href="media/webicons/favicon.ico">
<link rel="Bookmark" href="media/webicons/favicon.ico">
<link rel="apple-touch-icon" sizes="180x180" href="webicons/apple-touch-icon.png">
<link rel="icon" type="image/png" sizes="32x32" href="media/webicons/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="194x194" href="media/webicons/favicon-194x194.png">
<link rel="icon" type="image/png" sizes="192x192" href="media/webicons/android-chrome-192x192.png">
<link rel="icon" type="image/png" sizes="16x16" href="media/webicons/favicon-16x16.png">
<link rel="manifest" href="media/webicons/site.webmanifest">
<link rel="mask-icon" href="media/webicons/safari-pinned-tab.svg" color="#7d7d7d">

<!--css normalize 先给我当一个失忆仔-->
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/normalize/8.0.1/normalize.css" />
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/4.3.1/css/bootstrap.min.css" />
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.1.1/css/all.min.css"/>

<!--css default-->
<link href="css/style.css" rel="stylesheet" type="text/css">

`;

document.head.appendChild(template.content);