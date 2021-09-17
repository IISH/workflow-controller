const I = {$exists: true, $ne: null};
let sort_field = '';
let sort_order = 1;

function utils() {
    $('.delete_row').click(function(){
        return confirm("Are you sure you want to delete?");
    });

    $('.filter').change(function(){
        tbody('Loading...');
    });
}

let overload = 0;
function tbody(load_text) {

    let now = new Date();
    if ( overload && overload - now < 500) { // ms
        overload = now;
        console.log('Ignore, too many clicks');
        return;
    }

    if (load_text) $('#tbody').html(load_text);
    let data = makeQuery();
    console.log(data);

    $.ajax({
        url: URL,
        data: data,
        type: 'POST',
        dataType: 'html', // expected response
        contentType: 'application/json',
        success: function (data) {
            $('#tbody').html(data.replace(/[\n\r]/g, '<br />'));
            $('#heartbeat').addClass('bg-success').removeClass('bg-error').text(formatDate(new Date()));
        },

        error: function (xhr, status) {
            console.error(xhr);
            console.error(status);
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
        let order = (desc || (!asc && !desc)) ? 'asc' : 'desc';
        $this.removeClass('asc')
            .removeClass('desc')
            .addClass(order);
        sort_field = $this.attr('id');
        sort_order = order;
        tbody();
    });
}

$(document).ready(function () {
    sortable();
    tbody();
    utils();
});

setInterval(function () {
    tbody();
    utils();
}, 10000);
