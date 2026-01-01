import { Injectable, Inject } from '@nestjs/common';
import Redis from 'ioredis';

interface SessionData {
  userId: string;
  email: string;
  role: string;
  createdAt: number;
  lastActivity: number;
}

@Injectable()
export class SessionService {
  private readonly SESSION_PREFIX = 'session:';
  private readonly USER_SESSIONS_PREFIX = 'user_sessions:';
  private readonly TOKEN_BLACKLIST_PREFIX = 'blacklist:';
  private readonly SESSION_TTL = 86400; // 24 hours

  constructor(@Inject('REDIS_CLIENT') private readonly client: Redis) {}

  async createSession(
    token: string,
    userId: string,
    email: string,
    role: string,
  ): Promise<void> {
    const sessionKey = this.SESSION_PREFIX + token;
    const userSessionsKey = this.USER_SESSIONS_PREFIX + userId;

    const sessionData: SessionData = {
      userId,
      email,
      role,
      createdAt: Date.now(),
      lastActivity: Date.now(),
    };

    const pipeline = this.client.pipeline();
    pipeline.setex(sessionKey, this.SESSION_TTL, JSON.stringify(sessionData));
    pipeline.sadd(userSessionsKey, token);
    pipeline.expire(userSessionsKey, this.SESSION_TTL);
    await pipeline.exec();
  }

  async getSession(token: string): Promise<SessionData | null> {
    const sessionKey = this.SESSION_PREFIX + token;
    const data = await this.client.get(sessionKey);

    if (!data) return null;

    const session = JSON.parse(data) as SessionData;

    // Update last activity
    session.lastActivity = Date.now();
    await this.client.setex(
      sessionKey,
      this.SESSION_TTL,
      JSON.stringify(session),
    );

    return session;
  }

  async validateSession(token: string): Promise<boolean> {
    // Check if token is blacklisted
    const isBlacklisted = await this.isTokenBlacklisted(token);
    if (isBlacklisted) return false;

    // Check if session exists
    const session = await this.getSession(token);
    return session !== null;
  }

  async invalidateSession(token: string): Promise<void> {
    const sessionKey = this.SESSION_PREFIX + token;
    const sessionData = await this.client.get(sessionKey);

    if (sessionData) {
      const session = JSON.parse(sessionData) as SessionData;
      const userSessionsKey = this.USER_SESSIONS_PREFIX + session.userId;

      const pipeline = this.client.pipeline();
      pipeline.del(sessionKey);
      pipeline.srem(userSessionsKey, token);
      await pipeline.exec();
    }
  }

  async invalidateAllUserSessions(userId: string): Promise<void> {
    const userSessionsKey = this.USER_SESSIONS_PREFIX + userId;
    const tokens = await this.client.smembers(userSessionsKey);

    if (tokens.length > 0) {
      const pipeline = this.client.pipeline();
      tokens.forEach((token) => {
        pipeline.del(this.SESSION_PREFIX + token);
      });
      pipeline.del(userSessionsKey);
      await pipeline.exec();
    }
  }

  async blacklistToken(token: string, ttl?: number): Promise<void> {
    const blacklistKey = this.TOKEN_BLACKLIST_PREFIX + token;
    await this.client.setex(blacklistKey, ttl || this.SESSION_TTL, '1');
  }

  async isTokenBlacklisted(token: string): Promise<boolean> {
    const blacklistKey = this.TOKEN_BLACKLIST_PREFIX + token;
    const result = await this.client.exists(blacklistKey);
    return result === 1;
  }

  async getActiveSessionCount(userId: string): Promise<number> {
    const userSessionsKey = this.USER_SESSIONS_PREFIX + userId;
    return this.client.scard(userSessionsKey);
  }

  async getUserActiveSessions(userId: string): Promise<SessionData[]> {
    const userSessionsKey = this.USER_SESSIONS_PREFIX + userId;
    const tokens = await this.client.smembers(userSessionsKey);

    const sessions: SessionData[] = [];
    for (const token of tokens) {
      const session = await this.getSession(token);
      if (session) {
        sessions.push(session);
      }
    }

    return sessions;
  }
}
