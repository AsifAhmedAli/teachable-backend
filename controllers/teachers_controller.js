const bcrypt = require('bcrypt');
const db = require('../DB/db.js');
const Joi = require('joi');
const { sendEmail } = require('../utils/emailService.js');
const cloudinary = require('cloudinary').v2;
const fs = require('fs').promises;
const path = require('path');
const jwt = require('jsonwebtoken');




// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });

// ### TEACHER LOGIIN

  
const teacher_login = async (req, res) => {
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

        // Check if the teacher with the provided email exists
        const checkTeacherQuery = 'SELECT * FROM teachers WHERE email = ?';
        const [teacher] = await db.query(checkTeacherQuery, [email]);

        if (teacher.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Verify the password
        const isPasswordValid = await bcrypt.compare(password, teacher[0].password);

        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Create a JWT token
        const token = jwt.sign({ teacherId: teacher[0].teacher_id, email: teacher[0].email }, process.env.JWT_SECRET_TEACHER, {
            expiresIn: '2d', // Token will expire in 2 days
        });

        // Set the JWT as a cookie
        res.cookie('teachablesteacheraccesstoken', token, { maxAge: 2 * 24 * 60 * 60 * 1000, httpOnly: true });

        res.status(200).json({ message: 'Login successful', token:token });
    } catch (error) {
        console.error('Error during teacher login:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// ########## GET COURSES TAUGHT BY A TEACHER
const get_courses_taught_by_teacher = async (req, res) => {
    try {
        const { teacherId } = req.params;

        // Retrieve courses taught by the teacher along with associated videos
        const selectQuery = `
            SELECT courses.*, GROUP_CONCAT(videos.video_url) AS video_urls
            FROM courses
            LEFT JOIN videos ON courses.course_id = videos.course_id
            WHERE courses.teacher_id = ?
            GROUP BY courses.course_id
        `;

        const [courses] = await db.query(selectQuery, [teacherId]);

        // Parse the video_urls string into an array
        courses.forEach(course => {
            if (course.video_urls) {
                course.video_urls = course.video_urls.split(',');
            }
        });

        res.status(200).json({ courses });
    } catch (error) {
        console.error('Error getting courses taught by teacher:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};


  

const get_students_enrolled_in_teacher_course = async (req, res) => {
    try {
        const{teacherId} = req.params; 

        // Retrieve students enrolled in courses taught by the teacher from the database
        const selectQuery = `
            SELECT students.*
            FROM students
            JOIN enrollments ON students.student_id = enrollments.student_id
            JOIN courses ON enrollments.course_id = courses.course_id
            WHERE courses.teacher_id = ?
        `;
        const [students] = await db.query(selectQuery, [teacherId]);

        res.status(200).json({ students });
    } catch (error) {
        console.error('Error getting students enrolled in teacher\'s courses:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};



// ### UPLOAD VIDEO TO COURSE 

const upload_video_to_course = async (req, res) => {
    try {
        const {courseId} = req.body; 
     

        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Save the file temporarily on the server
        const tempFilePath = path.join(__dirname, '..', 'temp', 'uploaded_video.mp4');
        await fs.writeFile(tempFilePath, req.file.buffer);

        // Upload video to Cloudinary
        const cloudinaryResult = await cloudinary.uploader.upload(tempFilePath, {
            resource_type: 'video',
            folder: `teachable_course_videos/course_${courseId}`,
        });

        // Remove the temporary file
        await fs.unlink(tempFilePath);

        // Insert video details into the videos table
        const insertVideoQuery = 'INSERT INTO videos (course_id, video_url) VALUES (?, ?)';
        const videoValues = [courseId, cloudinaryResult.secure_url];
        await db.query(insertVideoQuery, videoValues);

        res.status(201).json({ message: 'Video uploaded successfully' });
    } catch (error) {
        console.error('Error uploading video to course:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};


module.exports = {
   teacher_login,
   get_courses_taught_by_teacher,
   get_students_enrolled_in_teacher_course,
   upload_video_to_course

    
  };