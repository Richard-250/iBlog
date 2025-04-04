import Joi from "joi";

const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).max(30)
        .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[\\W_])[\\S]{8,}$'))
        .message({
          'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character'
        }),
        
  });

 const validateLogin = (req, res, next) => {
    const { error } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }
    next();
  };


  export default validateLogin