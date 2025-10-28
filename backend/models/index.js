/**
 * Models Index
 * Central export file for all Mongoose models
 *
 * Usage:
 * const { User, Document, Country, EmailLog } = require('./models');
 *
 * Or individually:
 * const User = require('./models/User');
 */

const User = require('./User');
const Document = require('./Document');
const Country = require('./Country');
const EmailLog = require('./EmailLog');

module.exports = {
  User,
  Document,
  Country,
  EmailLog,
};
