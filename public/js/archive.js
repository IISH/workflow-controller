var sort = '';

function archive() {
    let form_archive_name = $('#form_archive_name').val() || '';
    $.ajax({
        url: 'archive/archive_inc',
        data: {form_archive_name: form_archive_name},
        type: 'GET',
        dataType: 'html',
        success: function (data) {
            $('#archive').html(data.replace(/[\n\r]/g, '<br />'));
            $('#heartbeat').addClass('bg-success').removeClass('bg-error').text(formatDate(new Date()));
        },

        error: function (xhr, status) {
            $('#archive').html('Sorry, there was a problem! Is the server up?');
            $('#heartbeat').addClass('bg-error').removeClass('bg-success').text('No connection...');
        },

        // code to run regardless of success or failure
        complete: function (xhr, status) {
            //
        }
    });
}

function formatDate(date) {
    date = new Date(date);
    var year = date.getFullYear();
    var month = ('00' + (date.getUTCMonth() + 1)).substr(-2);
    var day = ('00' + date.getUTCDate()).substr(-2);
    var hour = ('00' + date.getHours()).substr(-2);
    var minute = ('00' + date.getMinutes()).substr(-2);
    var second = ('00' + date.getSeconds()).substr(-2);
    return year + '-' + month + '-' + day + 'T' + hour + ':' + minute + ':' + second;
}

function sortable() {
    $('.sortable').click(function(){
        let $this = $(this);
        let asc = $this.hasClass('asc');
        let desc = $this.hasClass('desc');
        var order = (desc || (!asc && !desc)) ? 'asc' : 'desc';
        $this.removeClass('asc')
            .removeClass('desc')
            .addClass(order);
        let _order = (desc || (!asc && !desc)) ? '' : '-';
        let field = $this.attr('id');
        sort = _order + field;
        archive();
    });
}

$(document).ready(function () {
    sortable();
    archive();
    utils();
});

setInterval(function () {
    archive();
    utils();
}, 5000);
