const express = require("express");
const router = express.Router();
const {isStudent} = require('../middlewares/authMiddleware.js')
const students_controller = require("../controllers/students_controller.js");





// TEACHER LOGIN

router.post(
    "/login",
    students_controller.student_login
    
  );
// ADD CREDIT CARD

router.post(
    "/add-credit-card",
    isStudent,
    students_controller.add_credit_card
    
  );
// ADD BILLING ADDRESS

router.post(
    "/add-billing-address",
    isStudent,
    students_controller.add_billing_address
    
  );
// ADD DELIVERY ADDRESS

router.post(
    "/add-delivery-address",
    isStudent,
    students_controller.add_delivery_address
    
  );
// EDIT PROFILE

router.put(
    "/edit-profile",
    isStudent,
    students_controller.edit_profile
    
  );
// CHANGE PASSWORD

router.put(
    "/change-password",
    isStudent,
    students_controller.change_password
    
  );
// EDIT CREDIT CARD

router.put(
    "/edit-credit-card",
    isStudent,
    students_controller.edit_credit_card
    
  );
// EDIT BILLING ADDRESS

router.put(
    "/edit-billing-address",
    isStudent,
    students_controller.edit_billing_address
    
  );
// EDIT DELIVERY ADDRESS

router.put(
    "/edit-delivery-address",
    isStudent,
    students_controller.edit_delivery_address
    
  );

// GET SINGLE STUDENT

router.get(
    "/get-single-student",
    isStudent,
    students_controller.get_single_student
    
  );
// GET CREDIT CARD DETAILS

router.get(
    "/get-credit-card-details",
    isStudent,
    students_controller.get_credit_card_details
    
  );
// GET CREDIT CARD DETAILS

router.get(
    "/get-billing-address",
    isStudent,
    students_controller.get_billing_address
    
  );
// GET DELIVERY ADDRESS

router.get(
    "/get-delivery-address",
    isStudent,
    students_controller.get_delivery_address
    
  );
// STUDENT LOGOUT

router.post(
    "/student-logout",
    isStudent,
    students_controller.student_logout
    
  );





  module.exports = router