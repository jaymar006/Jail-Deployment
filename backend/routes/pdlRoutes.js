const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET all PDLs
router.get('/', async (req, res) => {
  const [rows] = await db.query('SELECT * FROM pdls');
  res.json(rows);
});

// GET single PDL by ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.query('SELECT * FROM pdls WHERE id = ?', [id]);
    if (rows.length > 0) {
      res.json(rows[0]);
    } else {
      res.status(404).json({ message: 'PDL not found' });
    }
  } catch (err) {
    console.error('Error fetching PDL by ID:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST new PDL
router.post('/', async (req, res) => {
  const {
    first_name, last_name, middle_name, cell_number,
    criminal_case_no, offense_charge, court_branch,
    arrest_date, commitment_date, first_time_offender
  } = req.body;

  try {
    const [result] = await db.query(
      `INSERT INTO pdls 
        (first_name, last_name, middle_name, cell_number, 
         criminal_case_no, offense_charge, court_branch, 
         arrest_date, commitment_date, first_time_offender)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,

      [
        first_name, last_name, middle_name, cell_number,
        criminal_case_no, offense_charge, court_branch,
        arrest_date, commitment_date, first_time_offender
      ]
    );
    res.status(201).json({ message: 'PDL added successfully', id: result.insertId });
  } catch (err) {
    console.error('Error adding PDL:', err);
    res.status(500).json({ error: 'Failed to add PDL', details: err.message });
  }
});

// PUT update PDL
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const {
    first_name, last_name, middle_name, cell_number,
    criminal_case_no, offense_charge, court_branch,
    arrest_date, commitment_date, first_time_offender
  } = req.body;

  try {
    await db.query(
      `UPDATE pdls SET 
         first_name = ?, last_name = ?, middle_name = ?, cell_number = ?, 
         criminal_case_no = ?, offense_charge = ?, court_branch = ?, 
         arrest_date = ?, commitment_date = ?, first_time_offender = ?
       WHERE id = ?`,
      [
        first_name, last_name, middle_name, cell_number,
        criminal_case_no, offense_charge, court_branch,
        arrest_date, commitment_date, first_time_offender,
        id
      ]
    );
    res.json({ message: 'PDL updated successfully' });
  } catch (err) {
    console.error('Error updating PDL:', err);
    res.status(500).json({ error: 'Failed to update PDL' });
  }
});

// DELETE ALL PDLs
router.delete('/', async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM pdls');
    res.json({ 
      message: 'All PDLs deleted successfully',
      deletedCount: result.affectedRows 
    });
  } catch (err) {
    console.error('Error deleting all PDLs:', err);
    res.status(500).json({ error: 'Failed to delete all PDLs' });
  }
});

// DELETE PDL
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM pdls WHERE id = ?', [id]);
    res.json({ message: 'PDL deleted successfully' });
  } catch (err) {
    console.error('Error deleting PDL:', err);
    res.status(500).json({ error: 'Failed to delete PDL' });
  }
});

router.get('/with-visitors', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        pdls.id AS pdl_id,
        pdls.first_name AS pdl_first_name,
        pdls.last_name AS pdl_last_name,
        pdls.middle_name AS pdl_middle_name,
        visitors.id AS visitor_id,
        visitors.name AS visitor_name,
        visitors.relationship,
        visitors.age,
        visitors.address,
        visitors.valid_id,
        visitors.date_of_application,
        visitors.contact_number
      FROM pdls
      LEFT JOIN visitors ON pdls.id = visitors.pdl_id
      ORDER BY pdls.last_name, pdls.first_name, visitors.name
    `);

    // Group visitors by PDL
    const pdlMap = new Map();
    rows.forEach(row => {
      const pdlId = row.pdl_id;
      if (!pdlMap.has(pdlId)) {
        pdlMap.set(pdlId, {
          pdl_id: pdlId,
          pdl_first_name: row.pdl_first_name,
          pdl_last_name: row.pdl_last_name,
          pdl_middle_name: row.pdl_middle_name,
          visitors: []
        });
      }
      if (row.visitor_id) {
        pdlMap.get(pdlId).visitors.push({
          visitor_id: row.visitor_id,
          visitor_name: row.visitor_name,
          relationship: row.relationship,
          age: row.age,
          address: row.address,
          valid_id: row.valid_id,
          date_of_application: row.date_of_application,
          contact_number: row.contact_number
        });
      }
    });

    // Convert map to array
    const result = Array.from(pdlMap.values());
    res.json(result);
  } catch (err) {
    console.error('Error fetching PDLs with visitors:', err);
    res.status(500).json({ error: 'Failed to fetch PDLs with visitors' });
  }
});

module.exports = router;
