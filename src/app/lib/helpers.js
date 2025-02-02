export async function fetchData(tableName) {
    const response = await fetch(`/api/classes?table=${tableName}`);
    return await response.json();
}
