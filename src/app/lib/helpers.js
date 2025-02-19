const publicDataTables = ['grades', 'classes', 'courses', 'classes_users'];

export async function fetchData(tableName, authToken = null) {
    try {
        if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
            throw new Error('Invalid table name');
        }

        const response = await fetch(`/api/general?table=${tableName}`, {
            headers: {
                ...(publicDataTables.includes(tableName)
                    ? {}
                    : {
                          Authorization: `Bearer ${authToken}`,
                      }),
            },
        });

        if (!response.ok) {
            throw new Error('Failed to fetch data');
        }
        return await response.json();
    } catch (error) {
        console.error('Error in fetchData:', error);
        throw new Error(error.message);
    }
}

export async function fetchViewData(viewName) {
    try {
        const response = await fetch(`/api/views?view=${viewName}`);

        if (!response.ok) {
            throw new Error('Failed to fetch View data');
        }
        return await response.json();
    } catch (error) {
        console.error('Error in fetchViewData:', error);
        throw new Error(error.message);
    }
}


export async function getUserData(userId, authToken = null) {
    try {
        const response = await fetch(`/api/general?table=users`, {
            headers: {
                Authorization: `Bearer ${authToken}`,
            },
        });

        if (!response.ok) {
            throw new Error('Failed to fetch user data');
        }

        const users = await response.json();
        return users.find((user) => user.user_id === userId);
    } catch (error) {
        console.error('Error in getUserData:', error);
        throw new Error(error.message);
    }
}

export async function fetchDataWhereAttrIs(tableName, conditions, authToken = null) {
    try {
        if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
            throw new Error('Invalid table name');
        }
        
        let queryString = `?table=${tableName}`;
        for (const [attr, value] of Object.entries(conditions)) {
            queryString += `&${encodeURIComponent(attr)}=${encodeURIComponent(value)}`;
        }

        const response = await fetch(`/api/selective${queryString}`, {
            headers: {
                ...(publicDataTables.includes(tableName)
                    ? {} 
                    : {
                          Authorization: `Bearer ${authToken}`,
                      }),
            },
        });
        if (!response.ok) {
            console.log("Response", response);
            throw new Error('Failed to fetch filtered data');
        }
        return await response.json();
    } catch (error) {
        console.error('Error in fetchDataWhereAttrIs:', error);
        throw new Error(error.message);
    }
}

export async function fetchJoinableData(tables, joinConditions, selectionAttrs = '*', additionalFilters = {}, authToken = null) {
    
    try {
        // Validate input
        if (!Array.isArray(tables) || tables.length < 2) {
            throw new Error('At least two tables are required for a join');
        }

        if (!Array.isArray(joinConditions) || joinConditions.length !== tables.length - 1) {
            throw new Error('Mismatch between tables and join conditions');
        }

        // Construct the query string
        const searchParams = new URLSearchParams();
        tables.forEach(table => searchParams.append('table', table));
        joinConditions.forEach(condition => searchParams.append('join', condition));
        searchParams.append('selectionAttrs', selectionAttrs);

        // Add additional filters to the query string
        for (const [key, value] of Object.entries(additionalFilters)) {
            searchParams.append(key, value);
        }

        // Fetch data from the joinable API table=classes_users&classes_users.user_id=3
        const response = await fetch(`/api/joinable/?${searchParams.toString()}`, {
            headers: {
                Authorization: `Bearer ${authToken}`,
            },
        });

        if (!response.ok) {
            throw new Error('Failed to fetch joinable data');
        }

        return await response.json();
    } catch (error) {
        console.error('Error in fetchJoinableData:', error);
        throw new Error(error.message);
    }
}

export async function updateTableData(tableName, data, conditions, authToken = null) {
    try {
        if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
            throw new Error('Invalid table name');
        }

        const response = await fetch('/api/updateProfile', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(publicDataTables.includes(tableName)
                    ? {}
                    : {
                          Authorization: `Bearer ${authToken}`,
                      }),
            },
            body: JSON.stringify({ data, conditions })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to update data');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error in updateTableData:', error);
        throw error;
    }
}
