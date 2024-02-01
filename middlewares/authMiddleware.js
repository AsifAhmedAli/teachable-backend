const jwt = require("jsonwebtoken");


function isAdmin(req, res, next) {
  const authorizationHeader = req.header("Authorization");
  const accessToken = authorizationHeader?.replace("Bearer ", "");
  const token_from_cookies = req.cookies.teachablesadminaccesstoken;

  if (!accessToken && !token_from_cookies) {
    return res.status(401).json({ message: "No token, authorization denied" });
  }

  try {
    let decoded;
    
    if (accessToken) {
      decoded = jwt.verify(accessToken, process.env.JWT_SECRET_ADMIN);
    } else {
      // If token is not found in the header, try using the one from cookies
      decoded = jwt.verify(token_from_cookies, process.env.JWT_SECRET_ADMIN);
    }

    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Access token has expired" });
    }
    // Log the error message for debugging purposes
    console.error("Token verification error:", error.message);
    res.status(400).json({ message: "Access token is not valid" });
  }
}

// ### Auth for Teacher
function isTeacher(req, res, next) {
  const authorizationHeader = req.header("Authorization");
  const accessToken = authorizationHeader?.replace("Bearer ", "");
  const token_from_cookies = req.cookies.teachableTeacherAccessToken;

  if (!accessToken && !token_from_cookies) {
    return res.status(401).json({ message: "No token, authorization denied" });
  }

  try {
    let decoded;

    if (accessToken) {
      decoded = jwt.verify(accessToken, process.env.JWT_SECRET_TEACHER);
    } else {
      // If token is not found in the header, try using the one from cookies
      decoded = jwt.verify(token_from_cookies, process.env.JWT_SECRET_TEACHER);
    }

    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Access token has expired" });
    }
    // Log the error message for debugging purposes
    console.error("Token verification error:", error.message);
    res.status(400).json({ message: "Access token is not valid" });
  }
}




function isStudent(req, res, next) {
  const authorizationHeader = req.header("Authorization");
  const accessToken = authorizationHeader?.replace("Bearer ", "");
  const token_from_cookies = req.cookies.student_access_token;

  if (!accessToken && !token_from_cookies) {
    return res.status(401).json({ message: "No token, authorization denied" });
  }

  try {
    let decoded;

    if (accessToken) {
      decoded = jwt.verify(accessToken, process.env.JWT_SECRET_STUDENT);
    } else {
      // If token is not found in the header, try using the one from cookies
      decoded = jwt.verify(token_from_cookies, process.env.JWT_SECRET_STUDENT);
    }

    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Access token has expired" });
    }
    // Log the error message for debugging purposes
    console.error("Token verification error:", error.message);
    res.status(400).json({ message: "Access token is not valid" });
  }
}
  



module.exports = { isAdmin,isTeacher,isStudent};
