const express = require('express');
const usersService = require('../services/users');
const { authenticate } = require('../middleware/auth');

const usersRouter = express.Router();

usersRouter.get('/', (req, res) => {
  res.json(usersService.listUsers());
});

usersRouter.post('/', async (req, res) => {
  const user = await usersService.createUser(req.body);
  res.status(201).json(user);
});

usersRouter.get('/:id', (req, res) => {
  res.json(usersService.getUser(parseInt(req.params.id)));
});

usersRouter.put('/:id', (req, res) => {
  res.json(usersService.updateUser(parseInt(req.params.id), req.body));
});

usersRouter.delete('/:id', authenticate, (req, res) => {
  res.json(usersService.deleteUser(parseInt(req.params.id)));
});

module.exports = { usersRouter };
