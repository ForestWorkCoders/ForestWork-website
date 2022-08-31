const header_temp = document.createElement('header_temp');

header_temp.innerHTML = `
<nav class="navbar navbar-expand-md navbar-dark fixed-top bg-dark">
<div class="navbar-collapse collapse w-100 order-1 order-md-0 dual-collapse2">
    <ul class="navbar-nav mr-auto">
        <li class="nav-item dropdown">
            <a class="nav-link dropdown-toggle" href="#" id="navbarDropdown" role="button"
                data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">重現系列</a>
            <div class="dropdown-menu" aria-labelledby="navbarDropdown">
                <a class="dropdown-item text-center" href="#">甚麼是重現系列</a>
                <div class="dropdown-divider"></div>
                <a class="dropdown-item text-center" href="pages/REPRODUCE/RFM">逃走中 X Minecraft</a>
                <a class="dropdown-item text-center" href="#">九州战意 X Minecraft</a>
        </li>
        <li class="nav-item dropdown">
            <a class="nav-link dropdown-toggle" href="#" id="navbarDropdown" role="button"
                data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">競技系列</a>
            <div class="dropdown-menu" aria-labelledby="navbarDropdown">
                <a class="dropdown-item text-center" href="#">甚麼是競技系列</a>
                <div class="dropdown-divider"></div>
                <a class="dropdown-item text-center" href="https://uhc.forestwork.net/">林間 UHC</a>
                <a class="dropdown-item text-center" href="pages/TOURNAMENT/Mahjong">林間 雀魂日麻积分赛</a>
        </li>
        <li class="nav-item dropdown">
            <a class="nav-link dropdown-toggle" href="#" id="navbarDropdown" role="button"
                data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">伺服系列</a>
            <div class="dropdown-menu" aria-labelledby="navbarDropdown">
                <a class="dropdown-item text-center" href="#">甚麼是伺服系列</a>
                <div class="dropdown-divider"></div>
                <a class="dropdown-item text-center" href="https://waitwhat.asia/" target="_blank">WaitWhat PvP</a>
                <a class="dropdown-item text-center" href="#">林间 SMP</a>
        </li>
        <li class="nav-item dropdown">
            <a class="nav-link dropdown-toggle" href="#" id="navbarDropdown" role="button"
                data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">其他</a>
            <div class="dropdown-menu" aria-labelledby="navbarDropdown">
                <a class="dropdown-item text-center" href="./pages/OTHERS/Quotes">林間名言啟示錄</a>
                <a class="dropdown-item text-center" href="./pages/OTHERS/MonthlyReport">林間月報</a>
				<a class="dropdown-item text-center" href="./pages/OTHERS/GarticPhone">林間靈魂繪師 精彩重現</a>
        </li>
    </ul>
</div>
<div>
    <a class="navbar-brand mx-auto" href="#"></a>
    <button class="navbar-toggler" type="button" data-toggle="collapse" data-target=".dual-collapse2">
        <span class="navbar-toggler-icon"></span>
    </button>
</div>
<div class="navbar-collapse collapse w-100 order-3 dual-collapse2">
    <ul class="navbar-nav ml-auto">
        <li class="nav-item">
            <a class="nav-link" href="confirm">加入我們</a>
        </li>
        <li class="nav-item">
            <a class="nav-link" href="#">關於林間小鎮</a>
        </li>
    </ul>
</div>
</nav>
`

document.getElementById("header_append").appendChild(header_temp);