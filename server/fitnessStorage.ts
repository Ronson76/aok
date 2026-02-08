import { db } from "./db";
import { eq, and, or, desc, inArray, gte, lte, sql } from "drizzle-orm";
import {
  fitnessActivities, follows, activityLikes, activityComments,
  users,
  type FitnessActivity, type InsertFitnessActivity,
  type Follow, type ActivityLike, type ActivityComment,
  type ActivityType, type PrivacyLevel,
} from "@shared/schema";

export const fitnessStorage = {
  async createActivity(data: InsertFitnessActivity): Promise<FitnessActivity> {
    const [activity] = await db.insert(fitnessActivities).values(data).returning();
    return activity;
  },

  async getActivity(id: string): Promise<FitnessActivity | undefined> {
    const [activity] = await db.select().from(fitnessActivities).where(eq(fitnessActivities.id, id));
    return activity;
  },

  async updateActivity(id: string, userId: string, updates: Partial<InsertFitnessActivity>): Promise<FitnessActivity | undefined> {
    const [activity] = await db.update(fitnessActivities)
      .set(updates)
      .where(and(eq(fitnessActivities.id, id), eq(fitnessActivities.userId, userId)))
      .returning();
    return activity;
  },

  async deleteActivity(id: string, userId: string): Promise<boolean> {
    const result = await db.delete(fitnessActivities)
      .where(and(eq(fitnessActivities.id, id), eq(fitnessActivities.userId, userId)));
    return (result.rowCount ?? 0) > 0;
  },

  async getUserActivities(userId: string, filters?: {
    type?: ActivityType;
    dateFrom?: Date;
    dateTo?: Date;
    page?: number;
    limit?: number;
  }): Promise<FitnessActivity[]> {
    const conditions = [
      eq(fitnessActivities.userId, userId),
      eq(fitnessActivities.status, "completed"),
    ];
    if (filters?.type) conditions.push(eq(fitnessActivities.type, filters.type));
    if (filters?.dateFrom) conditions.push(gte(fitnessActivities.startTime, filters.dateFrom));
    if (filters?.dateTo) conditions.push(lte(fitnessActivities.startTime, filters.dateTo));

    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;
    return db.select().from(fitnessActivities)
      .where(and(...conditions))
      .orderBy(desc(fitnessActivities.startTime))
      .limit(limit)
      .offset((page - 1) * limit);
  },

  async getActiveRecording(userId: string): Promise<FitnessActivity | undefined> {
    const [activity] = await db.select().from(fitnessActivities)
      .where(and(
        eq(fitnessActivities.userId, userId),
        or(eq(fitnessActivities.status, "recording"), eq(fitnessActivities.status, "paused"))
      ))
      .orderBy(desc(fitnessActivities.startTime))
      .limit(1);
    return activity;
  },

  async getUserStats(userId: string): Promise<{
    totalActivities: number;
    totalDistanceM: number;
    totalDurationSec: number;
    totalSteps: number;
    totalCalories: number;
    byType: Record<string, { count: number; distanceM: number; durationSec: number; steps: number; calories: number }>;
  }> {
    const activities = await db.select().from(fitnessActivities)
      .where(and(eq(fitnessActivities.userId, userId), eq(fitnessActivities.status, "completed")));

    const stats = {
      totalActivities: activities.length,
      totalDistanceM: 0,
      totalDurationSec: 0,
      totalSteps: 0,
      totalCalories: 0,
      byType: {} as Record<string, { count: number; distanceM: number; durationSec: number; steps: number; calories: number }>,
    };

    for (const a of activities) {
      stats.totalDistanceM += a.distanceM;
      stats.totalDurationSec += a.durationSec;
      stats.totalSteps += a.stepCount || 0;
      stats.totalCalories += a.caloriesEstimate || 0;
      if (!stats.byType[a.type]) stats.byType[a.type] = { count: 0, distanceM: 0, durationSec: 0, steps: 0, calories: 0 };
      stats.byType[a.type].count++;
      stats.byType[a.type].distanceM += a.distanceM;
      stats.byType[a.type].durationSec += a.durationSec;
      stats.byType[a.type].steps += a.stepCount || 0;
      stats.byType[a.type].calories += a.caloriesEstimate || 0;
    }

    return stats;
  },

  async follow(followerId: string, followingId: string): Promise<Follow> {
    const existing = await db.select().from(follows)
      .where(and(eq(follows.followerId, followerId), eq(follows.followingId, followingId)));
    if (existing.length > 0) return existing[0];
    const [follow] = await db.insert(follows).values({ followerId, followingId }).returning();
    return follow;
  },

  async unfollow(followerId: string, followingId: string): Promise<boolean> {
    const result = await db.delete(follows)
      .where(and(eq(follows.followerId, followerId), eq(follows.followingId, followingId)));
    return (result.rowCount ?? 0) > 0;
  },

  async getFollowers(userId: string): Promise<{ id: string; name: string; email: string }[]> {
    const result = await db.select({
      id: users.id, name: users.name, email: users.email,
    }).from(follows)
      .innerJoin(users, eq(follows.followerId, users.id))
      .where(eq(follows.followingId, userId));
    return result;
  },

  async getFollowing(userId: string): Promise<{ id: string; name: string; email: string }[]> {
    const result = await db.select({
      id: users.id, name: users.name, email: users.email,
    }).from(follows)
      .innerJoin(users, eq(follows.followingId, users.id))
      .where(eq(follows.followerId, userId));
    return result;
  },

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const result = await db.select().from(follows)
      .where(and(eq(follows.followerId, followerId), eq(follows.followingId, followingId)));
    return result.length > 0;
  },

  async getFollowingIds(userId: string): Promise<string[]> {
    const result = await db.select({ followingId: follows.followingId }).from(follows)
      .where(eq(follows.followerId, userId));
    return result.map(r => r.followingId);
  },

  async getFeed(userId: string, page: number = 1, limit: number = 20): Promise<FitnessActivity[]> {
    const followingIds = await this.getFollowingIds(userId);
    const allIds = [...followingIds, userId];

    return db.select().from(fitnessActivities)
      .where(and(
        eq(fitnessActivities.status, "completed"),
        or(
          and(inArray(fitnessActivities.userId, allIds), or(
            eq(fitnessActivities.privacyLevel, "public"),
            eq(fitnessActivities.privacyLevel, "friends"),
          )),
          eq(fitnessActivities.privacyLevel, "public"),
        )
      ))
      .orderBy(desc(fitnessActivities.startTime))
      .limit(limit)
      .offset((page - 1) * limit);
  },

  async canViewActivity(activityId: string, viewerId: string): Promise<boolean> {
    const activity = await this.getActivity(activityId);
    if (!activity) return false;
    if (activity.userId === viewerId) return true;
    if (activity.privacyLevel === "public") return true;
    if (activity.privacyLevel === "friends") {
      return this.isFollowing(viewerId, activity.userId);
    }
    return false;
  },

  async likeActivity(activityId: string, userId: string): Promise<ActivityLike> {
    const existing = await db.select().from(activityLikes)
      .where(and(eq(activityLikes.activityId, activityId), eq(activityLikes.userId, userId)));
    if (existing.length > 0) return existing[0];
    const [like] = await db.insert(activityLikes).values({ activityId, userId }).returning();
    return like;
  },

  async unlikeActivity(activityId: string, userId: string): Promise<boolean> {
    const result = await db.delete(activityLikes)
      .where(and(eq(activityLikes.activityId, activityId), eq(activityLikes.userId, userId)));
    return (result.rowCount ?? 0) > 0;
  },

  async getActivityLikes(activityId: string): Promise<{ userId: string; userName: string }[]> {
    return db.select({ userId: activityLikes.userId, userName: users.name })
      .from(activityLikes)
      .innerJoin(users, eq(activityLikes.userId, users.id))
      .where(eq(activityLikes.activityId, activityId));
  },

  async getLikeCount(activityId: string): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(activityLikes)
      .where(eq(activityLikes.activityId, activityId));
    return Number(result[0]?.count ?? 0);
  },

  async hasUserLiked(activityId: string, userId: string): Promise<boolean> {
    const result = await db.select().from(activityLikes)
      .where(and(eq(activityLikes.activityId, activityId), eq(activityLikes.userId, userId)));
    return result.length > 0;
  },

  async addComment(activityId: string, userId: string, content: string): Promise<ActivityComment> {
    const [comment] = await db.insert(activityComments)
      .values({ activityId, userId, content }).returning();
    return comment;
  },

  async getComments(activityId: string): Promise<(ActivityComment & { userName: string })[]> {
    const result = await db.select({
      id: activityComments.id,
      activityId: activityComments.activityId,
      userId: activityComments.userId,
      content: activityComments.content,
      createdAt: activityComments.createdAt,
      userName: users.name,
    }).from(activityComments)
      .innerJoin(users, eq(activityComments.userId, users.id))
      .where(eq(activityComments.activityId, activityId))
      .orderBy(desc(activityComments.createdAt));
    return result;
  },

  async deleteComment(commentId: string, userId: string): Promise<boolean> {
    const result = await db.delete(activityComments)
      .where(and(eq(activityComments.id, commentId), eq(activityComments.userId, userId)));
    return (result.rowCount ?? 0) > 0;
  },

  async searchUsers(query: string, currentUserId: string): Promise<{ id: string; name: string }[]> {
    return db.select({ id: users.id, name: users.name })
      .from(users)
      .where(and(
        sql`lower(${users.name}) LIKE lower(${`%${query}%`})`,
        sql`${users.id} != ${currentUserId}`,
        eq(users.accountType, "individual"),
      ))
      .limit(20);
  },

  async attachActivityToEmergency(activityId: string, emergencyAlertId: string): Promise<void> {
    await db.update(fitnessActivities)
      .set({ emergencyAlertId })
      .where(eq(fitnessActivities.id, activityId));
  },

  async getActivityForEmergency(emergencyAlertId: string): Promise<FitnessActivity | undefined> {
    const [activity] = await db.select().from(fitnessActivities)
      .where(eq(fitnessActivities.emergencyAlertId, emergencyAlertId));
    return activity;
  },
};
