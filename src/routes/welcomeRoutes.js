import express from 'express';

const router = express.Router();
router.get('/welcome', (req, res) => {
  res.json(
    'Hello, There! Welcome, this is iBlog Team  project.'
  );
});

export default router;