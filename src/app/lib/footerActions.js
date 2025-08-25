'use server';

export const fetchFooterData = async () => {
    try {
        const response = await fetch('/api/footer');
        if (response.ok) {
            const data = await response.json();
            console.log(data);
            return { data, error: null };
        } else {
            return { data: null, error: 'Failed to fetch footer data' };
        }
    } catch (err) {
        return { data: null, error: err.message };
    }
};
