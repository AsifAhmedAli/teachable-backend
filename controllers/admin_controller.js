const bcrypt = require('bcrypt');
const db = require('../DB/db.js');
const Joi = require('joi');
const { sendEmail } = require('../utils/emailService.js');
const cloudinary = require('cloudinary').v2;
const fs = require('fs').promises;
const path = require('path');
const jwt = require('jsonwebtoken');






// ##### ADMIN LOGIN API

const admin_login = async (req, res) => {
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

        // Check if the admin with the provided email exists
        const checkAdminQuery = 'SELECT * FROM admins WHERE email = ?';
        const [admin] = await db.query(checkAdminQuery, [email]);

        if (admin.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Compare the provided password with the hashed password from the database
        const isPasswordValid = password === admin[0].password;

        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // If password verification is successful, create a JWT
        const token = jwt.sign({ userId: admin[0].admin_id, email: admin[0].email }, process.env.JWT_SECRET_ADMIN, {
            expiresIn: '2d', // Token will expire in 2 days
        });

        // Set the JWT as a cookie
        res.cookie('teachablesadminaccesstoken', token, { maxAge: 2 * 24 * 60 * 60 * 1000, httpOnly: true });

        res.status(200).json({ message: 'Login successful', token: token });
    } catch (error) {
        console.error('Error during admin login:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};



// ### new student
const register_new_student = async (req, res) => {
    try {
      // Validate request data using Joi
      const schema = Joi.object({
        name: Joi.string().required(),
        email: Joi.string().email().required(),
        password: Joi.string().required(),
      });
  
      const { error } = schema.validate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }
  
      const {  name, email,  password } = req.body;
  
      // Check if the student with the provided email already exists
      const checkExistingQuery = 'SELECT * FROM students WHERE email = ?';
      const [existingStudent] = await db.query(checkExistingQuery, [email]);
  
      if (existingStudent.length > 0) {
        return res.status(409).json({ error: 'Student with this email already exists' });
      }
  
      // Hash the password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
  
      // Insert the student into the database
      const insertQuery = 'INSERT INTO students (name, email, password) VALUES (?, ?, ?)';
      const values = [name, email, hashedPassword];
  
      await db.query(insertQuery, values);
  
      // Send registration email to the student
      const emailSubject = 'Welcome to Teachables';
      const emailText = `Dear ${name},\n\nYou have successfully registered at Teachables. Your login credentials are:\nEmail: ${email}\nPassword: ${password}\n\nThank you for joining!`;
  
      await sendEmail(email, emailSubject, emailText);
  
      res.status(201).json({ message: 'Student registered successfully' });
    } catch (error) {
      console.error('Error registering student:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };



// ##### REGISTER NEW TEACHER

const register_new_teacher = async (req, res) => {
    try {
        // Validate request data using Joi
        const schema = Joi.object({
            name: Joi.string().required(),
            email: Joi.string().email().required(),
            password: Joi.string().required(),
        });

        const { error } = schema.validate(req.body);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        const { name, email, password } = req.body;

        // Check if the teacher with the provided email already exists
        const checkExistingQuery = 'SELECT * FROM teachers WHERE email = ?';
        const [existingTeacher] = await db.query(checkExistingQuery, [email]);

        if (existingTeacher.length > 0) {
            return res.status(409).json({ error: 'Teacher with this email already exists' });
        }

        // Hash the password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Insert the teacher into the database
        const insertQuery = 'INSERT INTO teachers (name, email, password) VALUES (?, ?, ?)';
        const values = [name, email, hashedPassword];

        await db.query(insertQuery, values);

        // Send registration email to the teacher
        const emailSubject = 'Welcome to Teachables';
        const emailText = `Dear ${name},\n\nYou have successfully registered at Teachables. Your login credentials are:\nEmail: ${email}\nPassword: ${password}\n\nThank you for joining!`;

        await sendEmail(email, emailSubject, emailText);

        res.status(201).json({ message: 'Teacher registered successfully' });
    } catch (error) {
        console.error('Error registering teacher:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};


// ##### CREATE COURSE 


const create_course = async (req, res) => {
    try {
        // Validate request data using Joi
        const schema = Joi.object({
            title: Joi.string().required(),
            description: Joi.string(),
           
        });

        const { error } = schema.validate(req.body);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        const { title, description, status } = req.body;

        // Insert the course into the database
        const insertQuery = 'INSERT INTO courses (title, description) VALUES (?, ?)';
        const values = [title, description, status];

        const [result] = await db.query(insertQuery, values);

        const courseId = result.insertId;

        res.status(201).json({ message: 'Course created successfully', courseId });
    } catch (error) {
        console.error('Error creating course:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};


// #### ASSIGN TEACHER TO COURSE 

const assign_teacher_to_course = async (req, res) => {
    try {
        const { courseId, teacherId } = req.body;

        // Update the course with the specified teacher_id
        const updateQuery = 'UPDATE courses SET teacher_id = ? WHERE course_id = ?';
        const updateValues = [teacherId, courseId];

        await db.query(updateQuery, updateValues);

        res.status(200).json({ message: 'Teacher assigned to course successfully' });
    } catch (error) {
        console.error('Error assigning teacher to course:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};


// ### ENROLL STUDENT IN COURSE 

const enroll_student_in_course= async (req, res) => {
    try {
        // Validate request data using Joi
        const schema = Joi.object({
            studentId: Joi.number().required(),
            courseId: Joi.number().required(),
        });

        const { error } = schema.validate(req.body);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        const { studentId, courseId } = req.body;

        // Check if the enrollment already exists
        const checkEnrollmentQuery = 'SELECT * FROM enrollments WHERE student_id = ? AND course_id = ?';
        const [existingEnrollment] = await db.query(checkEnrollmentQuery, [studentId, courseId]);

        if (existingEnrollment.length > 0) {
            return res.status(409).json({ error: 'Student is already enrolled in this course' });
        }

        // Insert the enrollment into the database
        const insertQuery = 'INSERT INTO enrollments (student_id, course_id) VALUES (?, ?)';
        const values = [studentId, courseId];

        await db.query(insertQuery, values);

        res.status(201).json({ message: 'Student enrolled in the course successfully' });
    } catch (error) {
        console.error('Error enrolling student:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// GET ALL STUDENTS 

const get_all_students = async (req, res) => {
    try {
        // Retrieve all students from the database
        const selectQuery = 'SELECT * FROM students';
        const [students] = await db.query(selectQuery);

        res.status(200).json({ students });
    } catch (error) {
        console.error('Error getting all students:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// GET ALL STUDENTS 

const get_all_teachers = async (req, res) => {
    try {
        // Retrieve all teachers from the database
        const selectQuery = 'SELECT * FROM teachers';
        const [teachers] = await db.query(selectQuery);

        res.status(200).json({ teachers });
    } catch (error) {
        console.error('Error getting all teachers:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};


// ### GET SINGLE TEACHER

const get_single_teacher = async (req, res) => {
    try {
      // Get the teacher_id from the request parameters
      const { teacher_id } = req.params;
  
      // Query the database to fetch the details of the teacher
      const [teacher] = await db.query('SELECT * FROM teachers WHERE teacher_id = ?', [teacher_id]);
  
      if (teacher.length === 0) {
        return res.status(404).json({ error: 'Teacher not found' });
      }
  
      // Return the details of the teacher
      return res.status(200).json({ teacher });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };


// ####### GE SINGLE STUDENT


const get_single_student = async (req, res) => {
    try {
      // Get the student_id from the request parameters
      const { student_id } = req.params;
  
      // Query the database to fetch the details of the student, including billing and delivery addresses
      const [student] = await db.query(`
        SELECT students.*, billing_addresses.*, delivery_addresses.*
        FROM students
        LEFT JOIN billing_addresses ON students.student_id = billing_addresses.student_id
        LEFT JOIN delivery_addresses ON students.student_id = delivery_addresses.student_id
        WHERE students.student_id = ?
      `, [student_id]);
  
      if (student.length === 0) {
        return res.status(404).json({ error: 'Student not found' });
      }
  
      // Return the details of the student, including billing and delivery addresses
      return res.status(200).json({ student });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
  
// ##### GET ALL COURSES

const get_all_courses = async (req, res) => {
    try {
        // Retrieve all courses along with associated videos
        const selectQuery = `
            SELECT courses.course_id, courses.title, courses.description, courses.status, courses.created_at,
                GROUP_CONCAT(videos.video_id) AS video_ids,
                GROUP_CONCAT(videos.video_title) AS video_titles,
                GROUP_CONCAT(videos.video_url) AS video_urls
            FROM courses
            LEFT JOIN videos ON courses.course_id = videos.course_id
            GROUP BY courses.course_id
        `;

        const [courses] = await db.query(selectQuery);

        // Process the results to group courses and their associated videos
        const coursesWithVideos = courses.reduce((acc, item) => {
            acc.push({
                course_id: item.course_id,
                title: item.title,
                description: item.description,
                status: item.status,
                created_at: item.created_at,
                videos: item.video_ids
                    ? item.video_ids.split(',').map((videoId, index) => ({
                        video_id: videoId,
                        video_title: item.video_titles.split(',')[index],
                        video_url: item.video_urls.split(',')[index],
                    }))
                    : [],
            });

            return acc;
        }, []);

        res.status(200).json({ courses: coursesWithVideos });
    } catch (error) {
        console.error('Error getting all courses:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};


//### GET COURSE DETAILS


const get_course_details = async (req, res) => {
    try {
        const { courseId } = req.query;

        // Retrieve course details with associated videos
        const selectQuery = `
            SELECT courses.course_id, courses.title, courses.description, courses.status, courses.created_at,
                GROUP_CONCAT(videos.video_id) AS video_ids,
                GROUP_CONCAT(videos.video_title) AS video_titles,
                GROUP_CONCAT(videos.video_url) AS video_urls
            FROM courses
            LEFT JOIN videos ON courses.course_id = videos.course_id
            WHERE courses.course_id = ?
            GROUP BY courses.course_id
        `;

        const [courseDetails] = await db.query(selectQuery, [courseId]);

        if (courseDetails.length > 0) {
            const course = {
                course_id: courseDetails[0].course_id,
                title: courseDetails[0].title,
                description: courseDetails[0].description,
                status: courseDetails[0].status,
                created_at: courseDetails[0].created_at,
                videos: courseDetails[0].video_ids
                    ? courseDetails[0].video_ids.split(',').map((videoId, index) => ({
                        video_id: videoId,
                        video_title: courseDetails[0].video_titles.split(',')[index],
                        video_url: courseDetails[0].video_urls.split(',')[index],
                    }))
                    : [],
            };

            res.status(200).json({ course: course });
        } else {
            console.error(`Course with ID ${courseId} not found`);
            res.status(404).json({ error: 'Course not found' });
        }
    } catch (error) {
        console.error('Error getting course details:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};





  module.exports = {
    admin_login,
    register_new_student,
    register_new_teacher,
    create_course,
    assign_teacher_to_course,
    enroll_student_in_course,
    get_all_students,
    get_all_teachers,
    get_single_teacher,
    get_single_student,
    get_all_courses,
    get_course_details

    

     
   };