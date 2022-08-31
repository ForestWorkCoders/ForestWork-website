const footer_temp = document.createElement('footer_temp');

footer_temp.innerHTML = `
<a href="https://forestwork.net/Discord"><i class="fa-brands fa-discord fa-2xl"></i></a>
<a href="https://www.youtube.com/channel/UCpxH-OxcJujRLpnDUgoYlsg"><i class="fa-brands fa-youtube fa-2xl"></i></a>
<a href="https://twitter.com/teamforestwork"><i class="fa-brands fa-twitter fa-2xl"></i></a>
<a href="https://www.facebook.com/TeamForestWork"><i class="fa-brands fa-facebook-f fa-2xl"></i></a>
<a href='mailto:teamforestwork@gmail.com'><i class="fa-solid fa-envelope fa-2xl"></i></a>
`
document.getElementById("centerFooter").appendChild(footer_temp);