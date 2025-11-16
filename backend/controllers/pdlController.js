const PDL = require('../models/pdlModel');

const validatePdlData = (data) => {
  const requiredFields = [
    'first_name', 'last_name', 'cell_number'
  ];
  for (const field of requiredFields) {
    if (!data[field]) {
      return `Field '${field}' is required`;
    }
  }
  return null;
};

exports.getAllPdls = async (req, res) => {
  try {
    const results = await PDL.getAll();
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.addPdl = async (req, res) => {
  console.log('addPdl called with body:', req.body);
  const validationError = validatePdlData(req.body);
  if (validationError) {
    console.log('Validation error:', validationError);
    return res.status(400).json({ error: validationError });
  }
  try {
    const result = await PDL.add(req.body);
    console.log('PDL added with ID:', result.insertId);
    res.status(201).json({ id: result.insertId, ...req.body });
  } catch (err) {
    console.error('Error in addPdl:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.updatePdl = async (req, res) => {
  console.log('updatePdl called with id:', req.params.id, 'body:', req.body);
  const validationError = validatePdlData(req.body);
  if (validationError) {
    console.log('Validation error:', validationError);
    return res.status(400).json({ error: validationError });
  }
  try {
    await PDL.update(req.params.id, req.body);
    console.log('PDL updated with id:', req.params.id);
    res.json({ message: 'PDL updated' });
  } catch (err) {
    console.error('Error in updatePdl:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.deletePdl = async (req, res) => {
  try {
    await PDL.delete(req.params.id);
    res.json({ message: 'PDL deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteAllPdls = async (req, res) => {
  try {
    const result = await PDL.deleteAll();
    res.json({ 
      message: 'All PDLs deleted successfully',
      deletedCount: result.affectedRows 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};