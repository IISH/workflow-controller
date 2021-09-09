const URL = 'archive/archive_inc';

function makeQuery() {
    let and_clause1 = []; // de popup van de workflow types
    let form_workflow_item = $('#form_workflow_item').val();
    if (form_workflow_item) {
        and_clause1.push({name: form_workflow_item});
    }
    if (and_clause1.length === 0) and_clause1.push({name: I});

    let and_clause2 = []; // de invoer naam van het accession nummer
    let archive = $('#filter_archive').val();
    if (archive) and_clause2.push({$or: [{archive: archive}, {archive: {$regex: '^.*' + archive + '.*$'}}]});
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
        and_clause3.push({$or: or_clause3});
    }

    let list = [and_clause1, and_clause2, and_clause3];
    let and_query = {
        $and: list.flatMap(function (e) {
            return e
        })
    };
    let d = {form_workflow_item: form_workflow_item, q: and_query, sort_field: sort_field, sort_order: sort_order};
    return JSON.stringify(d);
}