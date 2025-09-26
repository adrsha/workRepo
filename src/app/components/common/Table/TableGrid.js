import { formatColName } from '../../../lib/utils';
import { TableRow } from './TableRow';

export const TableGrid = ({
    data,
    columns,
    allColumns, // All columns including hidden ones
    additionalColumns,
    className,
    renderCell,
    keyField,
    allowDelete,
    allowBulkDelete,
    selectedRows,
    onRowSelect,
    onSelectAll,
    onDelete
}) => {
    const allSelected = selectedRows.size === data.length;
    return (
        <table className={className}>
            <thead>
                <tr>
                    {allowBulkDelete && (
                        <th className="select-column">
                            <input
                                type="checkbox"
                                checked={allSelected}
                                onChange={(e) => onSelectAll(e.target.checked)}
                                className="select-all-checkbox"
                            />
                        </th>
                    )}
                    {additionalColumns.map(col => (
                        <th key={col.key}>{col.title}</th>
                    ))}
                    {columns.map(col => (
                        <th key={col}>{formatColName(col)}</th>
                    ))}
                    {allowDelete && <th>Actions</th>}
                </tr>
            </thead>
            <tbody>
                {data.map((item, index) => (
                    <TableRow
                        key={`${keyField}-${item[keyField] || index}`}
                        item={item}
                        index={index}
                        columns={columns}
                        allColumns={allColumns} // Pass all columns to row
                        additionalColumns={additionalColumns}
                        renderCell={renderCell}
                        keyField={keyField}
                        allowDelete={allowDelete}
                        allowBulkDelete={allowBulkDelete}
                        isSelected={selectedRows.has(item[keyField])}
                        onRowSelect={onRowSelect}
                        onDelete={onDelete}
                    />
                ))}
            </tbody>
        </table>
    );
};
