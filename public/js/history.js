const URL = 'history/history_inc';

function makeQuery() {
    let and_clause1 = []; // de popup van de workflow types
    let form_workflow_name = $('#form_workflow_name').val();
    if (form_workflow_name) {
        and_clause1.push({name: form_workflow_name});
    }
    if (and_clause1.length === 0) and_clause1.push({name: I});

    let and_clause2 = []; // de invoer naam van het accession nummer
    let archive_or_accession = $('#form_archive_name').val();
    if (archive_or_accession) and_clause2.push({$or: [{archive: archive_or_accession}, {accession: {$regex: '^.*' + archive_or_accession + '.*$'}}]});
    if (and_clause2.length === 0) and_clause2.push({archive: I});

    let and_clause3 = []; // de status
    let or_clause3 = []; // de status lijst
    $('.filter_status').each(function () {
            let val = $(this).val();
            if ($(this).is(':checked')) {
                or_clause3.push({status: Number(val)});
            }
        }
    );
    if (or_clause3.length === 0) {
        and_clause3.push({status: I});
    } else {
        and_clause3.push({$or: or_clause3});
    }

    let and_clause4 = []; // de popup van de users
    let or_clause4 = [];
    $('.filter_user').each(function () {
            let val = $(this).val();
            if (val) or_clause4.push({uid: Number(val)});
        }
    );
    if (or_clause4.length === 0) {
        and_clause4.push({status: I});
    } else {
        and_clause4.push({$or: or_clause4});
    }

    let list = [and_clause1, and_clause2, and_clause3, and_clause4];
    let and_query = {
        $and: list.flatMap(function (e) {
            return e
        })
    };
    let d = {archive_or_accession: archive_or_accession, q: and_query, sort_field: sort_field, sort_order: sort_order};
    return JSON.stringify(d);
}