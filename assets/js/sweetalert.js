document.querySelector(".join_confirm").addEventListener('click', function(){

    Swal.fire({
      title: '<strong>請先閱讀下列事項：</strong>',
      icon: 'info',
      html:
	    '<hr style="opacity: 0.5;">' +
	    '<li>本團隊限制最低年齡為「15歲」。</li>'+
	    '<li>如報名Minecraft組，請自備「Java版」正版帳號。</li>'+
	    '<li>如有加入其他Minecraft團隊，請先在表單裡報備。</li>'+
	    '<br>'+
	    '違反上述規則，事後經查證屬實，一律踢出團隊！<br>'+
	    '<br>',
        showCloseButton: true,
        showCancelButton: true,
        focusConfirm: false,
        confirmButtonText: '我已閱讀上述注意事項，讓我參與',
        confirmButtonColor: '#1cb841',
        cancelButtonText: '我改變主意了，讓我想想',
    }).then((result) => {
        if (result.isConfirmed) {
            window.location = "https://youtu.be/dQw4w9WgXcQ";
        }})
})

