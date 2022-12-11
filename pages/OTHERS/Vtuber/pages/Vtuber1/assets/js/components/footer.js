const footer_temp = document.createElement('module');

footer_temp.innerHTML = `
<div class="container">
<h3>ForestWork</h3>
<p>社交連接</p>
<div class="social-links">
  <a href="/discord" class="discord"><i class="bx bxl-discord-alt"></i></a>
  <a href="/twitter" class="twitter"><i class="bx bxl-twitter"></i></a>
  <a href="/youtube" class="youtube"><i class="bx bxl-youtube"></i></a>
  <a href="mailto:teamforestwork@gmail.com" class="mail"><i class='bx bxs-envelope' ></i></a>
</div>
<div class="copyright">
  &copy; Copyright <strong><span>ForestWork</span></strong> 2022-2077. All Rights Reserved
</div>
<div class="credits">
  <!-- All the links in the footer should remain intact. -->
  <!-- You can delete the links only if you purchased the pro version. -->
  <!-- Licensing information: https://bootstrapmade.com/license/ -->
  <!-- Purchase the pro version with working PHP/AJAX contact form: https://bootstrapmade.com/knight-simple-one-page-bootstrap-template/ -->
  Designed by <a href="https://bootstrapmade.com/">BootstrapMade</a>
</div>
</div>
`
document.getElementById("footer").appendChild(footer_temp);