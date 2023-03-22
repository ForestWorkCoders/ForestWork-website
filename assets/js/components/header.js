const header_temp = document.createElement('module');

header_temp.innerHTML = `
<div class="container-fluid">
<div class="container-fluid">

  <div class="row justify-content-center">
    <div class="col-xl-9 d-flex align-items-center justify-content-lg-between">
      <!--<h1 class="logo me-auto me-lg-0"><a href="#">ForestWork</a></h1>-->
      <!-- Uncomment below if you prefer to use an image logo -->
      <a href="index.html" class="logo me-auto me-lg-0"><img src="assets/img/left-top-icon.png" alt="ForestWork" class="img-fluid"></a>

      <nav id="navbar" class="navbar order-last order-lg-0">
        <ul>
          <li><a class="nav-link scrollto active" href="#">主頁</a></li>
          <li><a class="nav-link scrollto" href="#about">介紹</a></li>
          <li class="dropdown"><a href="#about"><span>林間項目</span> <i class="bi bi-chevron-down"></i></a>
            <ul>
              <li class="dropdown"><a href="#"><span>日麻系列</span> <i class="bi bi-chevron-right"></i></a>
                <ul>
                  <li><a href="/pages/MAHJONG/League">日常積分賽</a></li>
                  <li><a href="/pages/MAHJONG/2022JuneMahjongEvent">數番盃活動賽</a></li>
                  <li><a href="/pages/MAHJONG/2023MarchMahjongEvent">役滿盃活動賽</a></li>
                </ul>
              </li>
              <li class="dropdown"><a href="#"><span>麥塊系列</span> <i class="bi bi-chevron-right"></i></a>
                <ul>
                  <li><a href="https://uhc.forestwork.team">Minecraft UHC</a></li>
                  <li><a href="/pages/CASUAL/MinecraftSMP">Minecraft SMP</a></li>
                  <li><a href="https://waitwhat.asia">WaitWhat PvP 回歸！</a></li>
                </ul>
              </li>
              <li class="dropdown"><a href="#"><span>同樂系列</span> <i class="bi bi-chevron-right"></i></a>
                <ul>
                  <li><a href="/pages/CASUAL/GarticPhone">林間靈魂繪師</a></li>
                  <li><a href="/pages/CASUAL/ExchangeArt">林間交換繪</a></li>
                </ul>
              </li>
            </ul>
          </li>
          <li><a class="nav-link scrollto" href="/pages/OTHERS/Quotes">林間名言啟示錄</a></li>
        </ul>
        <i class="bi bi-list mobile-nav-toggle"></i>
      </nav>
     <!-- .navbar -->

      <a href="#cta" class="get-started-btn scrollto">加入我們</a>
    </div>
  </div>

</div>
`

document.getElementById("header").appendChild(header_temp);
