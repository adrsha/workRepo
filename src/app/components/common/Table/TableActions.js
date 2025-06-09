export const TableActions = ({ 
    allowAdd, 
    allowBulkAdd, 
    allowBulkDelete, 
    selectedCount, 
    onShowAdd, 
    onShowBulkAdd, 
    onBulkDelete 
}) => (
    <div className="table-actions">
        <div className="add-actions">
            {allowAdd && (
                <button className="add-btn" onClick={onShowAdd}>
                    Add Record
                </button>
            )}
            {allowBulkAdd && (
                <button className="bulk-add-btn" onClick={onShowBulkAdd}>
                    Bulk Add
                </button>
            )}
        </div>
        
        {allowBulkDelete && selectedCount > 0 && (
            <div className="delete-actions">
                <span className="selection-count">{selectedCount} selected</span>
                <button className="bulk-delete-btn" onClick={onBulkDelete}>
                    Delete Selected ({selectedCount})
                </button>
            </div>
        )}
    </div>
);
