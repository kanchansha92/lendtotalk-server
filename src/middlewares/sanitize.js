// module.exports = (req, res, next) => {
//   const sanitize = (obj) => {
//     if (!obj || typeof obj !== 'object') return;
//     for (const key in obj) {
//       if (key.includes('$') || key.includes('.')) {
//         delete obj[key];
//       } else {
//         sanitize(obj[key]);
//       }
//     }
//   };

//   sanitize(req.body);
//   sanitize(req.params);
//   // ❗ DO NOT TOUCH req.query

//   next();
// };


// // src/middlewares/sanitize.js
// module.exports = (req, res, next) => {
//   const sanitize = (obj) => {
//     if (!obj || typeof obj !== 'object') return;
//     for (const key in obj) {
//       if (key.includes('$') || key.includes('.')) {
//         delete obj[key];
//       } else {
//         sanitize(obj[key]);
//       }
//     }
//   };

//   sanitize(req.body);
//   sanitize(req.params);
//   // ❌ DO NOT TOUCH req.query

//   next();
// };



// src/middlewares/sanitize.js
module.exports = (req, res, next) => {
  const sanitizeObj = (obj) => {
    if (!obj || typeof obj !== 'object') return;
    for (const key in obj) {
      if (key.includes('$') || key.includes('.')) {
        delete obj[key];
      } else {
        sanitizeObj(obj[key]);
      }
    }
  };

  sanitizeObj(req.body);
  sanitizeObj(req.params);
  next();
};
