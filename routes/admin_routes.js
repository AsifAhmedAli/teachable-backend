const express = require("express");
const router = express.Router();
const multer = require('multer');

const {isAdmin} = require('../middlewares/authMiddleware.js')
const admin_controller = require("../controllers/admin_controller.js");



// Set up Multer for handling file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });



// ADMIN LOGIN

router.post(
  "/login",
  admin_controller.admin_login
  
);

// REGISTER NEW STUDENT

router.post(
    "/register-new-student",
    isAdmin,
    admin_controller.register_new_student
    
  );
// REGISTER NEW TEACHER

router.post(
    "/register-new-teacher",
    isAdmin,
    admin_controller.register_new_teacher
    
  );
// CREATE NEW COURSE

router.post(
    "/create-course",
    isAdmin,
    admin_controller.create_course
    
  );

router.post(
    "/assign-teacher-to-course",
    isAdmin,
    admin_controller.assign_teacher_to_course
    
  );
router.post(
    "/enroll-student-in-course",
    isAdmin,
    admin_controller.enroll_student_in_course
    
  );

router.get(
    "/get-all-students",
    isAdmin,
    admin_controller.get_all_students
    
  );
  router.get(
    "/get-all-teachers",
    isAdmin,
    admin_controller.get_all_teachers
    
  );
  router.get(
    "/get-single-teacher/:teacher_id",
    isAdmin,
    admin_controller.get_single_teacher
    
  );
  router.get(
    "/get-single-student/:student_id",
    isAdmin,
    admin_controller.get_single_student
    
  );
  router.get(
    "/get-all-courses",
    isAdmin,
    admin_controller.get_all_courses
    
  );
  router.get(
    "/get-course-details",
    isAdmin,
    admin_controller.get_course_details
    
  );


            
  


module.exports = router