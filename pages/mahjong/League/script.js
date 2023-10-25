(function () {
    $(function () {
        return $('[data-toggle]').on('click', function () {
            var toggle;
            toggle = $(this).addClass('active').attr('data-toggle');
            $(this).siblings('[data-toggle]').removeClass('active');
            return $('.surveys').removeClass('grid list').addClass(toggle);
        });
    });

}).call(this);

//coffeescript?