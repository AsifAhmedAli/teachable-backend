const bcrypt = require('bcrypt');
const db = require('../DB/db.js');
const Joi = require('joi');
const { sendEmail } = require('../utils/emailService.js');
const cloudinary = require('cloudinary').v2;
const fs = require('fs').promises;
const path = require('path');
const jwt = require('jsonwebtoken');




// #### STUDENT LOGIN
const student_login = async (req, res) => {
    try {
      // Validate request data using Joi
      const schema = Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().required(),
      });
  
      const { error } = schema.validate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }
  
      const { email, password } = req.body;
  
      // Check if the student with the provided email exists
      const checkStudentQuery = 'SELECT * FROM students WHERE email = ?';
      const [student] = await db.query(checkStudentQuery, [email]);
  
      if (student.length === 0) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
  
      // Verify the password
      const isPasswordValid = await bcrypt.compare(password, student[0].password);
  
      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
  
      // Create a JWT token
      const token = jwt.sign({ studentId: student[0].student_id, email: student[0].email }, process.env.JWT_SECRET_STUDENT, {
        expiresIn: '2d', // Token will expire in 2 days
      });
  
      // Set the JWT as a cookie
      res.cookie('teachablesstudentaccesstoken', token, { maxAge: 2 * 24 * 60 * 60 * 1000, httpOnly: true });
  
      res.status(200).json({ message: 'Login successful', token:token });
    } catch (error) {
      console.error('Error during student login:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };






//   #### ADD CREDIT CARD DETAILS API

const add_credit_card = async (req, res) => {
    try {
      const creditCardSchema = Joi.object({
        student_id: Joi.number().required(),
        card_number: Joi.string().creditCard().required(),
        card_holder_name: Joi.string().required(),
        expiration_date: Joi.date().iso().required(),
        cvv: Joi.string().required(),
        country: Joi.string().required(),
        postal_code: Joi.string().required(),
      });
  
      const { error } = creditCardSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }
  
      const {
        student_id,
        card_number,
        card_holder_name,
        expiration_date,
        cvv,
        country,
        postal_code,
      } = req.body;
  
      try {
        // Check if the student exists in the database
        const [studentRows] = await db.query(
          'SELECT * FROM students WHERE student_id = ?',
          [student_id]
        );
  
        if (studentRows.length === 0) {
          return res.status(404).json({ error: 'Student not found' });
        }
  
        // Check if a card is already associated with the student
        const [existingCardRows] = await db.query(
          'SELECT * FROM credit_cards WHERE student_id = ?',
          [student_id]
        );
  
        if (existingCardRows.length > 0) {
          return res.status(400).json({
            error: 'A credit card is already associated with this student',
          });
        }
  
        // Insert the credit card information into the database
        const [result] = await db.query(
          'INSERT INTO credit_cards (student_id, card_number, card_holder_name, expiration_date, cvv, country, postal_code) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [
            student_id,
            card_number,
            card_holder_name,
            expiration_date,
            cvv,
            country,
            postal_code,
          ]
        );
  
        return res.status(201).json({ message: 'Credit card added successfully' });
      } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal server error' });
      }
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
  
  
  
  
  const billingAddressSchema = Joi.object({
    student_id: Joi.number().required(),
    address_line1: Joi.string().required(),
    address_line2: Joi.string().allow('').optional(),
    city: Joi.string().required(),
    state: Joi.string().required(),
    zip_code: Joi.string().required(),
    country: Joi.string().required(),
    business_name: Joi.string().allow('').optional(),
  });
  
  
  // Controller function to add a billing address
  const add_billing_address = async (req, res) => {
    try {
      const { error } = billingAddressSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }
  
      const {
        student_id,
        address_line1,
        address_line2,
        city,
        state,
        zip_code,
        country,
        business_name,
      } = req.body;
  
      // Check if the student exists in the database
      const [student] = await db.query('SELECT * FROM students WHERE student_id = ?', [
        student_id,
      ]);
  
      if (student.length === 0) {
        return res.status(404).json({ error: 'Student not found' });
      }

      // Check if the authenticated user's ID matches the requested student_id
      if (student_id !== req.user.studentId) {
        return res.status(403).json({ error: 'You are not authorized to perform this action' });
      }
  
      // Check if the student already has an address
      const [existingAddress] = await db.query(
        'SELECT * FROM billing_addresses WHERE student_id = ?',
        [student_id]
      );
  
      if (existingAddress.length > 0) {
        return res.status(400).json({ error: 'Student already has an address' });
      }
  
      try {
        // Insert the billing address into the database
        const [result] = await db.query(
          'INSERT INTO billing_addresses (student_id, address_line1, address_line2, city, state, zip_code, country, business_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [
            student_id,
            address_line1,
            address_line2,
            city,
            state,
            zip_code,
            country,
            business_name,
          ]
        );
  
        return res
          .status(201)
          .json({ message: 'Billing address added successfully' });
      } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal server error' });
      }
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
  
  
// ##### ADD DELIVERY ADDRESS

const deliveryAddressSchema = Joi.object({
    student_id: Joi.number().required(),
    copy_billing_address: Joi.boolean().required(),
    address_line1: Joi.when('copy_billing_address', {
      is: false,
      then: Joi.string().required(),
      otherwise: Joi.string().allow('').optional(),
    }),
    address_line2: Joi.when('copy_billing_address', {
      is: false,
      then: Joi.string().allow('').optional(),
      otherwise: Joi.string().allow('').optional(),
    }),
    city: Joi.when('copy_billing_address', {
      is: false,
      then: Joi.string().required(),
      otherwise: Joi.string().allow('').optional(),
    }),
    state: Joi.when('copy_billing_address', {
      is: false,
      then: Joi.string().required(),
      otherwise: Joi.string().allow('').optional(),
    }),
    zip_code: Joi.when('copy_billing_address', {
      is: false,
      then: Joi.string().required(),
      otherwise: Joi.string().allow('').optional(),
    }),
    country: Joi.when('copy_billing_address', {
      is: false,
      then: Joi.string().required(),
      otherwise: Joi.string().allow('').optional(),
    }),
    business_name: Joi.when('copy_billing_address', {
      is: false,
      then: Joi.string().allow('').optional(),
      otherwise: Joi.string().allow('').optional(),
    }),
  }).or('address_line1', 'address_line2', 'city', 'state', 'zip_code', 'country', 'business_name');
  

  // Controller function to add a delivery address, with an option to copy billing address
// #### ADD DELIVERY ADDRESS BY STUDENT

const add_delivery_address = async (req, res) => {
    try {
      const { error } = deliveryAddressSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }
  
      const {
        student_id,
        address_line1,
        address_line2,
        city,
        state,
        zip_code,
        country,
        business_name,
        copy_billing_address,
      } = req.body;
  
      // Check if the student exists in the database
      const [student] = await db.query('SELECT * FROM students WHERE student_id = ?', [
        student_id,
      ]);
  
      if (student.length === 0) {
        return res.status(404).json({ error: 'Student not found' });
      }

      
      // Check if the authenticated user's ID matches the requested student_id
      if (student_id !== req.user.studentId) {
        return res.status(403).json({ error: 'You are not authorized to perform this action' });
      }
  
      // Check if the student already has an address
      const [existingAddress] = await db.query(
        'SELECT * FROM delivery_addresses WHERE student_id = ?',
        [student_id]
      );
  
      if (existingAddress.length > 0) {
        return res
          .status(400)
          .json({ error: 'Student already has a delivery address' });
      }
  
      try {
        if (copy_billing_address) {
          // Copy the billing address to the delivery address
          const [billingAddress] = await db.query(
            'SELECT * FROM billing_addresses WHERE student_id = ?',
            [student_id]
          );
  
          if (billingAddress.length === 0) {
            return res.status(404).json({ error: 'Billing address not found' });
          }
  
          const billingData = billingAddress[0];
  
          const [result] = await db.query(
            'INSERT INTO delivery_addresses (student_id, address_line1, address_line2, city, state, zip_code, country, business_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [
              student_id,
              billingData.address_line1,
              billingData.address_line2,
              billingData.city,
              billingData.state,
              billingData.zip_code,
              billingData.country,
              billingData.business_name,
            ]
          );
  
          return res.status(201).json({
            message: 'Delivery address added successfully (Copied from billing)',
          });
        } else {
          // Insert the provided delivery address into the database
          const [result] = await db.query(
            'INSERT INTO delivery_addresses (student_id, address_line1, address_line2, city, state, zip_code, country, business_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [
              student_id,
              address_line1,
              address_line2,
              city,
              state,
              zip_code,
              country,
              business_name,
            ]
          );
  
          return res.status(201).json({ message: 'Delivery address added successfully' });
        }
      } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal server error' });
      }
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };



//   #### EDIT USER PROFILE 

// Controller function to update student credentials
const edit_profile = async (req, res) => {
    try {
      const { student_id, name, email } = req.body;

    //   console.log(req.user)
  
      // // Check if the authenticated user's ID matches the requested student_id
      // if (student_id != req.user.studentId) {
      //   return res.status(403).json({ error: 'You are not authorized to update this profile' });
      // }

      
      // if (!name || !email) {
      //   return res.status(404).json({ error: 'field can not be empty' });
      // }
  
      // Check if the student exists in the database
      const [student] = await db.query('SELECT * FROM students WHERE student_id = ?', [student_id]);
  
      if (student.length === 0) {
        return res.status(404).json({ error: 'Student not found' });
      }
  
      // Update student credentials
      const updateData = {};
      if (name) {
        updateData.name = name;
      }
      if (email) {
        updateData.email = email;
      }
  
      await db.query('UPDATE students SET ? WHERE student_id = ?', [updateData, student_id]);
  
      return res.json({ message: 'Student credentials updated successfully' });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
  

//   ######## CHANGE STUDENT PASSWORD

// Controller function to change student password
const change_password = async (req, res) => {

    // Define a schema for changing student password
const changeStudentPasswordSchema = Joi.object({
    student_id: Joi.number().required(),
    new_password: Joi.string().required(),
    confirm_new_password: Joi.string()
      .required()
      .valid(Joi.ref('new_password'))
      .messages({ 'any.only': 'Passwords do not match' }),
  });
  
    try {
      
      const {student_id, new_password, confirm_new_password } = req.body;
  
      // // Check if the authenticated user's ID matches the requested student_id
      // if (student_id != req.user.studentId) {
      //   return res.status(403).json({ error: 'You are not authorized to change this password' });
      // }
  
      // Validate the provided data against the schema
      const { error } = changeStudentPasswordSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }
  
      // Update the password with the new one (hash the new password)
      const hashedNewPassword = await bcrypt.hash(new_password, 10); // Implement your password hashing logic
      await db.query('UPDATE students SET password = ? WHERE student_id = ?', [hashedNewPassword, student_id]);
  
      return res.json({ message: 'Password updated successfully' });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
  
//   #### EDIT CREDIT CARD


const edit_credit_card = async (req, res) => {
    try {
      const {
        student_id,
        card_number,
        card_holder_name,
        expiration_date,
        cvv,
        country,
        postal_code,
      } = req.body;
  
      // Check if the student exists in the database
      const [studentRows] = await db.query('SELECT * FROM students WHERE student_id = ?', [student_id]);
  
      if (studentRows.length === 0) {
        return res.status(404).json({ error: 'Student not found' });
      }

      if (student_id !== req.user.studentId) {
        return res.status(403).json({ error: 'You are not authorized to update these records' });
      }
  
      // Check if a credit card is associated with the student
      const [existingCardRows] = await db.query('SELECT * FROM credit_cards WHERE student_id = ?', [student_id]);
  
      if (existingCardRows.length === 0) {
        return res.status(404).json({ error: 'No credit card associated with this student' });
      }
  
      // Construct an update query based on the fields provided in the request
      let updateQuery = 'UPDATE credit_cards SET ';
      const updateValues = [];
  
      if (card_number) {
        updateQuery += 'card_number = ?, ';
        updateValues.push(card_number);
      }
      if (card_holder_name) {
        updateQuery += 'card_holder_name = ?, ';
        updateValues.push(card_holder_name);
      }
      if (expiration_date) {
        updateQuery += 'expiration_date = ?, ';
        updateValues.push(expiration_date);
      }
      if (cvv) {
        updateQuery += 'cvv = ?, ';
        updateValues.push(cvv);
      }
      if (country) {
        updateQuery += 'country = ?, ';
        updateValues.push(country);
      }
      if (postal_code) {
        updateQuery += 'postal_code = ?, ';
        updateValues.push(postal_code);
      }
  
      // Remove the trailing comma and space from the updateQuery
      updateQuery = updateQuery.slice(0, -2);
  
      // Add a WHERE clause to ensure the update is only applied to the student's card
      updateQuery += ' WHERE student_id = ?';
      updateValues.push(student_id);
  
      // Perform the update
      await db.query(updateQuery, updateValues);
  
      return res.json({ message: 'Credit card updated successfully' });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
  
//   ######### EDIT BILLING ADDRESS API 

const edit_billing_address = async (req, res) => {
    try {
      const { student_id, address_line1, address_line2, city, state, zip_code, country, business_name } = req.body;
  
      // Check if the student exists in the database
      const [student] = await db.query('SELECT * FROM students WHERE student_id = ?', [student_id]);
  
      if (student.length === 0) {
        return res.status(404).json({ error: 'Student not found' });
      }
  
      // Check if the authenticated user's ID matches the requested student_id
      if (student_id !== req.user.studentId) {
        return res.status(403).json({ error: 'You are not authorized to perform this action' });
      }
  
      // Check if the student has an existing billing address
      const [existingBillingAddress] = await db.query('SELECT * FROM billing_addresses WHERE student_id = ?', [student_id]);
  
      if (existingBillingAddress.length === 0) {
        return res.status(404).json({ error: 'Billing address not found' });
      }
  
      // Construct an update query based on the fields provided in the request
      let updateQuery = 'UPDATE billing_addresses SET ';
      const updateValues = [];
  
      if (address_line1) {
        updateQuery += 'address_line1 = ?, ';
        updateValues.push(address_line1);
      }
      if (address_line2) {
        updateQuery += 'address_line2 = ?, ';
        updateValues.push(address_line2);
      }
      if (city) {
        updateQuery += 'city = ?, ';
        updateValues.push(city);
      }
      if (state) {
        updateQuery += 'state = ?, ';
        updateValues.push(state);
      }
      if (zip_code) {
        updateQuery += 'zip_code = ?, ';
        updateValues.push(zip_code);
      }
      if (country) {
        updateQuery += 'country = ?, ';
        updateValues.push(country);
      }
      if (business_name) {
        updateQuery += 'business_name = ?, ';
        updateValues.push(business_name);
      }
  
      // Remove the trailing comma and space from the updateQuery
      updateQuery = updateQuery.slice(0, -2);
  
      // Add a WHERE clause to ensure the update is only applied to the student's billing address
      updateQuery += ' WHERE student_id = ?';
      updateValues.push(student_id);
  
      // Perform the update
      await db.query(updateQuery, updateValues);
  
      return res.json({ message: 'Billing address updated successfully' });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
  
//  ##### EDIT DELIVERY ADDRESS API

const edit_delivery_address = async (req, res) => {
    try {
      const { student_id, address_line1, address_line2, city, state, zip_code, country, business_name, copy_billing_address } = req.body;
  
      // Check if the student exists in the database
      const [student] = await db.query('SELECT * FROM students WHERE student_id = ?', [student_id]);
  
      if (student.length === 0) {
        return res.status(404).json({ error: 'Student not found' });
      }
  
      // Check if the authenticated user's ID matches the requested student_id
      if (student_id !== req.user.studentId) {
        return res.status(403).json({ error: 'You are not authorized to perform this action' });
      }
  
      // Check if the student has an existing delivery address
      const [existingDeliveryAddress] = await db.query('SELECT * FROM delivery_addresses WHERE student_id = ?', [student_id]);
  
      if (existingDeliveryAddress.length === 0) {
        return res.status(404).json({ error: 'Delivery address not found' });
      }
  
      try {
        if (copy_billing_address) {
          // Copy the billing address to the delivery address
          const [billingAddress] = await db.query('SELECT * FROM billing_addresses WHERE student_id = ?', [student_id]);
  
          if (billingAddress.length === 0) {
            return res.status(404).json({ error: 'Billing address not found' });
          }
  
          const billingData = billingAddress[0];
  
          // Update the delivery address with billing address data
          await db.query(
            'UPDATE delivery_addresses SET address_line1 = ?, address_line2 = ?, city = ?, state = ?, zip_code = ?, country = ?, business_name = ? WHERE student_id = ?',
            [
              billingData.address_line1,
              billingData.address_line2,
              billingData.city,
              billingData.state,
              billingData.zip_code,
              billingData.country,
              billingData.business_name,
              student_id,
            ]
          );
  
          return res.status(200).json({
            message: 'Delivery address updated successfully (Copied from billing)',
          });
        } else {
          // Construct an update query based on the fields provided in the request
          let updateQuery = 'UPDATE delivery_addresses SET ';
          const updateValues = [];
  
          if (address_line1) {
            updateQuery += 'address_line1 = ?, ';
            updateValues.push(address_line1);
          }
          if (address_line2) {
            updateQuery += 'address_line2 = ?, ';
            updateValues.push(address_line2);
          }
          if (city) {
            updateQuery += 'city = ?, ';
            updateValues.push(city);
          }
          if (state) {
            updateQuery += 'state = ?, ';
            updateValues.push(state);
          }
          if (zip_code) {
            updateQuery += 'zip_code = ?, ';
            updateValues.push(zip_code);
          }
          if (country) {
            updateQuery += 'country = ?, ';
            updateValues.push(country);
          }
          if (business_name) {
            updateQuery += 'business_name = ?, ';
            updateValues.push(business_name);
          }
  
          // Remove the trailing comma and space from the updateQuery
          updateQuery = updateQuery.slice(0, -2);
  
          // Add a WHERE clause to ensure the update is only applied to the student's delivery address
          updateQuery += ' WHERE student_id = ?';
          updateValues.push(student_id);
  
          // Perform the update
          await db.query(updateQuery, updateValues);
  
          return res.json({ message: 'Delivery address updated successfully' });
        }
      } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal server error' });
      }
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
  
//  GET SINGLE STUDENT

const get_single_student = async (req, res) => {
    try {
      // Get the student_id from body
      const { student_id } = req.params;
      //  // Check if the authenticated user's ID matches the requested student_id
      //  if (student_id != req.user.studentId) {
      //   return res.status(403).json({ error: 'You are not authorized to perform this action' });
      // }
  
      // Check if the student exists in the database
      const [student] = await db.query('SELECT * FROM students WHERE student_id = ?', [student_id]);
  
      if (student.length === 0) {
        return res.status(404).json({ error: 'Student not found' });
      }
      
     
      // Return the student's profile information
      return res.status(200).json({ student: student[0] });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
  
  
// GET CREDIT CARD DETAILS

const get_credit_card_details = async (req, res) => {
    try {
      // Get the student_id from body
      const { student_id } = req.body;
  
      // Check if the student exists in the database
      const [student] = await db.query('SELECT * FROM students WHERE student_id = ?', [student_id]);
      // Check if the authenticated user's ID matches the requested student_id
      if (student_id !== req.user.studentId) {
        return res.status(403).json({ error: 'You are not authorized to perform this action' });
      }
  
  
      if (student.length === 0) {
        return res.status(404).json({ error: 'Student not found' });
      }
  
      // Query the database to fetch the credit card details for the student
      const [creditCards] = await db.query('SELECT * FROM credit_cards WHERE student_id = ?', [student_id]);
  
      // Return the credit card details (if any) for the student
      return res.status(200).json({ credit_cards: creditCards });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
  
//   #### GET BILLING ADDRESS

const get_billing_address = async (req, res) => {
    try {
      // Get the student_id from the body
      const { student_id } = req.body;
  
      // Check if the student exists in the database
      const [student] = await db.query('SELECT * FROM students WHERE student_id = ?', [student_id]);
  
      if (student.length === 0) {
        return res.status(404).json({ error: 'Student not found' });
      }
    // Check if the authenticated user's ID matches the requested student_id
    if (student_id !== req.user.studentId) {
        return res.status(403).json({ error: 'You are not authorized to perform this action' });
      }
      // Query the database to fetch the billing address for the student
      const [billingAddress] = await db.query('SELECT * FROM billing_addresses WHERE student_id = ?', [student_id]);
  
      // Return the billing address (if any) for the student
      return res.status(200).json({ billing_address: billingAddress });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };

    // #### GET DELIVERY ADDRESS

    const get_delivery_address = async (req, res) => {
        try {
          // Get the student_id from the body
          const { student_id } = req.body;
      
          // Check if the student exists in the database
          const [student] = await db.query('SELECT * FROM students WHERE student_id = ?', [student_id]);
      
          if (student.length === 0) {
            return res.status(404).json({ error: 'Student not found' });
          }
          // Check if the authenticated user's ID matches the requested student_id
      if (student_id !== req.user.studentId) {
        return res.status(403).json({ error: 'You are not authorized to perform this action' });
      }
      
          // Query the database to fetch the delivery address for the student
          const [deliveryAddress] = await db.query('SELECT * FROM delivery_addresses WHERE student_id = ?', [student_id]);
      
          // Return the delivery address (if any) for the student
          return res.status(200).json({ delivery_address: deliveryAddress });
        } catch (error) {
          console.error(error);
          return res.status(500).json({ error: 'Internal server error' });
        }
      };
      

    //   #### STUDENT LOGOUT

    // API to log out a student
const student_logout = (req, res) => {
    try {
      // Clear the JWT token from the cookie
      res.clearCookie('teachablesstudentaccesstoken');
  
      res.status(200).json({ message: 'Logout successful' });
    } catch (error) {
      console.error('Error during student logout:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
  
// ####### GET STUDENT COURSES

const get_student_courses = async (req, res) => {
  try {
    // Get the student_id from the params
    const { student_id } = req.params;

    // Assuming you have a linking table named student_courses
    const query = `
      SELECT courses.course_id, courses.title, courses.description, courses.status,courses.created_at,
             videos.video_id, videos.video_title, videos.video_url
      FROM courses
      INNER JOIN enrollments ON courses.course_id = enrollments.course_id
      LEFT JOIN videos ON courses.course_id = videos.course_id
      WHERE enrollments.student_id = ?
      GROUP BY courses.course_id, videos.video_id
    `;

    const [courses] = await db.query(query, [student_id]);

    // Group videos by course_id
    const coursesWithVideos = courses.reduce((acc, item) => {
      const existingCourse = acc.find(c => c.course_id === item.course_id);

      if (existingCourse) {
        if (item.video_id) {
          existingCourse.videos.push({
            video_id: item.video_id,
            video_url: item.video_url,
            video_title: item.video_title,
          });
        }
      } else {
        acc.push({
          course_id: item.course_id,
          title: item.title,
          description: item.description,
          status: item.status,
          created_at: item.created_at,
          videos: item.video_id
            ? [{ video_id: item.video_id, video_url: item.video_url, video_title: item.video_title }]
            : [],
        });
      }

      return acc;
    }, []);

    res.json({ courses: coursesWithVideos });
  } catch (error) {
    console.error('Error retrieving courses:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};



// #### GET SINGLE COURSE DETAILS

const get_single_course = async (req, res) => {
  try {
    const { student_id, course_id } = req.params;

    // Assuming you have a linking table named student_courses
    const query = `
      SELECT courses.course_id, courses.title, courses.description, courses.status,
             videos.video_id, videos.video_title, videos.video_url
      FROM courses
      INNER JOIN enrollments ON courses.course_id = enrollments.course_id
      LEFT JOIN videos ON courses.course_id = videos.course_id
      WHERE enrollments.student_id = ? AND courses.course_id = ?
      GROUP BY courses.course_id, videos.video_id
    `;

    const [course] = await db.query(query, [student_id, course_id]);

    // If the course is not found, return a 404 status
    if (!course.length) {
      return res.status(404).json({ error: 'Course not found for the specified student' });
    }

    // Group videos by course_id
    const courseWithVideos = course.reduce((acc, item) => {
      const existingCourse = acc.find(c => c.course_id === item.course_id);
    
      if (existingCourse) {
        if (item.video_id) {
          existingCourse.videos.push({
            video_id: item.video_id,
            video_url: item.video_url,
            video_title: item.video_title,
          });
        }
      } else {
        acc.push({
          course_id: item.course_id,
          title: item.title,
          description: item.description,
          status: item.status,
          videos: item.video_id
            ? [{ video_id: item.video_id, video_url: item.video_url, video_title: item.video_title }]
            : [],
        });
      }
    
      return acc;
    }, []);
    

    res.json({ course: courseWithVideos[0] }); // Assuming the result is a single course
  } catch (error) {
    console.error('Error retrieving single course:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};


// SEARCH COURSES API

const search_courses = async (req, res) => {
  try {
    const { query } = req.query;

    // Assuming you have a courses table with title and description fields
    const searchQuery = `
      SELECT course_id, title, description, status, created_at
      FROM courses
      WHERE title LIKE ? OR description LIKE ?
    `;

    const [courses] = await db.query(searchQuery, [`%${query}%`, `%${query}%`]);

    res.json({ courses: courses });
  } catch (error) {
    console.error('Error searching courses:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }

};






  module.exports = {
    student_login,
    add_credit_card,
    add_billing_address,
    add_delivery_address,
    edit_profile,
    change_password,
    edit_credit_card,
    edit_billing_address,
    edit_delivery_address,
    get_single_student,
    get_credit_card_details,
    get_billing_address,
    get_delivery_address,
    student_logout,
    get_student_courses,
    get_single_course,
    search_courses


     
   };