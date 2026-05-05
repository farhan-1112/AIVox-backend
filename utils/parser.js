// Utility functions for parsing data

export const parseDate = (dateStr) => {
  // Simple parser or formatter
  return new Date(dateStr).toLocaleDateString();
};

export const parseTime = (timeStr) => {
  return timeStr;
};
