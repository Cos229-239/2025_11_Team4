/**
 * Time Ago Utility
 * Converts timestamp to "time ago" format
 */

/**
 * Calculate time difference and return human-readable string
 * @param {string|Date} timestamp - The timestamp to compare
 * @returns {string} Human-readable time difference
 */
export const timeAgo = (timestamp) => {
  const now = new Date();
  const past = new Date(timestamp);
  const diffInSeconds = Math.floor((now - past) / 1000);

  // Handle invalid dates
  if (isNaN(diffInSeconds)) {
    return 'Unknown';
  }

  // Less than a minute
  if (diffInSeconds < 60) {
    return 'Just now';
  }

  // Minutes
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} min${diffInMinutes !== 1 ? 's' : ''} ago`;
  }

  // Hours
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
  }

  // Days
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
};

/**
 * Format timestamp to time string (HH:MM AM/PM)
 * @param {string|Date} timestamp
 * @returns {string} Formatted time
 */
export const formatTime = (timestamp) => {
  const date = new Date(timestamp);

  if (isNaN(date)) {
    return 'Unknown';
  }

  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

/**
 * Format timestamp to date and time string
 * @param {string|Date} timestamp
 * @returns {string} Formatted date and time
 */
export const formatDateTime = (timestamp) => {
  const date = new Date(timestamp);

  if (isNaN(date)) {
    return 'Unknown';
  }

  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

/**
 * Get color class based on how long ago the order was placed
 * Used for urgency indicators
 * @param {string|Date} timestamp
 * @returns {string} Color class
 */
export const getUrgencyColor = (timestamp) => {
  const now = new Date();
  const past = new Date(timestamp);
  const diffInMinutes = Math.floor((now - past) / 1000 / 60);

  if (diffInMinutes < 5) {
    return 'text-green-600'; // Recent
  } else if (diffInMinutes < 15) {
    return 'text-yellow-600'; // Getting old
  } else if (diffInMinutes < 30) {
    return 'text-orange-600'; // Old
  } else {
    return 'text-red-600'; // Very old
  }
};

/**
 * Calculate duration between two timestamps
 * @param {string|Date} startTime
 * @param {string|Date} endTime
 * @returns {string} Duration string
 */
export const calculateDuration = (startTime, endTime = new Date()) => {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const diffInMinutes = Math.floor((end - start) / 1000 / 60);

  if (diffInMinutes < 1) {
    return 'Less than a minute';
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''}`;
  } else {
    const hours = Math.floor(diffInMinutes / 60);
    const minutes = diffInMinutes % 60;
    return `${hours} hour${hours !== 1 ? 's' : ''} ${minutes} min`;
  }
};
