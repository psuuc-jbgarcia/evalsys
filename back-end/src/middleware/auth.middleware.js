const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const Panel = require('../models/Panel');

const protect = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer '))
    return res.status(401).json({ message: 'No token provided' });

  try {
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Look up in correct collection based on role in token
    let user;
    if (decoded.role === 'admin') {
      user = await Admin.findById(decoded.id).select('-password');
    } else {
      user = await Panel.findById(decoded.id).select('-password');
    }

    if (!user || !user.isActive)
      return res.status(401).json({ message: 'Account inactive or not found' });

    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin')
    return res.status(403).json({ message: 'Admin access required' });
  next();
};

const panelOnly = (req, res, next) => {
  if (req.user?.role !== 'panel')
    return res.status(403).json({ message: 'Panel access required' });
  next();
};

module.exports = { protect, adminOnly, panelOnly };
