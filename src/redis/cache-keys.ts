export const CACHE_KEYS = {
  ORDER_BY_ID: (id: string) => `order:${id}`,
  ORDER_BY_TRACKING: (trackingNumber: string) => `order:tracking:${trackingNumber}`,
  ORDERS_LIST: (userId: string, filters: string) => `orders:list:${userId}:${filters}`,
  USER_BY_ID: (id: string) => `user:${id}`,
  USER_BY_EMAIL: (email: string) => `user:email:${email}`,
  USERS_LIST: () => `users:list`,
};

export const CACHE_TTL = {
  SHORT: 60,
  MEDIUM: 300,
  LONG: 3600,
  DAY: 86400,
};
