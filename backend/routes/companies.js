const express = require('express');
const { Company } = require('../models');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// Create a new company
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, address, website } = req.body;

    // Validate required fields
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Company name and email are required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    // Check if company with this email already exists
    const existingCompany = await Company.findOne({
      where: { email: email.toLowerCase() }
    });

    if (existingCompany) {
      return res.status(409).json({
        success: false,
        message: 'A company with this email already exists'
      });
    }

    // Create the company
    const company = await Company.create({
      id: uuidv4(),
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone?.trim() || null,
      address: address?.trim() || null,
      website: website?.trim() || null,
      isActive: true
    });

    res.status(201).json({
      success: true,
      message: 'Company created successfully',
      data: {
        id: company.id,
        name: company.name,
        email: company.email,
        phone: company.phone,
        address: company.address,
        website: company.website,
        isActive: company.isActive,
        createdAt: company.createdAt
      }
    });

  } catch (error) {
    console.error('Error creating company:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while creating company'
    });
  }
});

// Get all companies (admin only - you might want to add auth middleware later)
router.get('/', async (req, res) => {
  try {
    const companies = await Company.findAll({
      attributes: ['id', 'name', 'email', 'phone', 'address', 'website', 'isActive', 'createdAt', 'updatedAt'],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: companies,
      count: companies.length
    });

  } catch (error) {
    console.error('Error fetching companies:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching companies'
    });
  }
});

// Get company by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const company = await Company.findByPk(id, {
      attributes: ['id', 'name', 'email', 'phone', 'address', 'website', 'isActive', 'createdAt', 'updatedAt']
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    res.json({
      success: true,
      data: company
    });

  } catch (error) {
    console.error('Error fetching company:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching company'
    });
  }
});

// Update company
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, address, website, isActive } = req.body;

    const company = await Company.findByPk(id);

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    // Validate email if provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid email address'
        });
      }

      // Check if another company with this email exists
      const existingCompany = await Company.findOne({
        where: { 
          email: email.toLowerCase(),
          id: { [require('sequelize').Op.ne]: id }
        }
      });

      if (existingCompany) {
        return res.status(409).json({
          success: false,
          message: 'A company with this email already exists'
        });
      }
    }

    // Update company
    await company.update({
      name: name?.trim() || company.name,
      email: email?.toLowerCase().trim() || company.email,
      phone: phone?.trim() || company.phone,
      address: address?.trim() || company.address,
      website: website?.trim() || company.website,
      isActive: isActive !== undefined ? isActive : company.isActive
    });

    res.json({
      success: true,
      message: 'Company updated successfully',
      data: {
        id: company.id,
        name: company.name,
        email: company.email,
        phone: company.phone,
        address: company.address,
        website: company.website,
        isActive: company.isActive,
        updatedAt: company.updatedAt
      }
    });

  } catch (error) {
    console.error('Error updating company:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while updating company'
    });
  }
});

// Delete company (soft delete by setting isActive to false)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const company = await Company.findByPk(id);

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    // Soft delete by setting isActive to false
    await company.update({ isActive: false });

    res.json({
      success: true,
      message: 'Company deactivated successfully'
    });

  } catch (error) {
    console.error('Error deleting company:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while deleting company'
    });
  }
});

module.exports = router;