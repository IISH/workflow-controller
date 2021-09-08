let sort_field = '';
let sort_order = 1;
const URL = 'archive/archive_inc';
const I = {$exists: true, $ne: null};

function tbody() {
    let and_clause1 = []; // de popup van de workflow types
    let form_workflow_item = $('#form_workflow_item').val();
    if (form_workflow_item) {
        and_clause1.push({name: form_workflow_item});
    }
    if (and_clause1.length === 0) and_clause1.push({name: I});

    let and_clause2 = []; // de invoer naam van het accession nummer
    let archive = $('#filter_archive').val();
    if (archive) and_clause2.push({$or:[{archive: archive}, {archive: {$regex: '^.*' + archive + '.*$'}}]});
    if (and_clause2.length === 0) and_clause2.push({archive: I});

    let and_clause3 = []; // de status
    let or_clause3 = []; // de status lijst
    $('.filter').each(function () {
            let val = $(this).val();
            if ($(this).is(':checked')) or_clause3.push({status: Number(val)});
        }
    );
    if (or_clause3.length === 0) {
        and_clause3.push({status: I});
    } else {
        and_clause3.push({$or:or_clause3});
    }

    let list = [and_clause1, and_clause2, and_clause3];
    let and_query = {$and: list.flatMap(function(e){return e})};
    let d = {form_workflow_item: form_workflow_item, q: and_query, sort_field: sort_field, sort_order: sort_order};

    $.ajax({
        url: URL,
        data: JSON.stringify(d),
        type: 'POST',
        dataType: 'html',
        contentType: 'application/json',
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

// setInterval(function () {
//     tbody();
//     utils();
// }, 5000);
