var sort = '';

function report() {
    let form_report_status = $('#form_report_status').val() || '';
    let form_report_name = $('#form_report_name').val() || '';
    $.ajax({
        url: 'report/report_inc',
        data: {form_report_status: form_report_status, form_report_name: form_report_name, sort: sort},
        type: 'GET',
        dataType: 'html',
        success: function (data) {
            $('#report').html(data.replace(/[\n\r]/g, '<br />'));
            $('#heartbeat').addClass('bg-success').removeClass('bg-error').text(formatDate(new Date()));
        },

        error: function (xhr, status) {
            $('#report').html('Sorry, there was a problem! Is the server up?');
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
        report();
    });
}

$(document).ready(function () {
    sortable();
    report();
    utils();
});

setInterval(function () {
    report();
    utils();
}, 5000);
