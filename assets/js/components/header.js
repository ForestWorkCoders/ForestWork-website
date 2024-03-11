const header_temp = document.createElement('module');

header_temp.innerHTML = `
<div class="container-fluid">
<div class="container-fluid">

  <div class="row justify-content-center">
    <div class="col-xl-9 d-flex align-items-center justify-content-lg-between">
      <!--<h1 class="logo me-auto me-lg-0"><a href="#">ForestWork</a></h1>-->
      <!-- Uncomment below if you prefer to use an image logo -->
      <a href="https://forestwork.vercel.app/" class="logo me-auto me-lg-0"><img src="assets/img/left-top-icon.png" alt="ForestWork" class="img-fluid"></a>

      <nav id="navbar" class="navbar order-last order-lg-0">
        <ul>
          <li><a class="nav-link scrollto active" href="#">主頁</a></li>
          
          <li class="dropdown"><a href="#"><span>麥塊系列</span></a>
            <ul>
              <li><a href="https://eaglepb2.gitbook.io/uhc_report/">超极限生存竞赛</a></li>
              <li><a href="/pages/minecraft/MinecraftSMP">多人生存 · SMP</a></li>
            </ul>
          </li>
            
          <li class="dropdown"><a href="#"><span>日麻系列</span></a>
            <ul>
                <li><a href="https://forestwork-mahjong.vercel.app/pages/rules">賽事規章</a></li>
                <li><a href="https://forestwork-mahjong.vercel.app">積分賽</a></li>
                <li class="dropdown"><a href="#"><span>活動賽</span> <i class="bi bi-chevron-right"></i></a>
                  <ul>
                    <li><a href="https://forestwork-mahjong.vercel.app/pages/event_week/2022JuneMahjongEvent">數番盃</a></li>
                    <li><a href="https://forestwork-mahjong.vercel.app/pages/event_week/pages/mahjong/2023MarchMahjongEvent">役滿盃</a></li>
                    <li><a href="https://forestwork-mahjong.vercel.app/pages/event_week/pages/mahjong/2023AugustMahjongEvent">鬼門盃</a></li>
                  </ul>
                </li>
              </ul>
          </li>

          <li class="dropdown"><a href="#"><span>同樂系列</span></a>
            <ul>
              <li><a href="/pages/drawing/GarticPhone">林間靈魂繪師</a></li>
              <li class="dropdown"><a href="#"><span>林間交換繪</span> <i class="bi bi-chevron-right"></i></a>
                <ul>
                  <li><a href="/pages/drawing/ExchangeArt/Season_1">第一屆</a></li>
                  <li><a href="/pages/drawing/ExchangeArt/Season_2">第二屆</a></li>
                </ul>
              </li>
              <li><a href="/pages/drawing/TacitAgreement">林間默契游戲</a></li>
            </ul>
          </li>

          <li><a class="nav-link scrollto" href="/pages/others/Quotes">林間名言啟示錄</a></li>
          <li><a class="nav-link scrollto" href="/pages/others/Puzzles">謎語人的呻吟</a></li>
        </ul>
        <i class="bi bi-list mobile-nav-toggle"></i>
      </nav>
     <!-- .navbar -->

      <a href="https://discord.gg/pxEYaZa4Xk" target="_blank" class="get-started-btn scrollto">加入Discord</a>
    </div>
  </div>

</div>
`

document.getElementById("header").appendChild(header_temp);
