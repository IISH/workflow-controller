function utils() {
    $('.delete_row').click(function(){
        return confirm("Are you sure you want to delete?");
    });

    $('.filter').change(function(){
        tbody();
    });
}
