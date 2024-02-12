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
        SELECT courses.course_id, courses.title, courses.description, courses.status, courses.created_at,
               GROUP_CONCAT(videos.video_id) AS video_ids,
               GROUP_CONCAT(videos.video_title) AS video_titles,
               GROUP_CONCAT(videos.video_url) AS video_urls
        FROM courses
        LEFT JOIN videos ON courses.course_id = videos.course_id
        WHERE courses.teacher_id = ?
        GROUP BY courses.course_id
      `;
  
      const [courses] = await db.query(selectQuery, [teacherId]);
  
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
     // Validate request data using Joi
     const schema = Joi.object({
        
        courseId: Joi.number().required(),
        video_title: Joi.string().required(),
    });

    const { error } = schema.validate(req.body);
    if (error) {
        return res.status(400).json({ error: error.details[0].message });
    }
    try {
        const {courseId,video_title} = req.body; 
     

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
        const insertVideoQuery = 'INSERT INTO videos (course_id,video_title, video_url) VALUES (?, ?, ?)';
        const videoValues = [courseId,video_title, cloudinaryResult.secure_url];
        await db.query(insertVideoQuery, videoValues);

        res.status(201).json({ message: 'Video uploaded successfully' });
    } catch (error) {
        console.error('Error uploading video to course:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};


// SEARCH COURSE

const search_courses = async (req, res) => {
    try {
      const { query } = req.query;
      const { teacherId } = req.params;
  
      // Assuming you have a courses table with title, description, teacher_id, status, and created_at fields
      const searchQuery = `
        SELECT course_id, title, description, status, created_at
        FROM courses
        WHERE (title LIKE ? OR description LIKE ?)
        AND teacher_id = ?
      `;
  
      const queryParams = [`%${query}%`, `%${query}%`, teacherId];
  
      const [courses] = await db.query(searchQuery, queryParams);
  
      if (courses.length === 0) {
        res.json({ message: 'No courses found for the given criteria.' });
      } else {
        res.json({ courses: courses });
      }
    } catch (error) {
      console.error('Error searching courses:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  };
  




//   ##### GET SINGLE COURSE 

const get_single_course = async (req, res) => {
    try {
      const { teacher_id, course_id } = req.params;
  
      // Assuming you have a linking table named student_courses
      const query = `
        SELECT courses.course_id, courses.title, courses.description, courses.status,
               videos.video_id, videos.video_title, videos.video_url
        FROM courses
        LEFT JOIN videos ON courses.course_id = videos.course_id
        WHERE courses.teacher_id = ? AND courses.course_id = ?
        GROUP BY courses.course_id, videos.video_id
      `;
  
      const [course] = await db.query(query, [teacher_id, course_id]);
  
      // If the course is not found, return a 404 status
      if (!course.length) {
        return res.status(404).json({ error: 'Course not found for the specified teacher' });
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
  


//  #### GET SINGLE TEACHER

const get_single_teacher = async (req, res) => {
    try {
      // Get the teacher_id from params
      const { teacher_id } = req.params;
  
      // Check if the teacher exists in the database
      const [teacher] = await db.query('SELECT * FROM teachers WHERE teacher_id = ?', [teacher_id]);
  
      if (teacher.length === 0) {
        return res.status(404).json({ error: 'Teacher not found' });
      }
  
      // Return the teacher's profile information
      return res.status(200).json({ teacher: teacher[0] });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
  

//   EDIT PROFILE API

const edit_profile = async (req, res) => {
    try {
      const { teacher_id, name, email } = req.body;
  
      // Check if the teacher exists in the database
      const [teacher] = await db.query('SELECT * FROM teachers WHERE teacher_id = ?', [teacher_id]);
  
      if (teacher.length === 0) {
        return res.status(404).json({ error: 'Teacher not found' });
      }
  
      // Update teacher credentials
      const updateData = {};
      if (name) {
        updateData.name = name;
      }
      if (email) {
        updateData.email = email;
      }
  
      await db.query('UPDATE teachers SET ? WHERE teacher_id = ?', [updateData, teacher_id]);
  
      return res.json({ message: 'Teacher credentials updated successfully' });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
 
  
//   ###3 CHANGE PASSWORD API

// Define a schema for changing teacher password
const changeTeacherPasswordSchema = Joi.object({
  teacher_id: Joi.number().required(),
  new_password: Joi.string().required(),
  confirm_new_password: Joi.string()
    .required()
    .valid(Joi.ref('new_password'))
    .messages({ 'any.only': 'Passwords do not match' }),
});

const change_password = async (req, res) => {
  try {
    const { teacher_id, new_password, confirm_new_password } = req.body;

    // Validate the provided data against the schema
    const { error } = changeTeacherPasswordSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Update the password with the new one (hash the new password)
    const hashedNewPassword = await bcrypt.hash(new_password, 10); // Implement your password hashing logic
    await db.query('UPDATE teachers SET password = ? WHERE teacher_id = ?', [hashedNewPassword, teacher_id]);

    return res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};


// #### TEACHER LOGOUT



const teacher_logout = (req, res) => {
    try {
        // Clear the JWT token from the cookie
        res.clearCookie('teachablesteacheraccesstoken');

        res.status(200).json({ message: 'Logout successful' });
    } catch (error) {
        console.error('Error during teacher logout:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

 
  

  
 
  
  
 
  

  
  
 
  
  
 
  

module.exports = {
   teacher_login,
   get_courses_taught_by_teacher,
   get_students_enrolled_in_teacher_course,
   upload_video_to_course,
   search_courses,
   get_single_course,
   get_single_teacher,
   edit_profile,
   change_password,
   teacher_logout

    
  };