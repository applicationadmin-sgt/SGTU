const express = require('express');
const mongoose = require('mongoose');

console.log('Testing route loading...');

try {
  const quizUnlockRoutes = require('./routes/quizUnlock');
  console.log('✅ quizUnlock route loaded successfully');
} catch (error) {
  console.error('❌ Error loading quizUnlock route:', error.message);
  console.error('Stack:', error.stack);
}