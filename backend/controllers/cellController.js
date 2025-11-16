const Cell = require('../models/cellModel');

const validateCellData = (data) => {
  const requiredFields = ['cell_number'];
  for (const field of requiredFields) {
    if (!data[field]) {
      return `Field '${field}' is required`;
    }
  }
  return null;
};

exports.getAllCells = async (req, res) => {
  try {
    const results = await Cell.getAll();
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getActiveCells = async (req, res) => {
  try {
    const results = await Cell.getActive();
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getCellById = async (req, res) => {
  try {
    const { id } = req.params;
    const cell = await Cell.getById(id);
    if (!cell) {
      return res.status(404).json({ error: 'Cell not found' });
    }
    res.json(cell);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.addCell = async (req, res) => {
  console.log('addCell called with body:', req.body);
  const validationError = validateCellData(req.body);
  if (validationError) {
    console.log('Validation error:', validationError);
    return res.status(400).json({ error: validationError });
  }
  
  try {
    const result = await Cell.add(req.body);
    console.log('Cell added with ID:', result.insertId);
    res.status(201).json({ id: result.insertId, ...req.body });
  } catch (err) {
    console.error('Error in addCell:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.updateCell = async (req, res) => {
  console.log('updateCell called with id:', req.params.id, 'body:', req.body);
  const validationError = validateCellData(req.body);
  if (validationError) {
    console.log('Validation error:', validationError);
    return res.status(400).json({ error: validationError });
  }
  
  try {
    await Cell.update(req.params.id, req.body);
    console.log('Cell updated with id:', req.params.id);
    res.json({ message: 'Cell updated' });
  } catch (err) {
    console.error('Error in updateCell:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.deleteCell = async (req, res) => {
  try {
    await Cell.delete(req.params.id);
    res.json({ message: 'Cell deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
