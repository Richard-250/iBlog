import Joi from "joi";

const signUpSchema = Joi.object({
    firstName: Joi.string().trim().min(2).max(50).required(),
    lastName: Joi.string().trim().min(2).max(50).required(),
    email:  Joi.string().email().lowercase().trim().required(),
    password: Joi.string().min(8).max(30)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[\\W_])[\\S]{8,}$'))
    .message({
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character'
    }),
    phoneNumber: Joi.string().pattern(/^\+?[0-9]{10}$/).message({
        'string.pattern.base': 'Phone number must be between 10 digits'
      }),   
});

const validateSignup = (req, res, next) => {
    const { error } = signUpSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }
    next();
  };

  export default validateSignup