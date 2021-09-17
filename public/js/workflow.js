const URL = 'workflow/workflow_inc';

function makeQuery() {
    let workflow_identifier = $('#workflow_identifier').val();
    let q = {q: {$or:[{identifier: workflow_identifier},{'tasks.identifier': workflow_identifier}] }};
    return JSON.stringify(q);
}