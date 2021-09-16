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
    if (archive_or_accession) and_clause2.push({$or: [{archive: archive_or_accession}, {accession: archive_or_accession}]});
    if (and_clause2.length === 0) and_clause2.push({archive: I});

    let list = [and_clause1, and_clause2];
    let and_query = {
        $and: list.flatMap(function (e) {
            return e
        })
    };
    let d = {q: and_query, sort_field: sort_field, sort_order: sort_order};
    return JSON.stringify(d);
}