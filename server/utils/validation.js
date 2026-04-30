/**
 * Input Validation Utilities
 * Validates user input before database operations to prevent SQL injection and XSS attacks
 */

export function validateBirthDate(date) {
  if (!date) {
    throw new Error('Birth date is required');
  }

  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error('Invalid date format');
  }

  const parsed = new Date(`${date}T00:00:00Z`);

  // Must be valid date
  if (isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
    throw new Error('Invalid date format');
  }

  // Must be in past
  if (parsed > new Date()) {
    throw new Error('Birth date cannot be in the future');
  }

  // Must be reasonable (not before 1900)
  if (parsed.getFullYear() < 1900) {
    throw new Error('Birth date must be after 1900');
  }

  return parsed.toISOString().split('T')[0];
}

export function validateName(name) {
  if (!name || typeof name !== 'string') {
    throw new Error('Name is required');
  }

  // Remove suspicious HTML/script characters first, then check length
  const sanitized = name.replace(/[<>{}[\]]/g, '').trim();

  if (sanitized.length === 0) {
    throw new Error('Name contains only invalid characters');
  }

  if (sanitized.length > 100) {
    throw new Error('Name too long (max 100 characters)');
  }

  return sanitized;
}

export function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    throw new Error('Email is required');
  }

  // Trim and lowercase first
  const cleaned = email.toLowerCase().trim();

  if (cleaned.length > 254) {
    throw new Error('Email too long');
  }

  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!regex.test(cleaned)) {
    throw new Error('Invalid email format');
  }

  return cleaned;
}

export function validateZodiacSign(sign) {
  const validSigns = [
    'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
    'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'
  ];

  if (!sign || typeof sign !== 'string') {
    throw new Error('Zodiac sign is required');
  }

  const normalized = sign.toLowerCase().trim();

  if (!validSigns.includes(normalized)) {
    throw new Error(`Invalid zodiac sign. Valid signs: ${validSigns.join(', ')}`);
  }

  return normalized;
}

export function validateBirthTime(time) {
  if (!time || typeof time !== 'string') {
    throw new Error('Birth time required');
  }

  const regex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;

  if (!regex.test(time)) {
    throw new Error('Invalid time format (use HH:MM)');
  }

  return time;
}

export function validateCity(city) {
  if (!city || typeof city !== 'string') {
    throw new Error('City is required');
  }

  const sanitized = city.replace(/[<>{}[\]]/g, '').trim();

  if (sanitized.length === 0) {
    throw new Error('City contains only invalid characters');
  }

  if (sanitized.length > 100) {
    throw new Error('City name too long');
  }

  return sanitized;
}

export function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    throw new Error('Password is required');
  }

  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }

  if (password.length > 128) {
    throw new Error('Password too long (max 128 characters)');
  }

  // Check for complexity
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  const complexityScore = [hasUppercase, hasLowercase, hasNumber, hasSpecialChar]
    .filter(Boolean).length;

  if (complexityScore < 3 || !hasUppercase) {
    throw new Error(
      'Password must contain at least 3 of: lowercase, numbers, special characters, AND at least one uppercase letter'
    );
  }

  return password;
}

export function validateString(value, fieldName, minLength = 1, maxLength = 1000) {
  if (value === undefined || value === null || typeof value !== 'string') {
    throw new Error(`${fieldName} is required`);
  }

  // Trim first, then check length against the trimmed value
  const trimmed = value.trim();

  if (trimmed.length < minLength) {
    throw new Error(`${fieldName} must be at least ${minLength} characters`);
  }

  if (trimmed.length > maxLength) {
    throw new Error(`${fieldName} must be at most ${maxLength} characters`);
  }

  return trimmed;
}

export function validateNumber(value, fieldName, min = null, max = null) {
  const num = Number(value);

  if (isNaN(num)) {
    throw new Error(`${fieldName} must be a valid number`);
  }

  if (min !== null && num < min) {
    throw new Error(`${fieldName} must be at least ${min}`);
  }

  if (max !== null && num > max) {
    throw new Error(`${fieldName} must be at most ${max}`);
  }

  return num;
}

export function validatePeriod(period) {
  const validPeriods = ['daily', 'weekly', 'monthly'];

  if (!period || typeof period !== 'string') {
    throw new Error('Period is required');
  }

  const normalized = period.toLowerCase().trim();

  if (!validPeriods.includes(normalized)) {
    throw new Error(`Invalid period. Valid periods: ${validPeriods.join(', ')}`);
  }

  return normalized;
}

export function validateUserId(userId) {
  if (!userId || typeof userId !== 'string') {
    throw new Error('Invalid user ID');
  }

  // UUID format: 8-4-4-4-12 hex characters
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
    throw new Error('Invalid user ID format');
  }

  return userId;
}
