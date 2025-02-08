
export async function fetchData(tableName) {
    const response = await fetch(`/api/general?table=${tableName}`);
    return await response.json();
}

export async function getUserData(userId) {
    const response = await fetch(`/api/general?table=users`);
    const users = await response.json();
    return users.filter((user) => user.user_id === userId)[0];
}
