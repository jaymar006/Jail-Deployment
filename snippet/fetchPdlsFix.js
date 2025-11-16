const fetchPdls = async () => {
  try {
    const res = await axios.get('/pdls');
    const pdlsWithFormattedDates = res.data.map(pdl => {
      const formatLocalDate = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        // Get local date components
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
      return {
        ...pdl,
        arrest_date: formatLocalDate(pdl.arrest_date),
        commitment_date: formatLocalDate(pdl.commitment_date),
      };
    });
    setPdls(pdlsWithFormattedDates);
  } catch (err) {
    console.error('Failed to fetch PDLs:', err);
  }
};
  