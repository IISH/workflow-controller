var sort = '';

function workflow() {
    let form_workflow_identifier = $('#form_workflow_identifier').val() || '';
    let form_workflow_name = $('#form_workflow_name').val() || '';
    let form_workflow_status = $('#form_workflow_status').val() || '';
    $.ajax({
        url: 'workflow/workflow_inc',
        data: {
            'form_workflow_name': form_workflow_name,
            form_workflow_status: form_workflow_status,
            form_workflow_identifier: form_workflow_identifier,
            sort: sort
        },
        type: 'GET',
        dataType: 'html',
        success: function (data) {
            $('#workflow').html(data.replace(/[\n\r]/g, '<br />'));
            $('#heartbeat').addClass('bg-success').removeClass('bg-error').text(formatDate(new Date()));
        },

        error: function (xhr, status) {
            $('#workflow').html('Sorry, there was a problem! Is the server up?');
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
    $('.sortable').click(function () {
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
        workflow();
    });
}

$(document).ready(function () {
    sortable();
    workflow();
    utils();
});

setInterval(function () {
    workflow();
    utils();
}, 5000);
