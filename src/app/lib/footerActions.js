export const fetchFooterData = async (setFooterData, setLoading, setError) => {
    try {
        setLoading(true);
        let data = {};
        const response = await fetch('/api/footer');
        if (response.ok) {
            data = await response.json();
        }
        setFooterData(data);
    } catch (err) {
        setError(err.message);
    } finally {
        setLoading(false);
    }
};

