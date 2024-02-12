const express = require("express");
const router = express.Router();
const multer = require('multer');
const {isTeacher} = require('../middlewares/authMiddleware.js')
const teachers_controller = require("../controllers/teachers_controller.js");


// Set up Multer for handling file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });



// TEACHER LOGIN

router.post(
    "/login",
    teachers_controller.teacher_login
    
  );
// GET COURSES TAUGHT BY TEACHER

router.get(
    "/get-courses-taught-by-teacher/:teacherId",
    isTeacher,
    teachers_controller.get_courses_taught_by_teacher
    
  );
// GET STUDENTS ENROLLED IN TEACHER COURSE

router.get(
    "/get-students-enrolled-in-teacher-course/:teacherId",
    isTeacher,
    teachers_controller.get_students_enrolled_in_teacher_course
    
  );
// UPLOAD VIDEO TO COURSE

router.post(
    "/upload-video-to-course",
    isTeacher,
    upload.single('video'),
    teachers_controller.upload_video_to_course
    
  );

// SEARCH COURSE

router.get(
    "/search-courses/search/:teacherId",
    isTeacher,
    teachers_controller.search_courses
    
  );


  // GET SINGLR COURSE TAUGHT BY TEACHER

router.get(
    "/get-single-course-taught-by-teacher/:course_id/:teacher_id",
    isTeacher,
    teachers_controller.get_single_course

)
  // GET SINGLE TEACHER

router.get(
    "/get-single-teacher/:teacher_id",
    isTeacher,
    teachers_controller.get_single_teacher

)
  // EDIT TEACHER PROFILE

router.put(
    "/edit-profile",
    isTeacher,
    teachers_controller.edit_profile

)
  // CHNAGE PASSWORD

router.put(
    "/change-password",
    isTeacher,
    teachers_controller.change_password

)
  // TEACHER LOGOUT

router.post(
    "/teacher-logout",
    isTeacher,
    teachers_controller.teacher_logout

)



  module.exports = router