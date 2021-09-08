let sort = '';
const URL = 'workflow/workflow_inc';

function tbody() {
    let form_workflow_identifier = $('#form_workflow_identifier').val() || '';
    let form_workflow_name = $('#form_workflow_name').val() || '';
    let form_workflow_status = $('#form_workflow_status').val() || '';
    $.ajax({
        url: URL,
        data: {
            'form_workflow_name': form_workflow_name,
            form_workflow_status: form_workflow_status,
            form_workflow_identifier: form_workflow_identifier,
            sort: sort
        },
        type: 'GET',
        dataType: 'html',
        success: function (data) {
            $('#tbody').html(data.replace(/[\n\r]/g, '<br />'));
            $('#heartbeat').addClass('bg-success').removeClass('bg-error').text(formatDate(new Date()));
        },

        error: function (xhr, status) {
            $('#tbody').html('Sorry, there was a problem! Is the server up?');
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
    let year = date.getFullYear();
    let month = ('00' + (date.getUTCMonth() + 1)).substr(-2);
    let day = ('00' + date.getUTCDate()).substr(-2);
    let hour = ('00' + date.getHours()).substr(-2);
    let minute = ('00' + date.getMinutes()).substr(-2);
    let second = ('00' + date.getSeconds()).substr(-2);
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
        tbody();
    });
}

$(document).ready(function () {
    sortable();
    tbody();
    utils();
});

// setInterval(function () {
//     tbody();
//     utils();
// }, 5000);
